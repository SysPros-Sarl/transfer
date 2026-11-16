// Page d'accueil (HTML et texte pour curl) et scripts d'aide. Charte SysPros reprise de
// hudu-qr (src/views/layout.tsx), elle-même alignée sur syspros.ch (Website/src/styles/global.css).

import { LOGO_COLOR, LOGO_WHITE } from "./brand.js";

const SITE_URL = "https://syspros.ch";
const SUPPORT_EMAIL = "support@syspros.ch";
const SUPPORT_PHONE = "021 501 89 00";
const FONTS_CSS = "https://fonts.googleapis.com/css2?family=Public+Sans:wght@400..800&family=Martian+Mono:wght@400..700&display=swap";
const CHROME = { light: "#e4ecf8", dark: "#09101a" };

// Textes de présentation, repris de syspros.ch (Website/src/i18n/fr.ts : meta.home, hero).
const TAGLINE = "Infogérance, cybersécurité et cloud suisse pour les PME de Suisse romande.";
const PROMO_TITLE = "Votre IT stable, documentée, sécurisée.";
const PROMO_TEXT = "SysPros gère l'informatique des PME de Suisse romande : réseau, postes, serveurs, cloud, cybersécurité et sauvegardes, avec une documentation à jour et des règles écrites.";
// Ligne ajoutée aux réponses texte (envois, aide curl) : un peu de promotion, sans gêner
// qui lit seulement les premières lignes.
export const PROMO_LINE = `-- SysPros · infogérance, cybersécurité et cloud pour les PME de Suisse romande · ${SITE_URL}`;

const mb = (bytes) => Math.round(bytes / 1048576);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const ID = "AbCdEfGhIjKl";
const examples = (b, part) => ({
  main: [
    ["Envoyer (jusqu'à 100 Mo)", `curl -T rapport.pdf ${b}`],
    ["Vous recevez", `${b}/t/${ID}\n${b}/t/${ID}/rapport.pdf\nsupprimer : curl -X DELETE ${b}/t/${ID}/<jeton>`],
    ["Un seul téléchargement (/5/ pour 5)", `curl -T rapport.pdf ${b}/1/`],
    ["Toute taille, ou un dossier", `curl -sL ${b}/sh | sh -s gros.iso\ncurl -sL ${b}/1/sh | sh -s gros.iso    # 1 téléchargement`],
  ],
  more: [
    ["Télécharger (reprise possible)", `curl -O ${b}/t/${ID}/rapport.pdf\nwget -c ${b}/t/${ID}/rapport.pdf`],
    ["Depuis un pipe (jusqu'à 100 Mo)", `tar cz ./photos | curl -T - ${b}/photos.tar.gz`],
    ["Windows PowerShell, toute taille", `irm ${b}/ps | iex; transfer gros.iso`],
    ["Installer la commande transfer", `curl -sL ${b}/sh > ~/.transfer.sh && echo '. ~/.transfer.sh' >> ~/.bashrc\nirm ${b}/ps | Out-File -Append $PROFILE   # PowerShell`],
  ],
});

export function helpText(b, part) {
  const ex = examples(b, part);
  return `transfer : envoi de fichiers avec curl, par SysPros

${[...ex.main, ...ex.more].map(([t, c]) => `${t} :\n${c.replace(/^/gm, "  ")}`).join("\n\n")}

Les liens restent valables 90 jours. Cloudflare limite une requête à 100 Mo :
les scripts /sh et /ps envoient les fichiers plus gros en parties de ${mb(part)} Mo.
Toute personne qui a le lien peut télécharger le fichier.

Qui est SysPros ? ${PROMO_TEXT}
Contact : ${SUPPORT_EMAIL} · ${SUPPORT_PHONE} · ${SITE_URL}
`;
}

// ---------------------------------------------------------------- page HTML

const THEME_BOOT = `(function(){
var m=document.cookie.match(/(?:^|; )theme=(light|dark)(?:;|$)/);
var root=document.documentElement;
if(m)root.dataset.theme=m[1];
var dark=m?m[1]==="dark":matchMedia("(prefers-color-scheme: dark)").matches;
document.querySelector('meta[name="theme-color"]').content=dark?"${CHROME.dark}":"${CHROME.light}";
})();
document.addEventListener("click",function(e){
var btn=e.target.closest("[data-theme-toggle]");if(!btn)return;
var root=document.documentElement;
var dark=root.dataset.theme?root.dataset.theme==="dark":matchMedia("(prefers-color-scheme: dark)").matches;
var next=dark?"light":"dark";
root.dataset.theme=next;
document.cookie="theme="+next+"; Path=/; Max-Age=31536000; SameSite=Lax; Secure";
document.querySelector('meta[name="theme-color"]').content=next==="dark"?"${CHROME.dark}":"${CHROME.light}";
});`;

const DARK_TOKENS = `color-scheme:dark;
--bg:oklch(17% .025 258);--surface:oklch(22% .03 258);--surface-2:oklch(27% .032 258);
--border:oklch(32% .03 258/.35);--border-strong:oklch(57% .04 258/.35);
--fg:oklch(95% .012 258);--muted:oklch(72% .02 258);
--mark:oklch(64% .135 258);--ring:oklch(64% .135 258);--alert:oklch(64% .135 258);
--bar-bg:color-mix(in oklch,var(--bg) 76%,transparent);
--shadow-card:0 1px 2px oklch(0% 0 0/.3)`;
const DARK_RULES = `.brand-logo .logo-color{display:none}.brand-logo .logo-white{display:block}
.btn-icon .icon-sun{transform:scale(0) rotate(-90deg)}.btn-icon .icon-moon{transform:scale(1) rotate(0)}`;
const scoped = (sel) => DARK_RULES.split("\n").map((r) => r.replace(/(^|\})\./g, `$1${sel} .`)).join("\n");

