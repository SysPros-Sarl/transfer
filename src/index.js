import {
  MIB, Api, MegaError, ChunkCrypto, WsUploader, chunkLen, isChunkBoundary, startTransfer, finalize,
  encodeState, decodeState, listTransfer, plainDownloadUrl,
} from "./mega.js";
import { helpText, helpHtml, shScript, ps1Script } from "./pages.js";

const SHARE = "https://transfer.it/t/";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const base = url.origin;
    const partBytes = Math.max(1, Number(env.PART_MB) || 90) * MIB;
    const path = url.pathname;
    try {
      if (request.method === "PUT" || request.method === "POST") {
        return await upload(request, base, path);
      }
      if (request.method === "DELETE") {
        const d = path.match(/^\/(?:t\/)?([A-Za-z0-9_-]{12})\/([A-Za-z0-9_-]{20,})$/);
        if (!d) return text(`usage: curl -X DELETE ${base}/t/<id>/<delete-token>\n`, 400);
        await new Api(d[2]).req({ a: "xd", xh: d[1] });
        return text("deleted\n");
      }
      if (request.method !== "GET" && request.method !== "HEAD") return text("method not allowed\n", 405);

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
      if (path === "/favicon.ico") return new Response(null, { status: 204 });

      const m = path.match(/^\/(?:t\/)?([A-Za-z0-9_-]{12})(?:\/(.*))?$/);
      if (m) return await download(request, base, m[1], m[2] ? safeDecode(m[2]) : "");
      return text("not found\n", 404);
    } catch (e) {
      console.error(e);
      if (e instanceof MegaError && e.code === -19) return text("no downloads left on this transfer\n", 410);
      if (e instanceof MegaError && [-9, -11, -15, -16].includes(e.code)) {
        return text("transfer not found: deleted, expired, or wrong token\n", 404);
      }
      return text(`error: ${e.message}\n`, 502);
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
  return `${SHARE}${st.x}\n${base}/t/${st.x}/${encName(name)}\ndelete: curl -X DELETE ${deleteUrl(base, st)}\n`;
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
// Multipart:       PUT /name  with X-Total-Size, X-Offset and X-State (after
//                  the first part). Each part may be any size >= 1 MiB; the
//                  reply is "next <offset> <state>" until the last part,
//                  whose reply is the links. A part's trailing partial MEGA
//                  chunk is dropped, and the client resends it from <offset>.

async function upload(request, base, path) {
  // PUT /name, or PUT /<n>/name to allow only n downloads (PUT /<n> alone works
  // too, but curl then can't add the filename, so it's called "file").
  const segs = path.split("/").filter(Boolean).map(safeDecode);
  const maxDl = segs.length && /^\d{1,6}$/.test(segs[0]) ? Number(segs.shift()) || null : null;
  const name = segs.pop() || "file";
  const h = (k) => request.headers.get(k);
  const multipart = h("x-total-size") !== null;
  const total = multipart ? Number(h("x-total-size")) : h("content-length") !== null ? Number(h("content-length")) : null;
  const offset = multipart ? Number(h("x-offset") || 0) : 0;
  if (multipart && (!Number.isSafeInteger(total) || total < 0 || !Number.isSafeInteger(offset) || offset > total || !isChunkBoundary(offset))) {
    return text("bad X-Total-Size / X-Offset\n", 400);
  }

  let st;
  if (multipart && h("x-state")) {
    st = decodeState(h("x-state"));
    if (st.o !== offset) return text(`expected X-Offset ${st.o}, got ${offset}\n`, 409);
  } else {
    if (offset !== 0) return text("X-State is required after the first part\n", 400);
    st = await startTransfer(name, total);
  }

  const cc = await ChunkCrypto.create(st.k);
  const ws = new WsUploader(st.h, st.u);
  await ws.connect();
  const body = new ExactReader(request.body);
  let pos = offset;
  let lastWasFull = true; // nothing sent yet counts as "at a boundary"
  let final = false;

  try {
    for (;;) {
      let want = chunkLen(pos);
      if (multipart && pos + want > total) want = total - pos;
      const data = want > 0 ? await body.read(want) : new Uint8Array(0);

      if (data.length === 0) { final = !multipart || pos === total; break; }
      if (data.length < want) {
        // Short read. In a part that isn't the last one, it's the leftover of
        // a chunk the client will resend in the next part.
        if (multipart) break;
        final = true;
      }
      const { ct, mac } = await cc.encrypt(pos, data);
      await ws.send(pos, ct);
      st.m = await cc.fold(st.m, mac);
      pos += data.length;
      lastWasFull = data.length === chunkLen(pos - data.length);
      if (final) break;
      if (multipart && pos === total) { final = true; break; }
    }
    await body.drain();

    if (!final) {
      await ws.drain();
      st.o = pos;
      return text(`next ${pos} ${encodeState(st)}\n`, 202);
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

// ---------------------------------------------------------------- download

async function download(request, base, xh, wanted) {
  // Every listing of a transfer counts against its download limit, so HEAD
  // requests and link-preview bots must not touch MEGA at all.
  if (request.method === "HEAD" || isBot(request)) {
    const h = { "accept-ranges": "bytes", "content-type": wanted ? "application/octet-stream" : "text/plain" };
    if (wanted) h["content-disposition"] = `attachment; filename*=UTF-8''${encodeURIComponent(wanted)}`;
    return new Response(request.method === "HEAD" ? null : `${wanted || "files"} shared with transfer\n`, { headers: h });
  }
  if (!wanted && wantsHtml(request)) return Response.redirect(SHARE + xh, 302);
  const { api, files } = await listTransfer(xh);
  if (!files.length) return text("transfer is empty or gone\n", 404);

  let file = wanted ? files.find((f) => f.name === wanted) : files.length === 1 ? files[0] : null;
  if (!file) {
    const list = files.map((f) => `${f.name}\t${f.size}\t${base}/t/${xh}/${encName(f.name)}`).join("\n");
    return text(`${wanted ? `no file named "${wanted}". ` : ""}files in this transfer:\n${list}\n`, wanted ? 404 : 300);
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
  if (!up.ok) return text(`storage server returned HTTP ${up.status}\n`, up.status === 416 ? 416 : 502);
  for (const h of ["content-length", "content-range"]) {
    const v = up.headers.get(h);
    if (v) headers[h] = v;
  }
  return new Response(up.body, { status: up.status, headers });
}
