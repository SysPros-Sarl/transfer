// Help page (text + HTML) and the client helper scripts.

const mb = (bytes) => Math.round(bytes / 1048576);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const examples = (b, part) => [
  ["Upload (up to 100 MB)", `curl -T hello.txt ${b}`],
  ["You get back", `https://transfer.it/t/AbCdEfGhIjKl\n${b}/t/AbCdEfGhIjKl/hello.txt\ndelete: curl -X DELETE ${b}/t/AbCdEfGhIjKl/<delete-token>`],
  ["Only 1 download (or /5/ for 5)", `curl -T hello.txt ${b}/1/`],
  ["Upload any size (sent in parts) or a folder", `curl -sL ${b}/sh | sh -s big.iso\ncurl -sL ${b}/1/sh | sh -s big.iso     # 1 download only`],
  ["Download (resumable)",`curl -O ${b}/t/AbCdEfGhIjKl/hello.txt\nwget -c ${b}/t/AbCdEfGhIjKl/hello.txt`],
  ["Pipe something in (up to 100 MB)", `tar cz ./photos | curl -T - ${b}/photos.tar.gz`],
  ["Windows PowerShell, any size", `irm ${b}/ps | iex; transfer big.iso`],
  ["Install the transfer command for good", `curl -sL ${b}/sh > ~/.transfer.sh && echo '. ~/.transfer.sh' >> ~/.bashrc\nirm ${b}/ps | Out-File -Append $PROFILE      # PowerShell\ntransfer big.iso`],
];

export function helpText(b, part) {
  return `transfer: curl uploads to transfer.it

${examples(b, part).map(([t, c]) => `${t}:\n${c.replace(/^/gm, "  ")}`).join("\n\n")}

Single requests are capped at 100 MB by Cloudflare; the helpers split
anything larger into ${mb(part)} MB parts. Files are stored by MEGA's
transfer.it; anyone with the link can download them.
`;
}

