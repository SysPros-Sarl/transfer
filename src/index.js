import {
  MIB, Api, MegaError, ChunkCrypto, WsUploader, chunkLen, isChunkBoundary, startTransfer, finalize,
  encodeState, decodeState, listTransfer, plainDownloadUrl, transferInfo, a32ToBytes, bytesToA32, b64u, unb64u, concat,
} from "./mega.js";
import { helpText, helpHtml, downloadHtml, shScript, ps1Script, setParallel, PROMO_LINE } from "./pages.js";
import { FAVICON_SVG } from "./favicon.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const base = url.origin;
    const partBytes = Math.max(1, Number(env.PART_MB) || 90) * MIB;
    setParallel(Number(env.PARALLEL) || 4);
    const path = url.pathname;
    try {
      if (request.method === "PUT" || request.method === "POST") {
        return await upload(request, base, path, partBytes);
      }
      if (request.method === "DELETE") {
        const d = path.match(/^\/(?:t\/)?([A-Za-z0-9_-]{12})\/([A-Za-z0-9_-]{20,})$/);
        if (!d) return text(`usage : curl -X DELETE ${base}/t/<id>/<jeton>\n`, 400);
        await new Api(d[2]).req({ a: "xd", xh: d[1] });
        return text("supprimé\n");
      }
      if (request.method !== "GET" && request.method !== "HEAD") return text("méthode non autorisée\n", 405);

      // /sh, /ps, and /<n>/sh, /<n>/ps for helpers that upload with a download limit
      const s = path.match(/^(?:\/(\d{1,6}))?\/(sh|ps|transfer\.sh|transfer\.ps1)$/);
      if (s) {
        const upBase = s[1] ? `${base}/${s[1]}` : base;
        return text(s[2].startsWith("ps") || s[2].endsWith("ps1") ? ps1Script(upBase, partBytes) : shScript(upBase, partBytes));
      }
      if (/^\/(\d{1,6}\/?)?$/.test(path)) {
        return wantsHtml(request)
          ? new Response(helpHtml(base, partBytes), { headers: { "content-type": "text/html; charset=utf-8" } })
          : text(helpText(base, partBytes));
      }
      if (path === "/favicon.svg") {
        return new Response(FAVICON_SVG, { headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=86400" } });
      }
      if (path === "/favicon.ico") return Response.redirect(`${base}/favicon.svg`, 301);

      const m = path.match(/^\/(?:t\/)?([A-Za-z0-9_-]{12})(?:\/(.*))?$/);
      if (m) return await download(request, base, m[1], m[2] ? safeDecode(m[2]) : "", url.searchParams.has("dl"));
      return text("introuvable\n", 404);
    } catch (e) {
      console.error(e);
      if (e instanceof MegaError && e.code === -19) return text("plus aucun téléchargement disponible pour ce transfert\n", 410);
      if (e instanceof MegaError && [-9, -11, -15, -16].includes(e.code)) {
        return text("transfert introuvable : supprimé, expiré ou jeton incorrect\n", 404);
      }
      return text(`erreur : ${e.message}\n`, 502);
    }
  },
};

// ---------------------------------------------------------------- helpers

function text(body, status = 200, headers = {}) {
  return new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8", ...headers } });
}
const wantsHtml = (req) => (req.headers.get("accept") || "").includes("text/html");
function safeDecode(s) { try { return decodeURIComponent(s); } catch { return s; } }
const encName = (n) => encodeURIComponent(n).replace(/%2F/g, "/");

const deleteUrl = (base, st) => `${base}/t/${st.x}/${st.s}`;
function links(base, st, name) {
  // 1re ligne : la page de téléchargement SysPros ; 2e : le lien direct (curl -O, wget).
  return `${base}/t/${st.x}\n${base}/t/${st.x}/${encName(name)}\nsupprimer : curl -X DELETE ${deleteUrl(base, st)}\n\n${PROMO_LINE}\n`;
}

