# transfer

Envoi de fichiers en ligne de commande, à la façon de transfer.sh, vers
[transfer.it](https://transfer.it) (le service de transfert de MEGA). Un Cloudflare Worker sur
**transfer.syspros.ch** reçoit le fichier, le chiffre et l'envoie à MEGA, puis renvoie le lien.
Sans compte, quelle que soit la taille ; les liens restent valables 90 jours.

```
curl -T rapport.pdf ──► transfer.syspros.ch ──► MEGA (transfer.it)
                         Cloudflare Worker       session anonyme jetable,
                         chiffre en flux         fichier chiffré par WebSocket
       ◄── https://transfer.syspros.ch/t/AbCdEfGhIjKl                (page de téléchargement)
           https://transfer.syspros.ch/t/AbCdEfGhIjKl/rapport.pdf    (lien direct, curl -O)
           supprimer : curl -X DELETE https://transfer.syspros.ch/t/AbCdEfGhIjKl/<jeton>
```

Le lien ouvert dans un navigateur montre une page aux couleurs de SysPros : nom et taille du
fichier, bouton « Télécharger », commandes curl et wget, et un encadré « Qui est SysPros ? ».
Les réponses texte (envois, aide `curl transfer.syspros.ch`) finissent par une ligne SysPros.

## Utilisation

```bash
curl -T rapport.pdf transfer.syspros.ch                    # jusqu'à 100 Mo
curl -T rapport.pdf transfer.syspros.ch/1/                 # un seul téléchargement (/5/ pour 5)
curl -sL transfer.syspros.ch/sh | sh -s gros.iso           # toute taille, ou un dossier
curl -sL transfer.syspros.ch/1/sh | sh -s gros.iso         # idem, un seul téléchargement
tar cz ./photos | curl -T - transfer.syspros.ch/photos.tar.gz

curl -O https://transfer.syspros.ch/t/AbCdEfGhIjKl/rapport.pdf      # télécharger
wget -c https://transfer.syspros.ch/t/AbCdEfGhIjKl/rapport.pdf      # avec reprise
curl -X DELETE https://transfer.syspros.ch/t/AbCdEfGhIjKl/<jeton>   # supprimer
```

```powershell
irm transfer.syspros.ch/ps | iex; transfer gros.iso       # Windows, toute taille (dossiers zippés)
```

Pour garder la commande `transfer` : `curl -sL transfer.syspros.ch/sh > ~/.transfer.sh && echo '. ~/.transfer.sh' >> ~/.bashrc`
(PowerShell : `irm transfer.syspros.ch/ps | Out-File -Append $PROFILE`).

La page **https://transfer.syspros.ch** permet aussi d'envoyer depuis le navigateur (glisser-déposer,
option « un seul téléchargement », bouton de suppression) et rappelle ces commandes.

## Comment ça marche

- **Envoi** : pour chaque fichier, le Worker fait ce que la page de transfer.it fait dans le
  navigateur. Il ouvre une session MEGA anonyme et jetable (`up`, `us`), crée le transfert (`xn`),
  chiffre le flux morceau par morceau (AES-128-CTR et CBC-MAC de MEGA), l'envoie au serveur
  d'upload de MEGA par WebSocket, puis rattache le fichier et ferme le transfert (`xp`, `xc`).
- **Au-delà de 100 Mo** : Cloudflare refuse les requêtes plus grosses (HTTP 413) avant même le
  Worker. Les scripts `/sh` et `/ps` et la page web découpent le fichier en parties de 90 Mo
  (`PART_MB`) et en envoient **4 en même temps** (`PARALLEL` dans `wrangler.jsonc` ; pour un
  envoi, `TRANSFER_PARALLEL=8 sh -s fichier` avec le script sh). Le Worker ne garde rien entre
  les requêtes.

  Cloudflare reçoit une partie aussi vite que la connexion le permet, puis le Worker la transmet à
  MEGA à la vitesse de MEGA. Vu du poste, l'envoi se fait donc par à-coups : les parties partent
  vite, puis le poste attend. C'est MEGA qui fixe le débit d'un transfert. Mesuré le 16.11.2026
  (1,76 Go) : 308 s avec 4 parties à la fois, 461 s avec 12 ; en ajouter n'accélère pas.