const CSS = `
:root{color-scheme:light;
--bg:oklch(94% .018 258);--surface:oklch(98.5% .007 258);--surface-2:oklch(91% .018 258);
--border:oklch(84% .016 258);--border-strong:oklch(60% .018 258);
--fg:oklch(19% .014 258);--muted:oklch(46% .022 258);
--brand:oklch(52% .16 258);--brand-hover:oklch(44% .15 258);--brand-400:oklch(64% .135 258);
--bar-bg:color-mix(in oklch,var(--surface) 82%,transparent);
--mark:oklch(52% .16 258);--ring:oklch(52% .16 258);--alert:oklch(52% .16 258);
--shadow-card:0 2px 8px -2px oklch(25% .03 258/.10),0 1px 2px oklch(25% .03 258/.06);
--font-sans:"Public Sans",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
--font-mono:"Martian Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
:root[data-theme="dark"]{${DARK_TOKENS}}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${DARK_TOKENS}}}
.brand-logo .logo-white{display:none}
${scoped(':root[data-theme="dark"]')}
@media (prefers-color-scheme:dark){${scoped(':root:not([data-theme="light"])')}}
*{box-sizing:border-box}
body{margin:0;display:flex;flex-direction:column;min-height:100vh;background:var(--bg);color:var(--fg);font:15px/1.6 var(--font-sans);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
a{color:inherit}
:focus-visible{outline:2px solid var(--ring);outline-offset:2px}
::selection{background:var(--brand);color:#fff}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.brand-logo{display:flex;height:34px}
.brand-logo svg{display:block;height:100%;width:auto}
.container{width:100%;max-width:1280px;margin:0 auto;padding:0 20px}
@media (min-width:640px){.container{padding:0 32px}}
@media (min-width:1536px){.container{max-width:1600px;padding:0 48px}}
.kicker{margin:0;font:600 12px/1.27 var(--font-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--mark)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:44px;padding:0 22px;border:1px solid transparent;border-radius:12px;font:600 14px/1.2 var(--font-sans);text-decoration:none;cursor:pointer;transition:background-color .2s,border-color .2s,color .2s}
.btn-ghost{background:var(--surface);color:var(--fg);border-color:var(--border-strong)}
.btn-ghost:hover{border-color:var(--mark);color:var(--mark)}
.btn-sm{min-height:36px;padding:0 14px;font-size:13px}
.btn-icon{position:relative;display:inline-grid;flex:none;place-items:center;width:36px;height:36px;padding:0;border:1px solid var(--border-strong);border-radius:50%;background:var(--surface);color:var(--muted);cursor:pointer;transition:color .2s,border-color .2s}
.btn-icon:hover{color:var(--fg);border-color:var(--brand-400)}
.btn-icon svg{grid-area:1/1;width:18px;height:18px;transition:transform .3s}
.btn-icon .icon-moon{transform:scale(0) rotate(90deg)}
@media (prefers-reduced-motion:reduce){.btn-icon svg{transition:none}}
.card{background:var(--surface);border:1px solid var(--border);border-radius:18px;box-shadow:var(--shadow-card)}
.site-head{position:sticky;top:0;z-index:50;display:flow-root}
.bar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px;padding:10px 16px;background:var(--bar-bg);border:1px solid var(--border-strong);border-radius:32px;box-shadow:0 1px 3px 0 rgb(0 0 0/.1),0 1px 2px -1px rgb(0 0 0/.1);-webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px)}
@media (min-width:640px){.bar{padding:10px 24px}}
.bar-home{display:flex;flex:none;align-items:center;text-decoration:none}
.bar .brand-logo{height:40px}
.bar-actions{display:flex;align-items:center;gap:8px;margin-left:auto}
.nav-link{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:9999px;color:var(--fg);font:500 16px/1.5 var(--font-sans);white-space:nowrap;text-decoration:none;transition:background-color .2s}
.nav-link:hover{background:var(--surface-2)}
.nav-link svg{width:16px;height:16px}
@media (max-width:479px){.nav-link{padding:8px 10px}.nav-label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}}
.site-main{flex:1;padding-top:56px;padding-bottom:72px}
.layout{display:grid;grid-template-columns:minmax(0,1fr);gap:32px;align-items:start}
h1{margin:12px 0 14px;font-size:clamp(32px,5vw,56px);line-height:1.12;font-weight:700;letter-spacing:-.03em;text-wrap:balance}
h2{margin:0;padding-bottom:14px;border-bottom:2px solid var(--mark);font-size:18px;line-height:1.3;font-weight:700}
h3{margin:0 0 8px;font-size:14px;font-weight:600;color:var(--muted)}
.lead{margin:0;max-width:58ch;font-size:17px;line-height:1.6;color:var(--muted)}
pre{margin:0;padding:12px 14px;overflow-x:auto;background:var(--surface-2);border:1px solid var(--border);border-radius:12px}
code{font:500 12.5px/1.7 var(--font-mono)}
.upload{margin-top:32px;padding:20px}
#drop{display:grid;place-items:center;gap:6px;min-height:168px;padding:24px 16px;border:1.5px dashed var(--border-strong);border-radius:12px;background:var(--bg);text-align:center;color:var(--muted);cursor:pointer;transition:border-color .2s,background-color .2s}
#drop strong{color:var(--fg);font-size:16px}
#drop:hover,#drop.over{border-color:var(--mark);background:var(--surface-2)}
#drop input{display:none}
.opt{display:inline-flex;align-items:center;gap:8px;margin-top:14px;font-size:14px;cursor:pointer;user-select:none}
.opt input{width:16px;height:16px;accent-color:var(--brand)}
#jobs{list-style:none;padding:0;margin:0}
#jobs li{margin-top:12px;padding:14px;border:1px solid var(--border);border-radius:12px;overflow-wrap:anywhere}
#jobs .name{font-weight:600}
#jobs .bar-p{height:4px;margin-top:8px;background:var(--surface-2);border-radius:2px;overflow:hidden}
#jobs .bar-p i{display:block;height:100%;width:0;background:var(--brand);transition:width .2s}
#jobs .stat{margin-top:6px;font:12px/1.4 var(--font-mono);color:var(--muted);font-variant-numeric:tabular-nums}
#jobs .out{margin-top:10px;display:grid;gap:8px;justify-items:start}
#jobs .out a{color:var(--mark);font-weight:600}
#jobs .err{margin-top:8px;color:var(--alert)}
.cmds{padding:24px}
.cmds h3{margin-top:20px}
.more{margin-top:56px}
.more .grid{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;margin-top:16px}
.more .card{padding:20px}
.note{margin:20px 0 0;font-size:14px;color:var(--muted)}
.btn-primary{background:var(--brand);color:#fff}
.btn-primary:hover{background:var(--brand-hover)}
.btn-lg{min-height:52px;padding:0 28px;font-size:16px}
.btn svg{width:18px;height:18px;flex:none}
.fname{font-size:clamp(26px,4vw,44px);overflow-wrap:anywhere}
.meta{display:flex;flex-wrap:wrap;gap:6px 16px;margin:0;font:500 13px/1.6 var(--font-mono);color:var(--muted)}
.dl{margin-top:28px;padding:24px;display:grid;grid-template-columns:minmax(0,1fr);gap:20px}
.dl .row{display:flex;align-items:center;gap:16px}
.dl .file-ico{display:grid;flex:none;place-items:center;width:52px;height:52px;border-radius:14px;background:var(--surface-2);color:var(--mark)}
.dl .file-ico svg{width:26px;height:26px}
.dl .row .meta{display:block}
.dl .row strong{display:block;overflow-wrap:anywhere;font-size:16px}
.dl h3{margin:0 0 8px}
.dl .note{margin:0}
.promo{padding:24px;display:grid;grid-template-columns:minmax(0,1fr);gap:14px}
.promo .send code{overflow-wrap:anywhere}
.promo h2{border:0;padding:0;font-size:22px;line-height:1.25}
.promo p{margin:0;color:var(--muted)}
.promo .actions{display:flex;flex-wrap:wrap;gap:10px}
.promo .send{padding-top:14px;border-top:1px solid var(--border);font-size:14px}
.promo .send a{color:var(--mark);font-weight:600}
.site-foot{background:var(--surface);border-top:1px solid var(--border)}
.site-foot .container{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px 40px;padding-top:28px;padding-bottom:28px}
.foot-brand{display:flex;flex-wrap:wrap;align-items:center;gap:10px 20px;max-width:560px;font-size:14px;color:var(--muted)}
.foot-brand .brand-logo{height:28px}
.foot-links{display:flex;flex-wrap:wrap;gap:8px 24px;font-size:14px}
.foot-links a{color:var(--fg);text-decoration:none}.foot-links a:hover{color:var(--mark)}
@media (min-width:600px){.lead{font-size:18px}}
@media (min-width:760px){.more .grid{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}
@media (min-width:960px){.site-main{padding-top:80px;padding-bottom:96px}.layout{grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:56px}.cmds{padding:28px}}
`;

