// Turnstile guard (and its human-pass cookie), with Cloudflare's siteverify mocked.
import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import { createPass, turnstileGuard, verifyPass } from "../src/lib/turnstile.js";

let server: Server;
let base = "";
const realFetch = globalThis.fetch;
let verify: (form: URLSearchParams) => Response = () => Response.json({ success: true, action: "human" });
const seen: URLSearchParams[] = [];

before(async () => {
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    if (String(input).startsWith("https://challenges.cloudflare.com/")) {
      const form = new URLSearchParams(String(init?.body));
      seen.push(form);
      return verify(form);
    }
    return realFetch(input, init);
  }) as typeof fetch;
  const app = express();
  app.use("/on", turnstileGuard(true, "secret"), (_req, res) => res.json({ ok: true }));
  app.use("/off", turnstileGuard(false, "secret"), (_req, res) => res.json({ ok: true }));
  server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => {
  globalThis.fetch = realFetch;
  server.close();
});

const post = (path: string, token?: string, cookie?: string) =>
  realFetch(`${base}${path}`, { method: "POST", headers: { ...(token ? { "cf-turnstile-response": token } : {}), ...(cookie ? { cookie } : {}) } });

test("disabled guard lets requests through", async () => {
  assert.equal((await post("/off")).status, 200);
});

test("missing token is rejected without calling Cloudflare", async () => {
  const before = seen.length;
  const res = await post("/on");
  assert.equal(res.status, 403);
  assert.match((await res.json()).error, /security check/);
  assert.equal(seen.length, before);
});

test("valid token passes, is sent to siteverify with the secret, and earns a pass", async () => {
  verify = () => Response.json({ success: true, action: "human" });
  const res = await post("/on", "good-token");
  assert.equal(res.status, 200);
  const form = seen.at(-1)!;
  assert.equal(form.get("secret"), "secret");
  assert.equal(form.get("response"), "good-token");
  const cookie = res.headers.get("set-cookie") ?? "";
  assert.match(cookie, /fo_human=\d+\.[\w-]+; Max-Age=1800; Path=\/api; .*HttpOnly/);
  assert.ok(Number(res.headers.get("x-human-pass-expires")) > Date.now());

  // The pass then works on its own, without another call to Cloudflare.
  const calls = seen.length;
  assert.equal((await post("/on", undefined, cookie.split(";")[0])).status, 200);
  assert.equal(seen.length, calls);
});

test("forged, expired or foreign passes are rejected", async () => {
  const now = Date.now();
  assert.equal(verifyPass(createPass("secret", now), "secret", now), true);
  assert.equal(verifyPass(createPass("secret", now), "other-secret", now), false);
  assert.equal(verifyPass(createPass("secret", now - 31 * 60_000), "secret", now), false);
  const [, sig] = createPass("secret", now).split(".");
  assert.equal(verifyPass(`${now + 99 * 3600_000}.${sig}`, "secret", now), false);
  assert.equal((await post("/on", undefined, "fo_human=9999999999999.forged")).status, 403);
});

test("invalid or reused token is rejected", async () => {
  verify = () => Response.json({ success: false, "error-codes": ["timeout-or-duplicate"] });
  assert.equal((await post("/on", "used-token")).status, 403);
});

test("token issued for another action is rejected", async () => {
  verify = () => Response.json({ success: true, action: "login" });
  assert.equal((await post("/on", "other-token")).status, 403);
});

test("fails closed when Cloudflare is unreachable", async () => {
  verify = () => new Response("down", { status: 500 });
  assert.equal((await post("/on", "any-token")).status, 503);
});