- **Progression** : les trois clients affichent chaque seconde le pourcentage, la quantité
  arrivée chez MEGA, la vitesse (Mo/s et Mbit/s, lissée), le temps restant et les parties
  terminées, puis la moyenne à la fin. Avec `X-Progress: 1`, le Worker répond tout de suite et
  écrit chaque seconde `ack <octets>`, les octets de la partie que MEGA a confirmés, avant la
  ligne `part …` (ou `erreur …`). Sans cet en-tête, il ne répond qu'à la fin.

  ```
  1. PUT /[n/]<nom>  X-Total-Size: <octets>                       (corps vide)
     → "init <état> <taille de partie>"
  2. PUT /[n/]<nom>  X-Total-Size  X-State: <état>  X-Offset: <début>  [X-Progress: 1]
     (la partie, dans n'importe quel ordre)
     → ["ack <octets>" …] "part <début> <fin> <MAC des morceaux> [<jeton de fin>]"
  3. PUT /[n/]<nom>  X-Total-Size  X-State  X-Finalize: 1         (corps : les réponses « part »)
     → <liens>
  ```

  Les parties commencent à `0`, puis à `i × taille + 512 Kio` : ce sont des limites de morceaux
  MEGA, chaque partie se chiffre donc seule. Le Worker vérifie à la fin que les parties couvrent
  tout le fichier, assemble le MAC dans l'ordre et ferme le transfert. MEGA renvoie le jeton de
  fin à la connexion qui complète le fichier ; s'il s'est perdu, le client renvoie la dernière
  partie. L'état ne peut pointer que vers les serveurs d'upload de MEGA
  (`*.userstorage.mega.co.nz`). `PART_MB` doit rester ≤ 94 (la première partie fait 512 Kio de plus
  et doit passer sous les 100 Mo de Cloudflare).
- **Page de téléchargement** (`/t/<id>` dans un navigateur ou un aperçu de lien) : le Worker
  pose le nom du fichier comme titre du transfert à la fermeture (`xm` avec `t`), puis la page
  le lit avec `xi`, qui renvoie titre, taille et nombre de fichiers sans ouvrir le transfert :
  afficher la page n'use pas de téléchargement (mesuré le 16.11.2026 : trois `xi` sur un lien
  `/1/`, le téléchargement passe ensuite). Lien épuisé, supprimé ou expiré : page « Ce lien
  n'est plus disponible » (HTTP 410 ou 404). Transferts envoyés avant, sans titre : la page lit
  le nom avec `f`, ce qui compte une ouverture (la marge de `mc = n + 1` sur un lien `/n/`).
  Plusieurs fichiers : le bouton passe par `/t/<id>?dl`, qui en donne la liste.
- **Téléchargement** (`/t/<id>/<nom>`) : MEGA déchiffre côté serveur quand on demande l'URL avec
  `pt: 1` (comme la page de transfer.it) ; le Worker relaie simplement les octets, avec les
  requêtes `Range` (reprise avec `wget -c` ou `curl -C -`), sans passer par le cache de
  Cloudflare (`cache: "no-store"`). L'en-tête `Server-Timing` donne les temps cumulés jusqu'à
  `f`, `g` et la réponse du serveur de MEGA :
  `curl -s -D - -o /dev/null -r 0-0 https://transfer.syspros.ch/t/<id>/<nom>`. Mesuré le
  16.11.2026 : 1,3 à 2 s avant le premier octet, dont 0,4 à 1,8 s d'attente du serveur de MEGA ;
  le même jour, avant cette mesure, quatre essais avaient attendu de 11 à 55 s, sans cause
  établie (depuis un poste, directement chez MEGA : 0,1 s).
- **Suppression** : le jeton est la session MEGA jetable de l'envoi. `DELETE /t/<id>/<jeton>`
  supprime le transfert (`xd`) ; sans ce jeton, personne ne peut le supprimer ni le modifier.
- **Nombre de téléchargements** (`/n/`) : le réglage `mc` de MEGA compte les ouvertures du
  transfert (`f`), pas les URL de téléchargement, et bloque le transfert dès la `mc`-ième
  ouverture. Un téléchargement fait une ouverture, donc le Worker pose `mc = n + 1`. Les requêtes
  HEAD, les aperçus de liens (Slack, WhatsApp, Teams…) et la page `/t/<id>` n'ouvrent pas le
  transfert. Ouvrir la page transfer.it du transfert compte comme un téléchargement, une
  reprise avec `wget -c` aussi.