// Link-preview bots (chat apps) must not use up a limited download.
const isBot = (req) => /bot|preview|facebookexternalhit|whatsapp|slack|discord|telegram|skype|vkshare|embedly/i
  .test(req.headers.get("user-agent") || "");

// Reads exact-size slices from a request body stream.
class ExactReader {
  constructor(stream) {
    this.r = stream ? stream.getReader() : null;
    this.buf = new Uint8Array(0);
    this.done = !stream;
  }
  async read(n) {
    const out = new Uint8Array(n);
    let filled = 0;
    while (filled < n) {
      if (!this.buf.length) {
        if (this.done) break;
        const { value, done } = await this.r.read();
        if (done) { this.done = true; break; }
        this.buf = value;
        continue;
      }
      const take = Math.min(n - filled, this.buf.length);
      out.set(this.buf.subarray(0, take), filled);
      filled += take;
      this.buf = this.buf.subarray(take);
    }
    return filled === n ? out : out.subarray(0, filled);
  }
  async drain() {
    while (!this.done) { const { done } = await this.r.read(); if (done) this.done = true; }
  }
}

// ---------------------------------------------------------------- upload
//
// Single request:  curl -T file https://host/        (body up to 100 MB)
//
// Parts (files over 100 MB), sent several at a time by the /sh and /ps
// helpers and the web page:
//   1. start   PUT /[n/]name  X-Total-Size            → "init <state> <part size>"
//   2. parts   PUT /[n/]name  X-Total-Size X-State X-Offset + bytes, in any order
//              and in parallel → "part <offset> <end> <chunk MACs> [<token>]"
//              Part i covers [start(i), start(i+1)) with start(0) = 0 and
//              start(i) = i × part size + 512 KiB: always MEGA chunk boundaries.
//   3. finish  PUT /[n/]name  X-Total-Size X-State X-Finalize, body = all "part"
//              replies → the links. MEGA's file MAC folds the chunk MACs in file
//              order, which only the finish step can do once every part is in.
// The Worker keeps nothing between requests: the state token carries the session.