const LOGO = `<span class="brand-logo" aria-hidden="true">${LOGO_COLOR}${LOGO_WHITE}</span>`;
const ICON_BACK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>`;
const THEME_TOGGLE = `<button type="button" class="btn-icon" data-theme-toggle aria-label="Basculer entre thème clair et sombre" title="Thème clair / sombre">
<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
</button>`;

const block = ([t, c]) => `<h3>${esc(t)}</h3><pre><code>${esc(c)}</code></pre>`;

const TEL = "tel:+41" + SUPPORT_PHONE.replace(/\D/g, "").replace(/^0/, "");

// Début de page commun (head, barre du haut) et pied de page, comme hudu-qr et syspros.ch.
const pageTop = (title, extraHead = "") => `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="${CHROME.light}">
<script>${THEME_BOOT}</script>
<title>${esc(title)}</title>
${extraHead}<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
<link rel="stylesheet" href="${FONTS_CSS}">
<style>${CSS}</style>
</head>
<body>
<header class="site-head container"><div class="bar">
  <a href="${SITE_URL}" class="bar-home">${LOGO}<span class="sr">SysPros, site web</span></a>
  <div class="bar-actions">
    <a class="nav-link" href="${SITE_URL}">${ICON_BACK}<span class="nav-label">Retour au site</span></a>
    ${THEME_TOGGLE}
  </div>
</div></header>
`;

const FOOTER = `<footer class="site-foot"><div class="container">
  <div class="foot-brand">${LOGO}<span>${TAGLINE}</span></div>
  <nav class="foot-links" aria-label="Contact"><a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a><a href="${TEL}">${SUPPORT_PHONE}</a><a href="${SITE_URL}">syspros.ch</a></nav>
