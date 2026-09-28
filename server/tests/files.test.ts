// Disk storage behind signed links.
import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

const dir = mkdtempSync(path.join(tmpdir(), "fusion-files-"));
process.env.STORAGE_DIR = dir;
process.env.MAX_UPLOAD_MB = "1";
const { createApp } = await import("../src/app.js");
const storage = await import("../src/lib/storage.js");

let server: Server;
let base = "";
before(async () => {
  server = createApp().listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => {
  server.close();
  rmSync(dir, { recursive: true, force: true });
});

const PDF = new TextEncoder().encode("%PDF-1.7\n% test file\n%%EOF\n");
const key = storage.sourceKey("user1", "doc1", "src1");

test("upload through a signed link, then download it", async () => {
  const put = await fetch(base + (await storage.presignUpload(key)), { method: "PUT", body: PDF, headers: { "content-type": "application/pdf" } });
  assert.equal(put.status, 201);
  const get = await fetch(base + (await storage.presignDownload(key)));
  assert.equal(get.status, 200);
  assert.equal(get.headers.get("content-type"), "application/pdf");
  assert.deepEqual(new Uint8Array(await get.arrayBuffer()), PDF);
});

test("a download link cannot be used to upload, and tampering is rejected", async () => {
  const getUrl = await storage.presignDownload(key);
  const asPut = await fetch(base + getUrl, { method: "PUT", body: PDF });
  assert.equal(asPut.status, 403);
  const tampered = getUrl.replace("src1.pdf", "src2.pdf");
  assert.equal((await fetch(base + tampered)).status, 403);
  const badSig = getUrl.replace(/sig=[^&]+/, "sig=AAAA");
  assert.equal((await fetch(base + badSig)).status, 403);
});

test("expired links are rejected", async () => {
  const past = Math.floor(Date.now() / 1000) - 5;
  assert.equal(storage.verifySignature(key, "get", String(past), "x"), "This link has expired");
});

test("only real PDFs are stored", async () => {
  const k = storage.sourceKey("user1", "doc1", "notpdf");
  const res = await fetch(base + (await storage.presignUpload(k)), { method: "PUT", body: "<html>hi</html>" });
  assert.equal(res.status, 415);
  assert.equal((await fetch(base + (await storage.presignDownload(k)))).status, 404);
});

test("uploads over the size limit are refused", async () => {
  const k = storage.sourceKey("user1", "doc1", "big");
  const big = new Uint8Array(1024 * 1024 + 10);
  big.set(PDF.subarray(0, 5));
  const res = await fetch(base + (await storage.presignUpload(k)), { method: "PUT", body: big });
  assert.equal(res.status, 413);
});

test("keys cannot escape the storage directory", () => {
  for (const bad of ["../etc/passwd", "users/../../x", "/abs/path", "a//b", "a/./b"]) {
    assert.throws(() => storage.filePath(bad), /Invalid storage key/, bad);
  }
});