async function upload(request, base, path, partBytes) {
  // PUT /name, or PUT /<n>/name to allow only n downloads (PUT /<n> alone works
  // too, but curl then can't add the filename, so it's called "file").
  const segs = path.split("/").filter(Boolean).map(safeDecode);
  const maxDl = segs.length && /^\d{1,6}$/.test(segs[0]) ? Number(segs.shift()) || null : null;
  const name = segs.pop() || "file";
  const h = (k) => request.headers.get(k);

  if (h("x-total-size") === null) return uploadWhole(request, base, name, maxDl);
  const total = Number(h("x-total-size"));
  if (!Number.isSafeInteger(total) || total < 0) return text("X-Total-Size invalide\n", 400);

  if (!h("x-state")) {
    const st = await startTransfer(name, total);
    await request.body?.cancel();
    return text(`init ${encodeState(st)} ${partBytes}\n`);
  }
  const st = decodeState(h("x-state"));
  if (h("x-finalize") !== null) return finishParts(request, base, name, maxDl, st, total);
  const offset = Number(h("x-offset"));
  if (!Number.isSafeInteger(offset) || offset < 0 || offset >= total || !isChunkBoundary(offset)) {
    return text("X-Offset invalide : une partie doit commencer sur une limite de morceau MEGA\n", 400);
  }
  if (h("x-progress") === null) {
    try { return text(await uploadPart(new ExactReader(request.body), st, total, offset)); }
    catch (e) { return text(`${e.message}\n`, e.status || 502); }
  }
  // X-Progress : la réponse part tout de suite et donne chaque seconde les octets que MEGA a
  // confirmés pour cette partie (« ack <octets> »), puis la ligne « part … » ou « erreur … ».
  // Cloudflare reçoit la partie bien plus vite que MEGA ne l'accepte : sans cela, le client
  // ne voit que ce qui est parti vers Cloudflare.
  const body = new ExactReader(request.body); // avant de répondre : sinon le runtime verrouille le corps
  const { readable, writable } = new TransformStream();
  const out = writable.getWriter(), enc = new TextEncoder();
  const say = (s) => out.write(enc.encode(s)).catch(() => {});
  (async () => {
    try { await say(await uploadPart(body, st, total, offset, (n) => say(`ack ${n}\n`))); }
    catch (e) { await say(`erreur ${e.message}\n`); }
    finally { await out.close().catch(() => {}); }
  })();
  return new Response(readable, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store, no-transform" } });
}

// One request with the whole file (plain curl -T, or a pipe of unknown size).
async function uploadWhole(request, base, name, maxDl) {
  const len = request.headers.get("content-length");
  const st = await startTransfer(name, len !== null ? Number(len) : null);
  const cc = await ChunkCrypto.create(st.k);
  const ws = new WsUploader(st.h, st.u);
  await ws.connect();
  const body = new ExactReader(request.body);
  let pos = 0;
  let lastWasFull = true; // nothing sent yet counts as "at a boundary"
  try {
    for (;;) {
      const want = chunkLen(pos);
      const data = await body.read(want);
      if (data.length === 0) break;
      const { ct, mac } = await cc.encrypt(pos, data);
      await ws.send(pos, ct);
      st.m = await cc.fold(st.m, mac);
      pos += data.length;
      lastWasFull = data.length === want;
      if (!lastWasFull) break;
    }
    if (lastWasFull) {
      // Size sits on a chunk boundary: an empty chunk tells the server it's
      // done. Like MEGA's web uploader, it does not count towards the MAC
      // (their downloader verifies the MAC over real chunks only).
      await ws.send(pos, new Uint8Array(0));
    }
    const token = await ws.finish();
    await finalize(st, name, token, maxDl);
    return text(links(base, st, name), 200, { "x-url-delete": deleteUrl(base, st) });
  } finally {
    ws.close();
  }
}

// Sends one part; returns its "part …" line. onAck(bytes) is called about once a second with
// the bytes of this part that MEGA has confirmed.
async function uploadPart(body, st, total, offset, onAck) {
  const bad = (msg) => Object.assign(new Error(msg), { status: 400 });
  const cc = await ChunkCrypto.create(st.k);
  const ws = new WsUploader(st.h, st.u);
  await ws.connect();
  const macs = [];
  let pos = offset;
  let lastWasFull = true;
  const acked = () => { let n = pos - offset; for (const c of ws.pending.values()) n -= c.ct.length; return Math.max(0, n); };
  const timer = onAck ? setInterval(() => onAck(acked()), 1000) : null;
  try {
    while (pos < total) {
      const want = Math.min(chunkLen(pos), total - pos);
      const data = await body.read(want);
      if (data.length === 0) break;
      if (data.length < want) {
        await body.drain();
        throw bad(`partie mal alignée : elle doit finir sur une limite de morceau ou à la fin du fichier (finit à ${pos + data.length})`);
      }
      const { ct, mac } = await cc.encrypt(pos, data);
      await ws.send(pos, ct);
      macs.push(a32ToBytes(mac));
      pos += want;
      lastWasFull = want === chunkLen(pos - want);
    }
    await body.drain();
    if (pos === offset) throw bad("partie vide");
    // Last part of a file that ends on a chunk boundary: the empty end chunk.
    if (pos === total && lastWasFull) await ws.send(pos, new Uint8Array(0));
    await ws.drain();
    // If this connection delivered the piece that completed the file, MEGA sends
    // the completion token on it right after.
    const token = ws.sawFinal || ws.token ? await ws.finish(30_000) : null;
    return `part ${offset} ${pos} ${b64u(concat(...macs))}${token ? ` ${b64u(token)}` : ""}\n`;
  } finally {
    if (timer) clearInterval(timer);
    ws.close();
  }
}

async function finishParts(request, base, name, maxDl, st, total) {
  const parts = [];
  let token = null;
  for (const line of (await request.text()).split(/\r?\n/)) {
    const p = line.trim().split(/\s+/);
    if (p[0] !== "part" || p.length < 4) continue;
    parts.push({ start: Number(p[1]), end: Number(p[2]), macs: unb64u(p[3]) });
    if (p[4]) token = unb64u(p[4]);
  }
  parts.sort((a, b) => a.start - b.start);
  let covered = 0;
  for (const p of parts) {
    if (p.start > covered) return text(`partie manquante : octets ${covered} à ${p.start}\n`, 400);
    covered = Math.max(covered, p.end);
  }
  if (covered !== total) return text(`partie manquante : octets ${covered} à ${total}\n`, 400);
  if (!token) return text("jeton de fin manquant : renvoyez la dernière partie\n", 409);

  // File MAC: fold every chunk MAC in file order (a part sent twice counts once).
  const cc = await ChunkCrypto.create(st.k);
  let acc = [0, 0, 0, 0];
  let at = 0;
  for (const p of parts) {
    if (p.end <= at) continue;
    if (p.start !== at) return text("parties qui se chevauchent\n", 400);
    for (let i = 0; i < p.macs.length; i += 16) acc = await cc.fold(acc, bytesToA32(p.macs.subarray(i, i + 16)));
    at = p.end;
  }
  st.m = acc;
  await finalize(st, name, token, maxDl);
  return text(links(base, st, name), 200, { "x-url-delete": deleteUrl(base, st) });
}

// ---------------------------------------------------------------- download

async function download(request, base, xh, wanted, forceFile = false) {
  // /t/<id> in a browser, or fetched by a link-preview bot: the SysPros download page.
  // It only uses 'xi', which does not count against the download limit.
  if (!wanted && !forceFile && (wantsHtml(request) || isBot(request))) {
    const html = { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" };
    if (request.method === "HEAD") return new Response(null, { headers: html });
    let info = null, status = 200;
    try { info = await transferInfo(xh); }
    catch (e) {
      if (!(e instanceof MegaError)) throw e;
      status = e.code === -19 ? 410 : 404;
    }
    return new Response(downloadHtml(base, xh, info), { status, headers: html });
  }
  // Every listing of a transfer ('f') counts against its download limit, so HEAD
  // requests and link-preview bots must not reach it.
  if (request.method === "HEAD" || isBot(request)) {
    const h = { "accept-ranges": "bytes", "content-type": wanted ? "application/octet-stream" : "text/plain" };
    if (wanted) h["content-disposition"] = `attachment; filename*=UTF-8''${encodeURIComponent(wanted)}`;
    return new Response(request.method === "HEAD" ? null : `${wanted || "fichiers"} partagés via transfer.syspros.ch\n`, { headers: h });
  }
  const { api, files } = await listTransfer(xh);
  if (!files.length) return text("transfert vide ou supprimé\n", 404);

  let file = wanted ? files.find((f) => f.name === wanted) : files.length === 1 ? files[0] : null;
  if (!file) {
    const list = files.map((f) => `${f.name}\t${f.size}\t${base}/t/${xh}/${encName(f.name)}`).join("\n");
    return text(`${wanted ? `aucun fichier nommé « ${wanted} ». ` : ""}fichiers de ce transfert :\n${list}\n`, wanted ? 404 : 300);
  }

  const headers = {
    "content-type": "application/octet-stream",
    "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    "accept-ranges": "bytes",
  };
  if (file.size === 0) return new Response("", { headers });

  // MEGA decrypts server-side, so the Worker just streams the bytes through.
  const src = await plainDownloadUrl(api, xh, file);
  const range = request.headers.get("range");
  const up = await fetch(src, range ? { headers: { range } } : {});
  if (!up.ok) return text(`le serveur de stockage a répondu HTTP ${up.status}\n`, up.status === 416 ? 416 : 502);
  for (const h of ["content-length", "content-range"]) {
    const v = up.headers.get(h);
    if (v) headers[h] = v;
  }
  return new Response(up.body, { status: up.status, headers });
}