export function helpHtml(b, part) {
  const blocks = examples(b, part)
    .map(([t, c]) => `<section><h2>${esc(t)}</h2><pre><code>${esc(c)}</code></pre></section>`)
    .join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>transfer</title>
<style>
:root { --bg:#fbfaf7; --fg:#1d1c1a; --muted:#6b675f; --line:#e4e0d8; --code:#f2efe8; --accent:#c2410c; --ok:#15803d; }
@media (prefers-color-scheme: dark) { :root { --bg:#141413; --fg:#ecebe6; --muted:#9c978c; --line:#2c2b28; --code:#1d1c1a; --accent:#fb923c; --ok:#4ade80; } }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--fg); font:15px/1.55 ui-sans-serif, system-ui, sans-serif; }
main { max-width: 760px; margin: 0 auto; padding: 48px 16px 64px; }
h1 { font: 700 40px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; margin:0 0 8px; letter-spacing:-0.02em; }
h1 span { color: var(--accent); }
.lead { color: var(--muted); margin: 0 0 32px; }
h2 { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin: 28px 0 8px; }
pre { margin:0; background:var(--code); border:1px solid var(--line); border-radius:8px; padding:12px 14px; overflow-x:auto; }
code { font: 13.5px/1.6 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
#drop { margin: 8px 0 8px; border: 2px dashed var(--line); border-radius: 12px; padding: 28px 16px; text-align:center; color: var(--muted); cursor: pointer; transition: border-color .15s, background .15s; }
#drop.over { border-color: var(--accent); background: var(--code); }
#drop input { display:none; }
#jobs { list-style:none; padding:0; margin: 0; }
#jobs li { border:1px solid var(--line); border-radius:8px; padding:10px 12px; margin-top:8px; overflow-wrap:anywhere; }
#jobs .bar { height:4px; background:var(--line); border-radius:2px; margin-top:6px; overflow:hidden; }
#jobs .bar i { display:block; height:100%; width:0; background:var(--accent); transition: width .2s; }
#jobs a { color: var(--accent); }
#jobs button { margin-top: 6px; font: inherit; font-size: 13px; color: var(--fg); background: transparent; border: 1px solid var(--line); border-radius: 6px; padding: 3px 10px; cursor: pointer; }
#jobs button:hover { border-color: var(--accent); }
.opt { display: inline-flex; gap: 6px; align-items: center; color: var(--muted); font-size: 14px; cursor: pointer; user-select: none; }
#jobs .err { color: #dc2626; }
footer { margin-top: 40px; color: var(--muted); font-size: 13px; }
footer a { color: inherit; }
</style>
</head>
<body>
<main>
<h1>transfer<span>.</span></h1>
<p class="lead">curl uploads to <a href="https://transfer.it" style="color:inherit">transfer.it</a>. You get a link back, no account needed.</p>

<div id="drop"><input type="file" id="pick" multiple>Drop files here or click to choose</div>
<label class="opt"><input type="checkbox" id="once"> Only 1 download</label>
<ul id="jobs"></ul>

${blocks}

<footer>Single requests are capped at 100 MB by Cloudflare; the helpers and this page send larger files in ${mb(part)} MB parts.
Files are stored by MEGA's transfer.it and anyone with the link can download them.</footer>
</main>
<script>
const PART = ${part};
const drop = document.getElementById("drop"), pick = document.getElementById("pick"), jobs = document.getElementById("jobs");
drop.onclick = () => pick.click();
pick.onchange = () => { [...pick.files].forEach(send); pick.value = ""; };
drop.ondragover = (e) => { e.preventDefault(); drop.classList.add("over"); };
drop.ondragleave = () => drop.classList.remove("over");
drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove("over"); [...e.dataTransfer.files].forEach(send); };

function put(url, body, headers, onProgress) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open("PUT", url);
    for (const k in headers) if (headers[k] !== "") x.setRequestHeader(k, headers[k]);
    x.upload.onprogress = (e) => onProgress(e.loaded);
    x.onload = () => resolve({ status: x.status, text: x.responseText, del: x.getResponseHeader("x-url-delete") });
    x.onerror = () => reject(new Error("network error"));
    x.send(body);
  });
}

async function send(file) {
  const li = document.createElement("li");
  li.innerHTML = '<div class="name"></div><div class="bar"><i></i></div>';
  li.querySelector(".name").textContent = file.name;
  jobs.prepend(li);
  const bar = li.querySelector("i");
  const once = document.getElementById("once").checked;
  if (once) li.querySelector(".name").textContent += " (1 download)";
  const url = (once ? "/1/" : "/") + encodeURIComponent(file.name);
  let off = 0, state = "";
  try {
    for (;;) {
      let res, tries = 0;
      for (;;) {
        try {
          res = await put(url, file.slice(off, off + PART), { "X-Total-Size": file.size, "X-Offset": off, "X-State": state },
            (n) => { bar.style.width = (file.size ? Math.min(100, (off + n) / file.size * 100) : 100) + "%"; });
          if (res.status < 500 || ++tries >= 3) break;
        } catch (e) { if (++tries >= 3) throw e; }
        await new Promise((r) => setTimeout(r, 2000));
      }
      const t = res.text.trim();
      if (res.status >= 400) throw new Error(t);
      if (t.startsWith("next ")) { const p = t.split(" "); off = +p[1]; state = p[2]; continue; }
      const [share, direct] = t.split("\\n");
      bar.style.width = "100%";
      const out = document.createElement("div");
      out.innerHTML = '<a target="_blank" rel="noopener"></a><br><code></code>';
      out.querySelector("a").href = share; out.querySelector("a").textContent = share;
      out.querySelector("code").textContent = "curl -O " + direct;
      if (res.del) {
        const btn = document.createElement("button");
        btn.textContent = "Delete";
        btn.onclick = async () => {
          if (!confirm("Delete " + file.name + "? The links stop working.")) return;
          const r = await fetch(res.del, { method: "DELETE" });
          if (r.ok) { out.remove(); li.querySelector(".name").textContent = file.name + " (deleted)"; bar.style.width = "0"; }
          else alert(await r.text());
        };
        out.append(document.createElement("br"), btn);
      }
      li.append(out);
      return;
    }
  } catch (e) {
    const err = document.createElement("div");
    err.className = "err"; err.textContent = e.message;
    li.append(err);
  }
}
</script>
</body>
</html>`;
}

export function shScript(b, part) {
  return `# transfer: upload to transfer.it through ${b}
#   curl -sL ${b}/sh | sh -s <file>            # one-off, any size
#   source <(curl -s ${b}/sh)                  # load it in this shell
#   transfer <file|folder>                     # prints the links
#   ... | transfer <name>                      # upload stdin (up to 100 MB)
# Files over ${mb(part)} MB are sent in ${mb(part)} MB parts.

_transfer_enc() { printf %s "$1" | od -An -v -tx1 | tr -d ' \\n' | sed 's/../%&/g'; }

transfer() {
  _tb='${b}'; _tp=${part}
  if [ $# -eq 0 ]; then
    echo "usage: transfer <file|folder>   or   ... | transfer <name>" >&2; return 1
  fi
  if [ ! -e "$1" ]; then
    if [ -t 0 ]; then echo "transfer: $1: no such file" >&2; return 1; fi
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
      printf '\\rtransfer: %s%% ' "$(( _po * 100 / $3 ))" >&2
      _pr=$(tail -c +"$(( _po + 1 ))" "$1" | head -c "$_tp" | curl -sS --fail-with-body -T - \\
        -H "X-Total-Size: $3" -H "X-Offset: $_po" -H "X-State: $_pst" "$_tb/$2") && break
      _try=$(( _try + 1 ))
      if [ $_try -ge 3 ]; then printf '\\n%s\\n' "$_pr" >&2; return 1; fi
      sleep 2
    done
    case $_pr in
      next\\ *) _pr=\${_pr#next }; _po=\${_pr%% *}; _pst=\${_pr#* } ;;
      *) printf '\\rtransfer: 100%%\\n' >&2; printf '%s\\n' "$_pr"; return 0 ;;
    esac
  done
}

# Piped with arguments (curl -sL ${b}/sh | sh -s <file>): run right away.
if [ $# -gt 0 ]; then transfer "$@"; fi
`;
}

export function ps1Script(b, part) {
  return `# transfer: upload to transfer.it through ${b}
#   irm ${b}/transfer.ps1 | iex      # load it in this session
#   transfer <file|folder>            # prints the links
# Files over ${mb(part)} MB are sent in ${mb(part)} MB parts. Needs curl.exe (built into Windows 10+).

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
        if ($LASTEXITCODE -ne 0) { Write-Error "transfer failed: $resp"; return }
        $resp = ($resp -join "\`n").Trim()
        if ($resp -like 'next *') { $p = $resp.Split(' '); $off = [long]$p[1]; $state = $p[2] }
        else { Write-Progress -Activity "transfer" -Completed; return $resp }
      }
    } finally { Remove-Item -LiteralPath $partFile -ErrorAction SilentlyContinue }
  } finally { if ($tmp) { Remove-Item -LiteralPath $tmp -ErrorAction SilentlyContinue } }
}
`;
}
