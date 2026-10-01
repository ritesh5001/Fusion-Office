// File fingerprints match the standard test vectors and Node's own hashes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { fingerprint, md5 } from "../src/lib/tools/hash.ts";

const enc = (s: string) => new TextEncoder().encode(s);

test("md5 test vectors", () => {
  assert.equal(md5(enc("")), "d41d8cd98f00b204e9800998ecf8427e");
  assert.equal(md5(enc("abc")), "900150983cd24fb0d6963f7d28e17f72");
  assert.equal(md5(enc("The quick brown fox jumps over the lazy dog")), "9e107d9d372bb6826bd81d3542a419d6");
});

test("all three hashes agree with node:crypto on random data of awkward sizes", async () => {
  for (const n of [55, 56, 64, 1000, 70_001]) {
    const b = new Uint8Array(randomBytes(n));
    const f = await fingerprint("x", b);
    assert.equal(f.md5, createHash("md5").update(b).digest("hex"), `md5 ${n}`);
    assert.equal(f.sha1, createHash("sha1").update(b).digest("hex"), `sha1 ${n}`);
    assert.equal(f.sha256, createHash("sha256").update(b).digest("hex"), `sha256 ${n}`);
  }
});
