// CORS allowlist, CSRF origin guard and security headers.
import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "../src/app.js";
import { allowedOrigins } from "../src/lib/security.js";

let server: Server;
let base = "";
const GOOD = "http://localhost:3000";
const EVIL = "https://evil.example";

before(async () => {
  server = createApp().listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

test("allowed origin gets CORS headers with credentials", async () => {
  const res = await fetch(`${base}/api/config`, { headers: { Origin: GOOD } });
  assert.equal(res.headers.get("access-control-allow-origin"), GOOD);
  assert.equal(res.headers.get("access-control-allow-credentials"), "true");
  assert.match(res.headers.get("vary") ?? "", /Origin/);
});

test("unknown origin gets no CORS headers", async () => {
  const res = await fetch(`${base}/api/config`, { headers: { Origin: EVIL } });
  assert.equal(res.headers.get("access-control-allow-origin"), null);
});

test("preflight answers allowlisted origins only", async () => {
  const ok = await fetch(`${base}/api/documents`, {
    method: "OPTIONS",
    headers: { Origin: GOOD, "Access-Control-Request-Method": "PUT", "Access-Control-Request-Headers": "content-type" },
  });
  assert.equal(ok.status, 204);
  assert.equal(ok.headers.get("access-control-allow-origin"), GOOD);
  assert.match(ok.headers.get("access-control-allow-methods") ?? "", /PUT/);
  const bad = await fetch(`${base}/api/documents`, {
    method: "OPTIONS",
    headers: { Origin: EVIL, "Access-Control-Request-Method": "PUT" },
  });
  assert.equal(bad.headers.get("access-control-allow-origin"), null);
});

test("writes from an unknown origin are rejected before any other check", async () => {
  const res = await fetch(`${base}/api/documents`, {
    method: "POST",
    headers: { Origin: EVIL, "content-type": "application/json" },
    body: "{}",
  });
  assert.equal(res.status, 403);
});

test("writes from the site's own origin pass the guard", async () => {
  const res = await fetch(`${base}/api/documents`, {
    method: "POST",
    headers: { Origin: GOOD, "content-type": "application/json" },
    body: "{}",
  });
  assert.equal(res.status, 503); // reaches the route; cloud is not configured in tests
});

test("security headers are set", async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.match(res.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
  assert.equal(res.headers.get("x-powered-by"), null);
});

test("allowedOrigins merges CLIENT_ORIGIN, AUTH_URL and dev defaults", () => {
  const prod = allowedOrigins({ NODE_ENV: "production", CLIENT_ORIGIN: "https://a.app/, https://b.app", AUTH_URL: "https://a.app/api/auth" });
  assert.deepEqual(prod.sort(), ["https://a.app", "https://b.app"]);
  assert.ok(allowedOrigins({ NODE_ENV: "development" }).includes("http://localhost:3000"));
});