- **Durée** : MEGA fixe l'expiration à 90 jours après l'envoi (mesuré : `e - ts = 7 776 000 s`).
- **Intégrité** : le morceau vide de fin (fichier qui se termine pile sur une limite de morceau)
  n'entre pas dans le MAC, comme dans l'uploader de MEGA ; sinon la page de transfer.it signale
  le fichier comme corrompu. `test/verify-mac.mjs` vérifie le MAC comme le fait transfer.it.

Référence du protocole : [transferit-py](https://github.com/viperadnan-git/transferit-py).

## Mise en place

1. **Dépendances** : `npm install`.
2. **Compte** : le Worker doit tourner sur le compte Cloudflare qui porte la zone `syspros.ch`,
   avec **Workers Paid**. Chaque envoi coûte environ 10 ms de CPU par Mio (~1 s par partie de
   90 Mio) ; le plan Free (10 ms par requête) coupe les gros envois avec l'erreur 1102.
   `wrangler.jsonc` demande jusqu'à 5 min de CPU (`limits.cpu_ms`), ce que seul Paid accepte.
   Si votre connexion wrangler voit plusieurs comptes, choisissez-le dans un fichier `.env`
   (ignoré par git) : `CLOUDFLARE_ACCOUNT_ID=<id du compte>`.
3. **Domaine** : `transfer.syspros.ch` est déclaré en domaine personnalisé dans `wrangler.jsonc` ;
   le DNS se crée au déploiement. Pas d'URL `*.workers.dev` (`workers_dev: false`).
4. **Déployer** : `npm run deploy`.
5. **Déploiement automatique** (Workers Builds, en place depuis le 16.11.2026) : chaque push sur
   `main` redéploie le Worker. Réglages : Workers & Pages → `transfer` → Settings → Builds,
   dépôt `SysPros-Sarl/transfer`, branche `main`, build `npm ci`, déploiement
   `npx wrangler deploy`, chemin `/`.
   Si le bouton GitHub de Cloudflare ouvre la page d'installation de l'application GitHub alors
   qu'elle est déjà installée sur SysPros-Sarl : Configure, cocher « Only select repositories »
   puis de nouveau « All repositories » pour activer Save, et Save. Rien ne change côté GitHub,
   mais GitHub renvoie alors vers Cloudflare, qui affiche le choix du dépôt.

## Développement local

```bash
# --local-upstream : sans lui, le Worker local se croit sur transfer.syspros.ch et ses liens
# pointent vers la production. PART_MB:6 : petites parties pour tester le découpage.
npx wrangler dev --port 8787 --local-upstream 127.0.0.1:8787 --var PART_MB:6
curl -T fichier http://127.0.0.1:8787
node test/verify-mac.mjs fichier <lien>   # vérifie le MAC comme le téléchargeur de transfer.it
```

## Routes

| Route | Méthode | Rôle |
|---|---|---|
| `/`, `/<n>/` | GET | Page d'accueil (navigateur) ou aide texte (curl) |
| `/<nom>`, `/<n>/<nom>` | PUT, POST | Envoi, en une fois ou par parties ; `n` = nombre de téléchargements |
| `/sh`, `/<n>/sh` | GET | Script shell (bash, zsh, sh) |
| `/ps`, `/<n>/ps` | GET | Script PowerShell |
| `/t/<id>` | GET | Navigateur ou aperçu de lien : page de téléchargement SysPros ; curl (ou `?dl`) : le fichier, ou la liste s'il y en a plusieurs |
| `/t/<id>/<nom>` | GET, HEAD | Téléchargement (avec `Range`) |
| `/t/<id>/<jeton>` | DELETE | Suppression du transfert |
| `/favicon.svg` | GET | Icône SysPros |

## Limites

- **Confidentialité** : comme transfer.sh, toute personne qui a le lien peut télécharger.
  transfer.it garde la clé de déchiffrement chez MEGA ; ce n'est pas du chiffrement de bout en bout.
- **API non officielle** : le Worker utilise l'API privée de transfer.it. Si MEGA la change, il
  faudra l'adapter.
- **Vitesse** : MEGA fixe le débit d'un transfert. Il a varié de 4 à 10 Mo/s dans les mesures
  du 16.11.2026, quel que soit le nombre de parties en parallèle. `curl -T` seul (jusqu'à 100 Mo)
  reste en une partie.

## Pistes

- Envoi direct navigateur → MEGA depuis la page web (chiffrement dans le navigateur, sans passer
  par le Worker).
- Choix de la durée d'expiration (`xm` avec `e`).
