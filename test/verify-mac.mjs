// Checks a transfer the way transfer.it's own downloader does (verifyIntegrity):
// recompute the MEGA MAC of a local file and compare it with the file key.
//   node test/verify-mac.mjs <local-file> <transfer.it link or 12-char id>
import { readFileSync } from "node:fs";
import { listTransfer, ChunkCrypto, chunkLen } from "../src/mega.js";

const [file, link] = process.argv.slice(2);
const xh = link.match(/([A-Za-z0-9_-]{12})\/?$/)[1];
const data = new Uint8Array(readFileSync(file));
const { files } = await listTransfer(xh);
const k = files[0].key;
const cc = await ChunkCrypto.create([k[0] ^ k[4], k[1] ^ k[5], k[2] ^ k[6], k[3] ^ k[7], k[4], k[5]]);

let acc = [0, 0, 0, 0];
for (let pos = 0; pos < data.length;) {
  const len = Math.min(chunkLen(pos), data.length - pos);
  acc = await cc.fold(acc, (await cc.encrypt(pos, data.subarray(pos, pos + len))).mac);
  pos += len;
}
const ok = ((acc[0] ^ acc[1]) >>> 0) === k[6] && ((acc[2] ^ acc[3]) >>> 0) === k[7];
console.log(`${file}: ${files[0].name}, ${files[0].size} bytes, MAC ${ok ? "OK" : "MISMATCH"}`);
process.exit(ok ? 0 : 1);
