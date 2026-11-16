// MEGA / transfer.it protocol: API calls, crypto and the WebSocket uploader.
// Protocol reference: https://github.com/viperadnan-git/transferit-py
// (docs/REVERSE_ENGINEERING.md).

import { crc32 } from "node:zlib";

const API = "https://bt7.api.mega.co.nz/cs";
export const MIB = 1048576;
const WINDOW = 8; // chunks in flight per WebSocket
const ACK_TIMEOUT = 60_000;
const subtle = crypto.subtle;
const te = new TextEncoder();
const td = new TextDecoder();
const ZERO16 = new Uint8Array(16);

// ---------------------------------------------------------------- bytes

export function concat(...parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

export function b64u(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function unb64u(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/").replace(/[^A-Za-z0-9+/]/g, "");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function a32ToBytes(a) {
  const b = new Uint8Array(a.length * 4);
  const v = new DataView(b.buffer);
  a.forEach((x, i) => v.setUint32(i * 4, x >>> 0));
  return b;
}

export function bytesToA32(b) {
  const p = new Uint8Array(Math.ceil(b.length / 4) * 4);
  p.set(b);
  const v = new DataView(p.buffer);
  return Array.from({ length: p.length / 4 }, (_, i) => v.getUint32(i * 4));
}

const randA32 = (n) => Array.from(crypto.getRandomValues(new Uint32Array(n)));
const xorA32 = (a, b) => a.map((x, i) => (x ^ b[i]) >>> 0);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- AES helpers
// WebCrypto has no ECB, and its CBC always uses PKCS#7 padding, so:
//  - ECB(block) = first block of CBC(block, iv=0)
//  - MEGA's zero-padded CBC = CBC output with the PKCS#7 block cut off

const importKey = (raw, alg) => subtle.importKey("raw", raw, { name: alg }, false, ["encrypt", "decrypt"]);

async function ecb(cbcKey, block) {
  const out = await subtle.encrypt({ name: "AES-CBC", iv: ZERO16 }, cbcKey, block);
  return new Uint8Array(out, 0, 16);
}

async function encryptKeyEcb(rawKey, a32) {
  const k = await importKey(rawKey, "AES-CBC");
  const out = [];
  for (let i = 0; i < a32.length; i += 4) {
    out.push(...bytesToA32(await ecb(k, a32ToBytes(a32.slice(i, i + 4)))));
  }
  return out;
}

function attrKey(k) {
  const x = [...k, 0, 0, 0, 0, 0, 0, 0, 0];
  return a32ToBytes([x[0] ^ x[4], x[1] ^ x[5], x[2] ^ x[6], x[3] ^ x[7]]);
}

const zeroPad16 = (b) => (b.length % 16 ? concat(b, new Uint8Array(16 - (b.length % 16))) : b);

async function encryptAttr(obj, keyA32) {
  const raw = zeroPad16(te.encode("MEGA" + JSON.stringify(obj)));
  const k = await importKey(attrKey(keyA32), "AES-CBC");
  const ct = await subtle.encrypt({ name: "AES-CBC", iv: ZERO16 }, k, raw);
  return new Uint8Array(ct, 0, raw.length);
}

export async function decryptAttr(b64, keyA32) {
  try {
    const ct = zeroPad16(unb64u(b64));
    const k = await importKey(attrKey(keyA32), "AES-CBC");
    // Append a block that decrypts to a full PKCS#7 pad so WebCrypto accepts
    // MEGA's zero-padded ciphertext: X = E(C_last ^ 0x10..)
    const pad = new Uint8Array(16).fill(16);
    const last = ct.subarray(ct.length - 16);
    const x = await ecb(k, last.map((b, i) => b ^ pad[i]));
    const pt = new Uint8Array(await subtle.decrypt({ name: "AES-CBC", iv: ZERO16 }, k, concat(ct, x)));
    const s = td.decode(pt);
    if (!s.startsWith("MEGA{")) return null;
    return JSON.parse(s.slice(4, s.lastIndexOf("}") + 1));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- API

export class MegaError extends Error {
  constructor(code) {
    const names = { "-2": "bad arguments", "-3": "try again", "-4": "rate limited", "-9": "not found",
      "-11": "access denied", "-14": "password required", "-15": "invalid session", "-16": "blocked", "-17": "over quota" };
    super(`MEGA API error ${code}${names[code] ? ` (${names[code]})` : ""}`);
    this.code = code;
  }
}

export class Api {
  constructor(sid = null) {
    this.sid = sid;
    this.seq = Math.floor(Math.random() * 1e9);
  }

  async req(cmd, { x } = {}) {
    const u = new URL(API);
    u.searchParams.set("id", String(++this.seq));
    if (x) u.searchParams.set("x", x);
    else if (this.sid) u.searchParams.set("sid", this.sid);
    for (let attempt = 0; ; attempt++) {
      const r = await fetch(u, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify([cmd]),
      });
      if (!r.ok) throw new Error(`MEGA API HTTP ${r.status}`);
      const d = await r.json();
      const code = typeof d === "number" ? d
        : Array.isArray(d) && d.length === 1 && typeof d[0] === "number" ? d[0] : null;
      if (code !== null && code < 0) {
        if (code === -3 && attempt < 4) { await sleep(1000 * (attempt + 1)); continue; }
        throw new MegaError(code);
      }
      return d[0];
    }
  }

  // Anonymous throwaway account, like the transfer.it web page creates.
  async ephemeral() {
    const master = randA32(4), pw = randA32(4), ssc = randA32(4);
    const k = await encryptKeyEcb(a32ToBytes(pw), master);
    const sscEnc = await encryptKeyEcb(a32ToBytes(master), ssc);
    const user = await this.req({ a: "up", k: b64u(a32ToBytes(k)), ts: b64u(concat(a32ToBytes(ssc), a32ToBytes(sscEnc))) });
    if (typeof user !== "string") throw new Error("unexpected reply to 'up'");
    const res = await this.req({ a: "us", user });
    const tsid = unb64u(res.tsid);
    const check = await encryptKeyEcb(a32ToBytes(master), bytesToA32(tsid.subarray(0, 16)));
    if (b64u(a32ToBytes(check)) !== b64u(tsid.subarray(tsid.length - 16))) throw new Error("session check failed");
    this.sid = res.tsid;
  }
}

// ---------------------------------------------------------------- upload

// MEGA chunk layout: 128K, 256K, ... 1M, then 1M forever.
export function chunkLen(pos) {
  for (let p = 0, d = 0; d < MIB;) { d += 131072; if (p === pos) return d; p += d; }
  return MIB;
}
export function isChunkBoundary(pos) {
  if (pos >= 4.5 * MIB) return (pos - 4.5 * MIB) % MIB === 0;
  for (let p = 0, d = 0; d < MIB;) { if (p === pos) return true; d += 131072; p += d; }
  return false;
}

// Creates the session + transfer container. Everything needed to continue is
// kept in a small state object that round-trips through the client.
export async function startTransfer(title, size) {
  const api = new Api();
  await api.ephemeral();
  const fk = randA32(4);
  const at = b64u(await encryptAttr({ name: title, mtime: Math.floor(Date.now() / 1000) }, fk));
  const [xh, root] = await api.req({ a: "xn", at, k: b64u(a32ToBytes(fk)) });
  const pools = await api.req({ a: "usc" });
  const pool = pools.find((p) => p.length >= 2 && (!p[2] || (size != null && size <= p[2])));
  if (!pool) throw new Error("no upload server available");
  return { s: api.sid, x: xh, r: root, h: pool[0], u: pool[1], k: randA32(6), m: [0, 0, 0, 0], o: 0 };
}

export const encodeState = (st) => b64u(te.encode(JSON.stringify(st)));
export function decodeState(s) {
  const st = JSON.parse(td.decode(unb64u(s)));
  if (!st || !st.s || !Array.isArray(st.k) || !Array.isArray(st.m)) throw new Error("bad state");
  // The state comes back from the client: only ever connect to MEGA's upload
  // servers, so it can't turn the Worker into a WebSocket proxy.
  if (!/^[a-z0-9-]+\.userstorage\.mega\.co\.nz$/.test(st.h) || !/^[A-Za-z0-9_/-]+$/.test(st.u)) {
    throw new Error("bad state");
  }
  return st;
}

export class ChunkCrypto {
  static async create(ulKey) {
    const c = new ChunkCrypto();
    const raw = a32ToBytes(ulKey.slice(0, 4));
    c.ctrKey = await importKey(raw, "AES-CTR");
    c.cbcKey = await importKey(raw, "AES-CBC");
    c.nonce = a32ToBytes(ulKey.slice(4, 6));
    c.macIv = concat(c.nonce, c.nonce);
    return c;
  }

  // AES-128-CTR (counter = byte offset / 16) + CBC-MAC of the plaintext.
  async encrypt(pos, data) {
    const counter = new Uint8Array(16);
    counter.set(this.nonce);
    new DataView(counter.buffer).setBigUint64(8, BigInt(pos / 16));
    const ct = new Uint8Array(await subtle.encrypt({ name: "AES-CTR", counter, length: 64 }, this.ctrKey, data));
    let mac = this.macIv;
    if (data.length) {
      const padded = zeroPad16(data);
      const out = new Uint8Array(await subtle.encrypt({ name: "AES-CBC", iv: this.macIv }, this.cbcKey, padded));
      mac = out.subarray(padded.length - 16, padded.length);
    }
    return { ct, mac: bytesToA32(mac) };
  }

  // Running "condensed" MAC: acc = E(acc ^ chunkMac), in offset order.
  async fold(acc, mac) {
    return bytesToA32(await ecb(this.cbcKey, a32ToBytes(xorA32(acc, mac))));
  }
}

function wsHeader(pos, ct) {
  const h = new Uint8Array(20);
  const v = new DataView(h.buffer);
  v.setUint32(0, 1, true); // fileno: one file per session
  v.setBigUint64(4, BigInt(pos), true);
  v.setUint32(12, ct.length, true);
  v.setUint32(16, crc32(ct, crc32(h.subarray(0, 16))) >>> 0, true);
  return h;
}

export class WsUploader {
  constructor(host, uri) {
    this.url = `https://${host}/${uri}`;
    this.pending = new Map(); // pos -> {hdr, ct, t}
    this.waiters = [];
    this.token = null;
    this.err = null;
    this.ws = null;
    this.last = null;
    this.reconnects = 0;
    this.pauseUntil = 0;
  }

  async connect() {
    const r = await fetch(this.url, { headers: { Upgrade: "websocket" } });
    const ws = r.webSocket;
    if (!ws) throw new Error(`upload server refused the WebSocket (HTTP ${r.status})`);
    ws.accept();
    const drop = () => { if (this.ws === ws) { this.ws = null; this.wake(); } };
    ws.addEventListener("message", (e) => this.onMessage(e.data));
    ws.addEventListener("close", drop);
    ws.addEventListener("error", drop);
    this.ws = ws;
    // After a reconnect: replay everything not yet acknowledged.
    const replay = [...this.pending.entries()].sort((a, b) => a[0] - b[0]);
    if (!replay.length && this.last && !this.token) replay.push([0, this.last]);
    for (const [, c] of replay) this.rawSend(c);
  }

  rawSend(c) {
    c.t = Date.now();
    this.ws.send(c.hdr);
    if (c.ct.length) this.ws.send(c.ct);
  }

  wake() {
    const w = this.waiters;
    this.waiters = [];
    for (const f of w) f();
  }

  onMessage(data) {
    if (typeof data === "string") return;
    const b = new Uint8Array(data);
    if (b.length < 17) return;
    const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
    if ((crc32(b.subarray(0, b.length - 4)) >>> 0) !== v.getUint32(b.length - 4, true)) {
      this.err = new Error("corrupt message from upload server");
    } else {
      const pos = Number(v.getBigUint64(4, true));
      const type = v.getInt8(12);
      if (type < 0) this.err = new Error(`upload server error ${type}`);
      else if (type === 1 || type === 2 || type === 7) this.pending.delete(pos);
      else if (type === 3) { const c = this.pending.get(pos); if (c && this.ws) this.rawSend(c); }
      else if (type === 4) { this.token = b.slice(14, 14 + b[13]); this.pending.clear(); }
      else if (type === 5) { try { this.ws?.close(1000); } catch {} this.ws = null; }
      else if (type === 6) this.pauseUntil = Date.now() + pos;
    }
    this.wake();
  }

  async waitFor(cond) {
    for (;;) {
      if (this.err) throw this.err;
      if (cond()) return;
      if (!this.ws) {
        if (++this.reconnects > 5) throw new Error("upload connection kept dropping");
        await sleep(2000);
        await this.connect();
        continue;
      }
      const now = Date.now();
      for (const c of this.pending.values()) {
        if (now - c.t > ACK_TIMEOUT) { try { this.ws.close(1000); } catch {} this.ws = null; break; }
      }
      await new Promise((r) => { this.waiters.push(r); setTimeout(r, 1000); });
    }
  }

  async send(pos, ct) {
    await this.waitFor(() => this.ws && this.pending.size < WINDOW && Date.now() >= this.pauseUntil);
    const c = { hdr: wsHeader(pos, ct), ct, t: 0 };
    this.pending.set(pos, c);
    this.last = c;
    this.rawSend(c);
  }

  drain() { return this.waitFor(() => this.pending.size === 0); }
  async finish() { await this.waitFor(() => this.token); return this.token; }
  close() { try { this.ws?.close(1000); } catch {} }
}

// Attach the uploaded file to the transfer and close it.
export async function finalize(st, name, token, maxDownloads = null) {
  const api = new Api(st.s);
  const k = st.k, m = st.m;
  const filekey = [k[0] ^ k[4], k[1] ^ k[5], k[2] ^ m[0] ^ m[1], k[3] ^ m[2] ^ m[3], k[4], k[5], m[0] ^ m[1], m[2] ^ m[3]].map((x) => x >>> 0);
  const at = b64u(await encryptAttr({ n: name }, filekey));
  await api.req({ a: "xp", t: st.r, n: [{ t: 0, h: b64u(token), a: at, k: b64u(a32ToBytes(filekey)) }] });
  // mc counts listings of the transfer ('f'), not download URLs ('g'), and the
  // transfer locks as soon as the mc-th listing happens, so the 'g' right after
  // it already fails. A download is one 'f' + one 'g' (in the Worker and on the
  // transfer.it page), so n downloads need mc = n + 1. Measured 2026-11-16.
  if (maxDownloads) await api.req({ a: "xm", xh: st.x, mc: maxDownloads + 1 });
  await api.req({ a: "xc", xh: st.x });
}

// ---------------------------------------------------------------- download

export async function listTransfer(xh) {
  const api = new Api();
  const res = await api.req({ a: "f", c: 1, r: 1 }, { x: xh });
  const files = [];
  for (const n of res.f || []) {
    if (n.t !== 0) continue;
    const key = bytesToA32(unb64u(n.k));
    const attr = await decryptAttr(n.a, key);
    files.push({ h: n.h, name: attr?.n || n.h, size: n.s, key });
  }
  return { api, files };
}

// pt:1 (what transfer.it's own page asks for) makes MEGA's storage server
// return the decrypted file, with Range support, at <g>/<name>.
export async function plainDownloadUrl(api, xh, file) {
  const g = await api.req({ a: "g", n: file.h, pt: 1, g: 1, ssl: 1 }, { x: xh });
  if (!g || !g.g) throw new Error("no download URL from MEGA");
  return `${g.g}/${encodeURIComponent(file.name)}`;
}
