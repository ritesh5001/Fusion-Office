/**
 * File fingerprints: SHA-256 and SHA-1 from the browser's Web Crypto, MD5 in
 * plain JS (Web Crypto doesn't offer it; it's still common for checksums).
 */

const hex = (buf: ArrayBuffer | Uint8Array) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

export async function sha(bytes: Uint8Array, algo: "SHA-256" | "SHA-1"): Promise<string> {
  return hex(await crypto.subtle.digest(algo, bytes as BufferSource));
}

// MD5 (RFC 1321).
const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);

export function md5(bytes: Uint8Array): string {
  const len = bytes.length;
  const padded = new Uint8Array(((len + 8) >>> 6) * 64 + 64);
  padded.set(bytes);
  padded[len] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, (len * 8) >>> 0, true);
  view.setUint32(padded.length - 4, Math.floor(len / 0x20000000), true);
  let [a0, b0, c0, d0] = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
  const M = new Uint32Array(16);
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) M[i] = view.getUint32(off + i * 4, true);
    let [A, B, C, Dd] = [a0, b0, c0, d0];
    for (let i = 0; i < 64; i++) {
      let F: number;
      let g: number;
      if (i < 16) {
        F = (B & C) | (~B & Dd);
        g = i;
      } else if (i < 32) {
        F = (Dd & B) | (~Dd & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ Dd;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~Dd);
        g = (7 * i) % 16;
      }
      F = (F + A + K[i] + M[g]) >>> 0;
      A = Dd;
      Dd = C;
      C = B;
      B = (B + ((F << S[i]) | (F >>> (32 - S[i])))) >>> 0;
    }
    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + Dd) >>> 0;
  }
  const out = new DataView(new ArrayBuffer(16));
  [a0, b0, c0, d0].forEach((v, i) => out.setUint32(i * 4, v, true));
  return hex(out.buffer);
}

export interface Fingerprint {
  name: string;
  size: number;
  sha256: string;
  sha1: string;
  md5: string;
}

export async function fingerprint(name: string, bytes: Uint8Array): Promise<Fingerprint> {
  return { name, size: bytes.length, sha256: await sha(bytes, "SHA-256"), sha1: await sha(bytes, "SHA-1"), md5: md5(bytes) };
}
