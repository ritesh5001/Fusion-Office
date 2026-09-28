// Starts the API on a random port with cloud features unconfigured and checks
// the fallback behaviour the client relies on.
import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "../src/app.js";
import { parseDocumentBody } from "../src/lib/http.js";

let server: Server;
let base = "";

before(async () => {
  server = createApp().listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

test("health check", async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
});

test("config reports cloud disabled without env", async () => {
  const res = await fetch(`${base}/api/config`);
  assert.deepEqual(await res.json(), { authEnabled: false, cloudEnabled: false, user: null });
});

test("documents API answers 503 when cloud is not configured", async () => {
  const res = await fetch(`${base}/api/documents`);
  assert.equal(res.status, 503);
  assert.match((await res.json()).error, /not configured/);
});

test("unknown API routes return JSON 404", async () => {
  const res = await fetch(`${base}/api/nope`);
  assert.equal(res.status, 404);
});

test("parseDocumentBody validates input", () => {
  assert.throws(() => parseDocumentBody(null), /Invalid body/);
  assert.throws(() => parseDocumentBody({ state: { pages: "x" } }), /Invalid state/);
  assert.throws(() => parseDocumentBody({ sources: [{ id: "../etc" }] }), /Invalid source id/);
  const ok = parseDocumentBody({ name: "a.pdf", state: { pages: [] }, sources: [{ id: "abc", name: "a.pdf", size: 3 }], confirm: ["abc", 5] });
  assert.equal(ok.name, "a.pdf");
  assert.deepEqual(ok.confirm, ["abc"]);
});

test("Auth.js routes resolve under /api/auth when auth is configured", async () => {
  // Run a separate app instance with dummy auth settings (no provider is contacted).
  const env = { AUTH_SECRET: "x".repeat(40), AUTH_GITHUB_ID: "dummy", AUTH_GITHUB_SECRET: "dummy", DATABASE_URL: "postgresql://u:p@127.0.0.1:1/none" };
  const { spawn } = await import("node:child_process");
  const port = 4000 + Math.floor(Math.random() * 1000) + 1000;
  const child = spawn(process.execPath, ["--import", "tsx", "src/index.ts"], { env: { ...process.env, ...env, PORT: String(port) }, stdio: "ignore" });
  try {
    let providers: Record<string, { id: string }> | null = null;
    for (let i = 0; i < 50 && !providers; i++) {
      await new Promise((r) => setTimeout(r, 200));
      providers = await fetch(`http://127.0.0.1:${port}/api/auth/providers`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    }
    assert.ok(providers?.github, "github provider should be listed");
    const cfg = await fetch(`http://127.0.0.1:${port}/api/config`).then((r) => r.json());
    // Disk storage is always available, so auth + database is all cloud save needs.
    assert.deepEqual(cfg, { authEnabled: true, cloudEnabled: true, user: null });
  } finally {
    child.kill();
  }
});