</div></footer>`;

// Taille lisible, à la française (virgule décimale).
export function humanSize(n) {
  const f = (x, d) => x.toFixed(d).replace(".", ",");
  if (n < 1024) return `${n} octets`;
  if (n < 1048576) return `${f(n / 1024, 0)} Ko`;
  if (n < 1073741824) return `${f(n / 1048576, n < 10485760 ? 1 : 0)} Mo`;
  return `${f(n / 1073741824, 2)} Go`;
}

const ICON_DL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>`;
const ICON_FILE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>`;

const PROMO_ASIDE = (b) => `<aside class="card promo">
      <p class="kicker">Qui est SysPros ?</p>
      <h2>${PROMO_TITLE}</h2>
      <p>${PROMO_TEXT}</p>
      <div class="actions">
        <a class="btn btn-primary" href="${SITE_URL}/contact">Discuter de votre projet</a>
        <a class="btn btn-ghost" href="${SITE_URL}">Découvrir SysPros</a>
      </div>
      <p class="send">Vous aussi, envoyez un fichier en un lien : <a href="${b}/">transfer.syspros.ch</a>, par glisser-déposer ou avec <code>curl -T fichier ${b.replace(/^https?:\/\//, "")}</code>.</p>
    </aside>`;

// Page de téléchargement d'un transfert (/t/<id> ouvert dans un navigateur, ou aperçu de
// lien). info vient de 'xi' : elle n'use pas de téléchargement. info = null : lien mort.
export function downloadHtml(b, xh, info) {
  const page = `${b}/t/${xh}`;
  if (!info) {
    return `${pageTop("Lien expiré · SysPros", `<meta property="og:title" content="Lien expiré">\n<meta property="og:site_name" content="SysPros">\n`)}
<main class="site-main container">
  <div class="layout">
    <section>
      <p class="kicker">Fichier partagé</p>
      <h1>Ce lien n'est plus disponible.</h1>
      <p class="lead">Le transfert a expiré (les liens restent valables 90 jours), il a été supprimé, ou il a atteint son nombre de téléchargements. Demandez un nouveau lien à la personne qui vous l'a envoyé.</p>
    </section>
    ${PROMO_ASIDE(b)}
  </div>
</main>

${FOOTER}
</body>
</html>`;
  }
  const name = info.title || (info.files > 1 ? `${info.files} fichiers` : "Fichier");
  // Plusieurs fichiers (ou nom introuvable) : ?dl renvoie la liste des fichiers.
  const direct = info.title && info.files <= 1 ? `${page}/${encodeURIComponent(info.title)}` : `${page}?dl`;
  const desc = `${humanSize(info.size)} · partagé avec SysPros Transfert`;
  const og = `<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="SysPros">
<meta property="og:title" content="${esc(name)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(page)}">
`;
  return `${pageTop(`${name} · SysPros`, og)}
<main class="site-main container">
  <div class="layout">
    <section>
      <p class="kicker">Fichier partagé</p>
      <h1 class="fname">${esc(name)}</h1>
      <p class="meta"><span>${humanSize(info.size)}</span><span>Lien valable 90 jours après l'envoi</span></p>
      <div class="card dl">
        <div class="row">
          <span class="file-ico">${ICON_FILE}</span>
          <div><strong>${esc(name)}</strong><span class="meta">${humanSize(info.size)}</span></div>
        </div>
        <a class="btn btn-primary btn-lg" href="${esc(direct)}" download>${ICON_DL}Télécharger</a>
        <div>
          <h3>En ligne de commande</h3>
          <pre><code>curl -O ${esc(direct)}
wget -c ${esc(direct)}</code></pre>
        </div>
        <p class="note">Toute personne qui a ce lien peut télécharger le fichier. Il est chiffré et stocké chez transfer.it (MEGA), puis remis par transfer.syspros.ch.</p>
      </div>
    </section>
    ${PROMO_ASIDE(b)}
  </div>
</main>

${FOOTER}
</body>
</html>`;
}

export function helpHtml(b, part) {
  const ex = examples(b, part);
  return `${pageTop("Transfert · SysPros")}

<main class="site-main container">
  <div class="layout">
    <section>
      <p class="kicker">Transfert de fichiers</p>
      <h1>Un fichier, un lien.</h1>
      <p class="lead">Déposez un fichier ici ou envoyez-le avec curl : vous recevez un lien de téléchargement valable 90 jours. Sans compte, quelle que soit la taille.</p>
      <div class="card upload">
        <div id="drop"><input type="file" id="pick" multiple><strong>Déposez vos fichiers ici</strong><span>ou cliquez pour les choisir</span></div>
        <label class="opt"><input type="checkbox" id="once"> Un seul téléchargement</label>
        <ul id="jobs"></ul>
      </div>
    </section>
    <aside class="card cmds">
      <h2>En ligne de commande</h2>
      ${ex.main.map(block).join("\n      ")}
    </aside>
  </div>

  <section class="more">
    <p class="kicker">Autres usages</p>
    <div class="grid">
      ${ex.more.map((e) => `<div class="card">${block(e)}</div>`).join("\n      ")}
    </div>
    <p class="note">Cloudflare limite une requête à 100 Mo : les scripts <code>/sh</code> et <code>/ps</code> et cette page envoient les fichiers plus gros en parties de ${mb(part)} Mo. Les fichiers sont stockés chez transfer.it (MEGA) ; toute personne qui a le lien peut les télécharger.</p>
  </section>
</main>

${FOOTER}

<script>
var PART = ${part};
var drop = document.getElementById("drop"), pick = document.getElementById("pick"), jobs = document.getElementById("jobs");
drop.onclick = function () { pick.click(); };
pick.onchange = function () { Array.from(pick.files).forEach(send); pick.value = ""; };
drop.ondragover = function (e) { e.preventDefault(); drop.classList.add("over"); };
drop.ondragleave = function () { drop.classList.remove("over"); };
drop.ondrop = function (e) { e.preventDefault(); drop.classList.remove("over"); Array.from(e.dataTransfer.files).forEach(send); };

function lastLine(t) { var l = t.trim().split("\\n"); return l[l.length - 1]; }

// onAck : pour une partie (X-Progress), octets que MEGA a confirmés (lignes « ack » de la réponse).
function put(url, body, headers, onProgress, onAck) {
  return new Promise(function (resolve, reject) {
    var x = new XMLHttpRequest();
    x.open("PUT", url);
    for (var k in headers) if (headers[k] !== "") x.setRequestHeader(k, headers[k]);
    x.upload.onprogress = function (e) { onProgress(e.loaded); };
    if (onAck) x.onprogress = function () {
      var t = x.responseText, i = t.lastIndexOf("ack ");
      if (i >= 0) onAck(parseInt(t.slice(i + 4), 10) || 0);
    };
    x.onload = function () { resolve({ status: x.status, text: x.responseText, del: x.getResponseHeader("x-url-delete") }); };
    x.onerror = function () { reject(new Error("erreur réseau")); };
    x.send(body);
  });
}

async function putRetry(url, body, headers, onProgress, onAck) {
  for (var tries = 1; ; tries++) {
    try {
      var res = await put(url, body, headers, onProgress, onAck);
      if (res.status < 400 && !onAck) return res;
      // Partie : la réponse part avant la fin ; réussite = dernière ligne « part … », sinon « erreur … ».
      if (res.status < 400 && lastLine(res.text).indexOf("part ") === 0) return { status: res.status, text: lastLine(res.text) };
      var msg = res.status < 400 ? lastLine(res.text) : res.text.trim();
      if ((res.status >= 400 && res.status < 500) || tries >= 3) throw new Error(msg);
    } catch (e) { if (tries >= 3 || !/réseau/.test(e.message)) throw e; }
    await new Promise(function (r) { setTimeout(r, 2000); });
  }
}

function size(x) { return x >= 1073741824 ? (x / 1073741824).toFixed(2) + " Go" : Math.round(x / 1048576) + " Mo"; }
function dur(x) { x = Math.round(x); return x >= 3600 ? Math.floor(x / 3600) + " h " + String(Math.floor(x % 3600 / 60)).padStart(2, "0") : x >= 60 ? Math.round(x / 60) + " min" : x + " s"; }

function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }

async function send(file) {
  var li = el("li"), name = el("div", "name", file.name), track = el("div", "bar-p"), bar = el("i"), stat = el("div", "stat");
  track.append(bar); li.append(name, track, stat); jobs.prepend(li);
  var once = document.getElementById("once").checked;
  if (once) name.textContent += " · 1 téléchargement";
  var url = (once ? "/1/" : "/") + encodeURIComponent(file.name);
  // Progression : pourcentage, octets envoyés, vitesse lissée (mise à jour chaque seconde), temps restant.
  var t0 = Date.now(), pt = t0, pb = 0, sp = 0;
  var show = function (n) {
    bar.style.width = (file.size ? Math.min(100, n / file.size * 100) : 100) + "%";
    var now = Date.now();
    if (now - pt < 1000) return;
    var v = Math.max(0, (n - pb) / ((now - pt) / 1000));
    sp = sp ? 0.8 * sp + 0.2 * v : v; pb = n; pt = now;
    stat.textContent = Math.floor(n / file.size * 100) + " % · " + size(n) + " / " + size(file.size) + " · " +
      (sp / 1048576).toFixed(1) + " Mo/s (" + Math.round(sp * 8 / 1e6) + " Mbit/s) · reste " + (sp ? dur((file.size - n) / sp) : "?");
  };
  try {
    var res;
    if (file.size <= PART) {
      res = await putRetry(url, file, {}, show);
    } else {
      // Gros fichier : ouverture, parties ${PARALLEL} à la fois, puis fin avec les sommes de contrôle.
      var init = (await putRetry(url, "", { "X-Total-Size": file.size }, function () {})).text.trim().split(" ");
      var state = init[1], pp = +init[2], parts = [];
      for (var i = 0, s = 0; s < file.size; i++) { var e = Math.min((i + 1) * pp + 524288, file.size); parts.push({ s: s, e: e, acked: 0 }); s = e; }
      var outs = [], next = 0;
      // La progression suit ce que MEGA a confirmé, pas ce qui est parti vers Cloudflare (qui
      // accepte une partie bien plus vite que MEGA).
      var sendPart = function (p) {
        return putRetry(url, file.slice(p.s, p.e), { "X-Total-Size": file.size, "X-State": state, "X-Offset": p.s, "X-Progress": "1" },
          function () {}, function (n) { p.acked = n; show(parts.reduce(function (t, q) { return t + q.acked; }, 0)); });
      };
      var worker = async function () {
        while (next < parts.length) {
          var k = next++, p = parts[k];
          var r = await sendPart(p);
          p.acked = p.e - p.s; outs[k] = r.text;
        }
      };
      var workers = []; for (var w = 0; w < ${PARALLEL}; w++) workers.push(worker());
      await Promise.all(workers);
      var fin = function () { return putRetry(url, outs.join("\\n"), { "X-Total-Size": file.size, "X-State": state, "X-Finalize": "1" }, function () {}); };
      try { res = await fin(); } catch (err) {
        if (!/jeton/.test(err.message)) throw err;
        // Le jeton de fin s'est perdu : on renvoie la dernière partie puis on retente.
        var L = parts.length - 1;
        outs[L] = (await sendPart(parts[L])).text;
        res = await fin();
      }
    }
    {
      var t = res.text.trim();
      var lines = t.split("\\n");
      bar.style.width = "100%";
      var secs = Math.max(1, (Date.now() - t0) / 1000);
      stat.textContent = size(file.size) + " en " + dur(secs) + " · " + (file.size / secs / 1048576).toFixed(1) + " Mo/s (" + Math.round(file.size / secs * 8 / 1e6) + " Mbit/s) en moyenne";
      var out = el("div", "out"), a = el("a", "", lines[0]);
      a.href = lines[0]; a.target = "_blank"; a.rel = "noopener";
      var cmd = el("pre"); cmd.append(el("code", "", "curl -O " + lines[1]));
      out.append(a, cmd);
      if (res.del) {
        var btn = el("button", "btn btn-ghost btn-sm", "Supprimer");
        btn.type = "button";
        btn.onclick = async function () {
          if (!confirm("Supprimer " + file.name + " ? Les liens ne fonctionneront plus.")) return;
          var r = await fetch(res.del, { method: "DELETE" });
          if (r.ok) { out.remove(); name.textContent = file.name + " · supprimé"; bar.style.width = "0"; }
          else alert(await r.text());
        };
        out.append(btn);
      }
      li.append(out);
      return;
    }
  } catch (e) {
    li.append(el("div", "err", e.message));
  }
}
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------- scripts

// Parties envoyées en même temps (variable PARALLEL du Worker, 4 par défaut).
let PARALLEL = 4;
export function setParallel(n) { if (n >= 1 && n <= 32) PARALLEL = Math.floor(n); }

export function shScript(b, part) {
  return `# transfer : envoi de fichiers vers transfer.it via ${b} (SysPros)
#   curl -sL ${b}/sh | sh -s <fichier>          # envoi direct, toute taille
#   source <(curl -s ${b}/sh)                    # charge la commande dans ce shell
#   transfer <fichier|dossier>                   # affiche les liens
#   ... | transfer <nom>                         # envoie l'entrée standard (100 Mo max)
# Au-delà de ${mb(part)} Mo, le fichier part en parties de ${mb(part)} Mo, ${PARALLEL} à la fois.

_transfer_enc() { printf %s "$1" | od -An -v -tx1 | tr -d ' \\n' | sed 's/../%&/g'; }

transfer() {
  _tb='${b}'; _tp=${part}
  if [ $# -eq 0 ]; then
    echo "usage : transfer <fichier|dossier>   ou   ... | transfer <nom>" >&2; return 1
  fi
  if [ ! -e "$1" ]; then
    if [ -t 0 ]; then echo "transfer : $1 : fichier introuvable" >&2; return 1; fi
    curl -sS --fail-with-body -T - "$_tb/$(_transfer_enc "$1")"; return
  fi
  _tf=$1; _tn=$(basename "$1"); _tt=
  if [ -d "$_tf" ]; then
    _tt=$(mktemp) || return 1
    tar -C "$(dirname "$_tf")" -czf "$_tt" "$_tn" || { rm -f "$_tt"; return 1; }
    _tf=$_tt; _tn=$_tn.tar.gz
  fi
  _ts=$(wc -c < "$_tf" | tr -d ' ')
  if [ "$_ts" -le "$_tp" ]; then
    curl -# --fail-with-body -T "$_tf" "$_tb/$(_transfer_enc "$_tn")"; _tr=$?
  else
    _transfer_parts "$_tf" "$_tb/$(_transfer_enc "$_tn")" "$_ts"; _tr=$?
  fi
  [ -n "$_tt" ] && rm -f "$_tt"
  return $_tr
}

# Gros fichiers : 1. ouverture, 2. parties en parallèle, 3. fin (sommes de contrôle).
_transfer_parts() {
  _pi=$(curl -sS --fail-with-body -X PUT -H "X-Total-Size: $3" -d '' "$2") || { printf '%s\\n' "$_pi" >&2; return 1; }
  case $_pi in init\\ *) ;; *) printf '%s\\n' "$_pi" >&2; return 1 ;; esac
  _pi=\${_pi#init }; TR_STATE=\${_pi%% *}; _pp=\${_pi#* }
  TR_DIR=$(mktemp -d) || return 1
  _i=0; _s=0
  while [ "$_s" -lt "$3" ]; do
    _e=$(( (_i + 1) * _pp + 524288 )); [ "$_e" -gt "$3" ] && _e=$3
    echo "$_i $_s $_e" >> "$TR_DIR/list"
    _i=$(( _i + 1 )); _s=$_e
  done
  TR_FILE=$1; TR_URL=$2; TR_SIZE=$3; TR_N=$_i
  export TR_FILE TR_URL TR_SIZE TR_STATE TR_DIR TR_N
  : > "$TR_DIR/done"; : > "$TR_DIR/failed"; : > "$TR_DIR/w.out"
  cat > "$TR_DIR/part.sh" <<'PART'
i=$1; s=$2; e=$3; try=0
if [ "$i" = w ]; then
  # Progression, chaque seconde : parties finies + octets que MEGA a confirmés pour les parties
  # en cours (lignes « ack » que le Worker renvoie pendant l'envoi), vitesse lissée, temps restant.
  t0=$(date +%s); pt=$t0; pb=0; sp=0
  while :; do
    sleep 1; now=$(date +%s)
    set -- $(awk -v now="$now" -v t0="$t0" -v pt="$pt" -v pb="$pb" -v sp="$sp" -v total="$TR_SIZE" -v n="$TR_N" '
      function h(x) { return x >= 1073741824 ? sprintf("%.2f Go", x / 1073741824) : sprintf("%.0f Mo", x / 1048576) }
      function d(x) { x = int(x); return x >= 3600 ? sprintf("%d h %02d", x / 3600, x % 3600 / 60) : x >= 60 ? sprintf("%d min", (x + 30) / 60) : sprintf("%d s", x) }
      FILENAME ~ /\\/list$/ { size[$1] = $3 - $2; next }
      FILENAME ~ /\\/done$/ { ok[$1] = 1; nd++; next }
      FILENAME ~ /\\/failed$/ { nf++; next }
      $1 == "ack" { k = FILENAME; sub(/.*\\//, "", k); sub(/\\.out$/, "", k); a[k] = $2 }
      END {
        for (k in ok) b += size[k]
        for (k in a) if (!(k in ok)) b += a[k]
        if (b > total) b = total
        if (now > pt) { v = (b - pb) / (now - pt); if (v < 0) v = 0; sp = sp > 0 ? 0.8 * sp + 0.2 * v : v }
        t = now > t0 ? now - t0 : 1
        if (nf > 0 && nd + nf >= n) line = sprintf("transfer : %d partie(s) en échec", nf)
        else if (nd + nf >= n) line = sprintf("transfer : %s en %s, %.1f Mo/s (%d Mbit/s) en moyenne", h(total), d(t), total / t / 1048576, total / t * 8 / 1000000)
        else line = sprintf("transfer : %d %% · %s / %s · %.1f Mo/s (%d Mbit/s) · reste %s · %d/%d parties", b * 100 / total, h(b), h(total), sp / 1048576, sp * 8 / 1000000, sp > 0 ? d((total - b) / sp) : "?", nd, n)
        printf "\\r%s\\033[K", line > "/dev/stderr"
        printf "%.0f %.0f %d\\n", b, sp, (nd + nf >= n)
      }' "$TR_DIR/list" "$TR_DIR/done" "$TR_DIR/failed" "$TR_DIR"/*.out)
    pb=$1; sp=$2; pt=$now
    if [ "$3" = 1 ]; then printf '\\n' >&2; exit 0; fi
  done
fi
while :; do
  # -N : curl écrit chaque ligne « ack » dès qu'elle arrive. Réussite = dernière ligne « part … ».
  tail -c +"$(( s + 1 ))" "$TR_FILE" | head -c "$(( e - s ))" | curl -sSN --fail-with-body -T - -H "X-Progress: 1" \\
    -H "X-Total-Size: $TR_SIZE" -H "X-State: $TR_STATE" -H "X-Offset: $s" "$TR_URL" > "$TR_DIR/$i.out" 2> "$TR_DIR/$i.err"
  case $(tail -n 1 "$TR_DIR/$i.out") in part\\ *) echo "$i" >> "$TR_DIR/done"; exit 0 ;; esac
  try=$(( try + 1 ))
  if [ "$try" -ge 3 ]; then
    printf '\\ntransfer : partie %s : ' "$i" >&2; tail -n 1 "$TR_DIR/$i.out" >&2; cat "$TR_DIR/$i.err" >&2
    echo "$i" >> "$TR_DIR/failed"; exit 1
  fi
  sleep 2
done
PART
  # La ligne « w » lance l'affichage de la progression, à côté des envois (TRANSFER_PARALLEL=n pour
  # changer leur nombre).
  if ! { echo w 0 0; cat "$TR_DIR/list"; } | xargs -P $(( \${TRANSFER_PARALLEL:-${PARALLEL}} + 1 )) -L 1 sh "$TR_DIR/part.sh"; then rm -rf "$TR_DIR"; return 1; fi
  for _try in 1 2; do
    _pr=$(cat "$TR_DIR"/*.out | curl -sS --fail-with-body -X PUT -H "X-Total-Size: $3" -H "X-State: $TR_STATE" \\
      -H "X-Finalize: 1" --data-binary @- "$2") && { printf '%s\\n' "$_pr"; rm -rf "$TR_DIR"; return 0; }
    case $_pr in *jeton*) sh "$TR_DIR/part.sh" $(tail -n 1 "$TR_DIR/list") 2>/dev/null ;; *) break ;; esac
  done
  printf '%s\\n' "$_pr" >&2; rm -rf "$TR_DIR"; return 1
}

# Lancé par un pipe avec des arguments (curl -sL ${b}/sh | sh -s <fichier>) : envoi immédiat.
if [ $# -gt 0 ]; then transfer "$@"; fi
`;
}

export function ps1Script(b, part) {
  return `# transfer : envoi de fichiers vers transfer.it via ${b} (SysPros)
#   irm ${b}/ps | iex; transfer <fichier|dossier>
# Au-delà de ${mb(part)} Mo, le fichier part en parties de ${mb(part)} Mo, ${PARALLEL} à la fois.
# Utilise curl.exe (inclus dans Windows 10+).

function transfer {
  param([Parameter(Mandatory = $true)][string]$Path)
  $base = '${b}'; $part = ${part}; $parallel = ${PARALLEL}
  $item = Get-Item -LiteralPath $Path -ErrorAction Stop
  $tmp = $null
  if ($item.PSIsContainer) {
    $tmp = Join-Path ([IO.Path]::GetTempPath()) ($item.Name + '.zip')
    Compress-Archive -LiteralPath $item.FullName -DestinationPath $tmp -Force
    $item = Get-Item -LiteralPath $tmp
  }
  $url = "$base/" + [Uri]::EscapeDataString($item.Name)
  $size = $item.Length
  try {
    if ($size -le $part) {
      & curl.exe -# --fail-with-body -T $item.FullName $url
      return
    }
    $dir = Join-Path ([IO.Path]::GetTempPath()) ('transfer-' + [Guid]::NewGuid().ToString('N'))
    $null = New-Item -ItemType Directory -Path $dir
    try {
      # 1. ouverture
      $empty = Join-Path $dir 'empty'; [IO.File]::WriteAllBytes($empty, [byte[]]@())
      $init = (& curl.exe -sS --fail-with-body -T $empty -H "X-Total-Size: $size" $url) -join ''
      if ($LASTEXITCODE -ne 0 -or $init -notlike 'init *') { Write-Error "transfer : $init"; return }
      $f = $init.Split(' '); $state = $f[1]; $pp = [long]$f[2]
      $parts = New-Object System.Collections.ArrayList
      $s = [long]0; $i = 0
      while ($s -lt $size) {
        $e = [Math]::Min([long](($i + 1) * $pp + 524288), $size)
        $null = $parts.Add([pscustomobject]@{ i = $i; s = $s; e = $e; tries = 0; proc = $null })
        $s = $e; $i++
      }
      # 2. parties, $parallel à la fois
      $buf = New-Object byte[] 1048576
      $queue = New-Object System.Collections.Queue (,$parts.ToArray())
      $running = New-Object System.Collections.ArrayList
      $done = 0; $doneBytes = [long]0
      $clock = [Diagnostics.Stopwatch]::StartNew(); $pt = 0.0; $pb = 0.0; $sp = 0.0
      # Fichier en cours d'écriture par curl : lecture partagée.
      $read = { param($path)
        try { $fs = [IO.File]::Open($path, 'Open', 'Read', 'ReadWrite'); try { (New-Object IO.StreamReader($fs)).ReadToEnd() } finally { $fs.Dispose() } } catch { '' } }
      $lines = { param($path) @((& $read $path) -split "[\\r\\n]+" | Where-Object { $_ }) }
      # Octets de la partie que MEGA a confirmés : dernière ligne « ack <octets> » renvoyée par le Worker.
      $acked = { param($path) $a = & $lines $path | Where-Object { $_ -like 'ack *' } | Select-Object -Last 1; if ($a) { [double]$a.Substring(4) } else { 0 } }
      $fmt = { param($x) if ($x -ge 1GB) { '{0:N2} Go' -f ($x / 1GB) } else { '{0:N0} Mo' -f ($x / 1MB) } }
      while ($queue.Count -gt 0 -or $running.Count -gt 0) {
        while ($running.Count -lt $parallel -and $queue.Count -gt 0) {
          $p = $queue.Dequeue(); $bin = Join-Path $dir "$($p.i).bin"
          if (-not (Test-Path $bin)) {
            $in = [IO.File]::OpenRead($item.FullName); $out = [IO.File]::Create($bin)
            try {
              $null = $in.Seek($p.s, 'Begin'); $left = $p.e - $p.s
              while ($left -gt 0) {
                $n = $in.Read($buf, 0, [int][Math]::Min([long]$buf.Length, $left))
                if ($n -le 0) { break }
                $out.Write($buf, 0, $n); $left -= $n
              }
            } finally { $in.Dispose(); $out.Dispose() }
          }
          # X-Progress : le Worker renvoie chaque seconde « ack <octets> » ; -N les écrit tout de suite.
          $cargs = '-sSN --fail-with-body -H "X-Progress: 1" -T "' + $bin + '" -H "X-Total-Size: ' + $size + '" -H "X-State: ' + $state + '" -H "X-Offset: ' + $p.s + '" -o "' + (Join-Path $dir "$($p.i).out") + '" "' + $url + '"'
          $p.proc = Start-Process -FilePath 'curl.exe' -ArgumentList $cargs -NoNewWindow -PassThru -RedirectStandardError (Join-Path $dir "$($p.i).err")
          $null = $p.proc.Handle  # sans cela, PowerShell 5.1 ne lit pas ExitCode
          $null = $running.Add($p)
        }
        Start-Sleep -Milliseconds 300
        foreach ($p in @($running)) {
          if (-not $p.proc.HasExited) { continue }
          $running.Remove($p)
          $reply = & $lines (Join-Path $dir "$($p.i).out") | Select-Object -Last 1
          if ($p.proc.ExitCode -eq 0 -and $reply -like 'part *') { $done++; $doneBytes += $p.e - $p.s; Remove-Item -LiteralPath (Join-Path $dir "$($p.i).bin") -ErrorAction SilentlyContinue; continue }
          $p.tries++
          if ($p.tries -lt 3) { $queue.Enqueue($p); continue }
          $why = & $lines (Join-Path $dir "$($p.i).err")
          Write-Error ("transfer : partie $($p.i) : $reply $($why -join ' ')"); return
        }
        $now = $clock.Elapsed.TotalSeconds
        if ($now - $pt -lt 1) { continue }
        $b = $doneBytes
        foreach ($p in $running) { $b += & $acked (Join-Path $dir "$($p.i).out") }
        $b = [Math]::Min($b, $size)
        $v = [Math]::Max(0, ($b - $pb) / ($now - $pt)); $sp = if ($sp -gt 0) { 0.8 * $sp + 0.2 * $v } else { $v }; $pb = $b; $pt = $now
        $status = '{0} % · {1} / {2} · {3:N1} Mo/s ({4:N0} Mbit/s) · {5}/{6} parties' -f [int][Math]::Floor($b * 100 / $size), (& $fmt $b), (& $fmt $size), ($sp / 1MB), ($sp * 8 / 1e6), $done, $parts.Count
        $eta = if ($sp -gt 0) { [int](($size - $b) / $sp) } else { -1 }
        Write-Progress -Activity "transfer $($item.Name)" -Status $status -PercentComplete ([int]($b * 100 / $size)) -SecondsRemaining $eta
      }
      Write-Progress -Activity "transfer" -Completed
      $t = [Math]::Max(1, $clock.Elapsed.TotalSeconds)
      Write-Host ('transfer : {0} en {1:hh\\:mm\\:ss}, {2:N1} Mo/s ({3:N0} Mbit/s) en moyenne' -f (& $fmt $size), [TimeSpan]::FromSeconds([int]$t), ($size / $t / 1MB), ($size / $t * 8 / 1e6))
      # 3. fin : toutes les réponses des parties, dans un fichier
      $all = Join-Path $dir 'parts.txt'
      ($parts | ForEach-Object { Get-Content -Raw -LiteralPath (Join-Path $dir "$($_.i).out") }) -join "\`n" | Set-Content -LiteralPath $all -Encoding ascii -NoNewline
      $resp = & curl.exe -sS --fail-with-body -X PUT -H "X-Total-Size: $size" -H "X-State: $state" -H "X-Finalize: 1" --data-binary "@$all" $url
      if ($LASTEXITCODE -ne 0) { Write-Error "transfer : $($resp -join ' ')"; return }
      return $resp
    } finally { Remove-Item -LiteralPath $dir -Recurse -Force -ErrorAction SilentlyContinue }
  } finally { if ($tmp) { Remove-Item -LiteralPath $tmp -ErrorAction SilentlyContinue } }
}
`;
}
