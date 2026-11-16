# transfer

Envoi de fichiers en ligne de commande, à la façon de transfer.sh, vers
[transfer.it](https://transfer.it) (le service de transfert de MEGA). Un Cloudflare Worker sur
**transfer.syspros.ch** reçoit le fichier, le chiffre et l'envoie à MEGA, puis renvoie le lien.
Sans compte, quelle que soit la taille ; les liens restent valables 90 jours.

```
curl -T rapport.pdf ──► transfer.syspros.ch ──► MEGA (transfer.it)
                         Cloudflare Worker       session anonyme jetable,
                         chiffre en flux         fichier chiffré par WebSocket
       ◄── https://transfer.it/t/AbCdEfGhIjKl
           https://transfer.syspros.ch/t/AbCdEfGhIjKl/rapport.pdf
           supprimer : curl -X DELETE https://transfer.syspros.ch/t/AbCdEfGhIjKl/<jeton>
```

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
  (`PART_MB`). Le Worker ne garde rien entre deux parties : chacune lui renvoie un jeton d'état.

  ```
  PUT /[n/]<nom>   X-Total-Size: <octets>   X-Offset: <position>   [X-State: <jeton>]
  → 202 "next <position> <jeton>"   envoyer la partie suivante depuis <position>
  → 200 <liens>                     terminé
  ```

  Une partie fait au moins 1 Mio. Le Worker n'envoie que des morceaux MEGA complets ; la réponse
  indique où la partie suivante doit commencer. Le jeton ne peut pointer que vers les serveurs
  d'upload de MEGA (`*.userstorage.mega.co.nz`).
- **Téléchargement** (`/t/<id>/<nom>`) : MEGA déchiffre côté serveur quand on demande l'URL avec
  `pt: 1` (comme la page de transfer.it) ; le Worker relaie simplement les octets, avec les
  requêtes `Range` (reprise avec `wget -c` ou `curl -C -`).
- **Suppression** : le jeton est la session MEGA jetable de l'envoi. `DELETE /t/<id>/<jeton>`
  supprime le transfert (`xd`) ; sans ce jeton, personne ne peut le supprimer ni le modifier.
- **Nombre de téléchargements** (`/n/`) : le réglage `mc` de MEGA compte les ouvertures du
  transfert (`f`), pas les URL de téléchargement, et bloque le transfert dès la `mc`-ième
  ouverture. Un téléchargement fait une ouverture, donc le Worker pose `mc = n + 1`. Les requêtes
  HEAD, les aperçus de liens (Slack, WhatsApp, Teams…) et la redirection de `/t/<id>` vers
  transfer.it n'ouvrent pas le transfert. Ouvrir la page transfer.it compte comme un
  téléchargement, une reprise avec `wget -c` aussi.
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
| `/t/<id>` | GET | Navigateur : redirection vers transfer.it ; curl : le fichier, ou la liste s'il y en a plusieurs |
| `/t/<id>/<nom>` | GET, HEAD | Téléchargement (avec `Range`) |
| `/t/<id>/<jeton>` | DELETE | Suppression du transfert |
| `/favicon.svg` | GET | Icône SysPros |

## Limites

- **Confidentialité** : comme transfer.sh, toute personne qui a le lien peut télécharger.
  transfer.it garde la clé de déchiffrement chez MEGA ; ce n'est pas du chiffrement de bout en bout.
- **API non officielle** : le Worker utilise l'API privée de transfer.it. Si MEGA la change, il
  faudra l'adapter.
- **Vitesse** : une partie de 90 Mo met de 2,5 à 20 s à arriver chez MEGA selon son serveur
  d'upload (une seule connexion WebSocket par partie).

## Pistes

- Plusieurs connexions WebSocket par partie (la page de MEGA en ouvre 8) pour accélérer les envois.
- Envoi direct navigateur → MEGA depuis la page web (chiffrement dans le navigateur, sans passer
  par le Worker).
- Choix de la durée d'expiration (`xm` avec `e`).
