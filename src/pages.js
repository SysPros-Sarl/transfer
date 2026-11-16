// Page d'accueil (HTML et texte pour curl) et scripts d'aide. Charte SysPros reprise de
// hudu-qr (src/views/layout.tsx), elle-même alignée sur syspros.ch (Website/src/styles/global.css).

import { LOGO_COLOR, LOGO_WHITE } from "./brand.js";

const SITE_URL = "https://syspros.ch";
const SUPPORT_EMAIL = "support@syspros.ch";
const SUPPORT_PHONE = "021 501 89 00";
const FONTS_CSS = "https://fonts.googleapis.com/css2?family=Public+Sans:wght@400..800&family=Martian+Mono:wght@400..700&display=swap";
const CHROME = { light: "#e4ecf8", dark: "#09101a" };

const mb = (bytes) => Math.round(bytes / 1048576);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const ID = "AbCdEfGhIjKl";
const examples = (b, part) => ({
  main: [
    ["Envoyer (jusqu'à 100 Mo)", `curl -T rapport.pdf ${b}`],
    ["Vous recevez", `https://transfer.it/t/${ID}\n${b}/t/${ID}/rapport.pdf\nsupprimer : curl -X DELETE ${b}/t/${ID}/<jeton>`],
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
  return `transfer : envoi de fichiers avec curl, liens transfer.it (SysPros)

${[...ex.main, ...ex.more].map(([t, c]) => `${t} :\n${c.replace(/^/gm, "  ")}`).join("\n\n")}

Les liens restent valables 90 jours. Cloudflare limite une requête à 100 Mo :
les scripts /sh et /ps envoient les fichiers plus gros en parties de ${mb(part)} Mo.
Toute personne qui a le lien peut télécharger le fichier.
Support : ${SUPPORT_EMAIL} · ${SUPPORT_PHONE} · ${SITE_URL}
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
#jobs .out{margin-top:10px;display:grid;gap:8px;justify-items:start}
#jobs .out a{color:var(--mark);font-weight:600}
#jobs .err{margin-top:8px;color:var(--alert)}
.cmds{padding:24px}
.cmds h3{margin-top:20px}
.more{margin-top:56px}
.more .grid{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;margin-top:16px}
.more .card{padding:20px}
.note{margin:20px 0 0;font-size:14px;color:var(--muted)}
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

export function helpHtml(b, part) {
  const ex = examples(b, part);
  const tel = "tel:+41" + SUPPORT_PHONE.replace(/\D/g, "").replace(/^0/, "");
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="${CHROME.light}">
<script>${THEME_BOOT}</script>
<title>Transfert · SysPros</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
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

<footer class="site-foot"><div class="container">
  <div class="foot-brand">${LOGO}<span>Infogérance, cybersécurité et cloud suisse pour les PME de Suisse romande.</span></div>
  <nav class="foot-links" aria-label="Contact"><a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a><a href="${tel}">${SUPPORT_PHONE}</a><a href="${SITE_URL}">syspros.ch</a></nav>
</div></footer>

<script>
var PART = ${part};
var drop = document.getElementById("drop"), pick = document.getElementById("pick"), jobs = document.getElementById("jobs");
drop.onclick = function () { pick.click(); };
pick.onchange = function () { Array.from(pick.files).forEach(send); pick.value = ""; };
drop.ondragover = function (e) { e.preventDefault(); drop.classList.add("over"); };
drop.ondragleave = function () { drop.classList.remove("over"); };
drop.ondrop = function (e) { e.preventDefault(); drop.classList.remove("over"); Array.from(e.dataTransfer.files).forEach(send); };

function put(url, body, headers, onProgress) {
  return new Promise(function (resolve, reject) {
    var x = new XMLHttpRequest();
    x.open("PUT", url);
    for (var k in headers) if (headers[k] !== "") x.setRequestHeader(k, headers[k]);
    x.upload.onprogress = function (e) { onProgress(e.loaded); };
    x.onload = function () { resolve({ status: x.status, text: x.responseText, del: x.getResponseHeader("x-url-delete") }); };
    x.onerror = function () { reject(new Error("erreur réseau")); };
    x.send(body);
  });
}

function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }

async function send(file) {
  var li = el("li"), name = el("div", "name", file.name), track = el("div", "bar-p"), bar = el("i");
  track.append(bar); li.append(name, track); jobs.prepend(li);
  var once = document.getElementById("once").checked;
  if (once) name.textContent += " · 1 téléchargement";
  var url = (once ? "/1/" : "/") + encodeURIComponent(file.name);
  var off = 0, state = "";
  try {
    for (;;) {
      var res, tries = 0;
      for (;;) {
        try {
          res = await put(url, file.slice(off, off + PART), { "X-Total-Size": file.size, "X-Offset": off, "X-State": state },
            function (n) { bar.style.width = (file.size ? Math.min(100, (off + n) / file.size * 100) : 100) + "%"; });
          if (res.status < 500 || ++tries >= 3) break;
        } catch (e) { if (++tries >= 3) throw e; }
        await new Promise(function (r) { setTimeout(r, 2000); });
      }
      var t = res.text.trim();
      if (res.status >= 400) throw new Error(t);
      if (t.indexOf("next ") === 0) { var p = t.split(" "); off = +p[1]; state = p[2]; continue; }
      var lines = t.split("\\n");
      bar.style.width = "100%";
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

export function shScript(b, part) {
  return `# transfer : envoi de fichiers vers transfer.it via ${b} (SysPros)
#   curl -sL ${b}/sh | sh -s <fichier>          # envoi direct, toute taille
#   source <(curl -s ${b}/sh)                    # charge la commande dans ce shell
#   transfer <fichier|dossier>                   # affiche les liens
#   ... | transfer <nom>                         # envoie l'entrée standard (100 Mo max)
# Au-delà de ${mb(part)} Mo, le fichier part en parties de ${mb(part)} Mo.

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
    _transfer_parts "$_tf" "$(_transfer_enc "$_tn")" "$_ts"; _tr=$?
  fi
  [ -n "$_tt" ] && rm -f "$_tt"
  return $_tr
}

_transfer_parts() {
  _po=0; _pst=
  while :; do
    _try=0
    while :; do
      printf '\\rtransfer : %s %% ' "$(( _po * 100 / $3 ))" >&2
      _pr=$(tail -c +"$(( _po + 1 ))" "$1" | head -c "$_tp" | curl -sS --fail-with-body -T - \\
        -H "X-Total-Size: $3" -H "X-Offset: $_po" -H "X-State: $_pst" "$_tb/$2") && break
      _try=$(( _try + 1 ))
      if [ $_try -ge 3 ]; then printf '\\n%s\\n' "$_pr" >&2; return 1; fi
      sleep 2
    done
    case $_pr in
      next\\ *) _pr=\${_pr#next }; _po=\${_pr%% *}; _pst=\${_pr#* } ;;
      *) printf '\\rtransfer : 100 %%\\n' >&2; printf '%s\\n' "$_pr"; return 0 ;;
    esac
  done
}

# Lancé par un pipe avec des arguments (curl -sL ${b}/sh | sh -s <fichier>) : envoi immédiat.
if [ $# -gt 0 ]; then transfer "$@"; fi
`;
}

export function ps1Script(b, part) {
  return `# transfer : envoi de fichiers vers transfer.it via ${b} (SysPros)
#   irm ${b}/ps | iex; transfer <fichier|dossier>
# Au-delà de ${mb(part)} Mo, le fichier part en parties de ${mb(part)} Mo. Utilise curl.exe (inclus dans Windows 10+).

function transfer {
  param([Parameter(Mandatory = $true)][string]$Path)
  $base = '${b}'; $part = ${part}
  $item = Get-Item -LiteralPath $Path -ErrorAction Stop
  $tmp = $null
  if ($item.PSIsContainer) {
    $tmp = Join-Path ([IO.Path]::GetTempPath()) ($item.Name + '.zip')
    Compress-Archive -LiteralPath $item.FullName -DestinationPath $tmp -Force
    $item = Get-Item -LiteralPath $tmp
  }
  $url = "$base/" + [Uri]::EscapeDataString($item.Name)
  try {
    if ($item.Length -le $part) {
      & curl.exe -# --fail-with-body -T $item.FullName $url
      return
    }
    $size = $item.Length; $off = [long]0; $state = ''
    $partFile = [IO.Path]::GetTempFileName()
    $buf = New-Object byte[] 1048576
    try {
      while ($true) {
        $in = [IO.File]::OpenRead($item.FullName); $out = [IO.File]::Create($partFile)
        try {
          $null = $in.Seek($off, 'Begin'); $left = [long]$part
          while ($left -gt 0) {
            $n = $in.Read($buf, 0, [int][Math]::Min([long]$buf.Length, $left))
            if ($n -le 0) { break }
            $out.Write($buf, 0, $n); $left -= $n
          }
        } finally { $in.Dispose(); $out.Dispose() }
        Write-Progress -Activity "transfer $($item.Name)" -PercentComplete ([int]($off * 100 / $size))
        $resp = $null
        for ($try = 1; $try -le 3; $try++) {
          $resp = & curl.exe -sS --fail-with-body -T $partFile -H "X-Total-Size: $size" -H "X-Offset: $off" -H "X-State: $state" $url
          if ($LASTEXITCODE -eq 0) { break }
          Start-Sleep -Seconds 2
        }
        if ($LASTEXITCODE -ne 0) { Write-Error "transfer : échec de l'envoi : $resp"; return }
        $resp = ($resp -join "\`n").Trim()
        if ($resp -like 'next *') { $p = $resp.Split(' '); $off = [long]$p[1]; $state = $p[2] }
        else { Write-Progress -Activity "transfer" -Completed; return $resp }
      }
    } finally { Remove-Item -LiteralPath $partFile -ErrorAction SilentlyContinue }
  } finally { if ($tmp) { Remove-Item -LiteralPath $tmp -ErrorAction SilentlyContinue } }
}
`;
}
