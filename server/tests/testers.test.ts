// Early testers: sign-up validation, the invite code, photo compression, and
// the public API's behaviour without a database.
import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import sharp from "sharp";
import { createApp } from "../src/app.js";
import { dbEnabled } from "../src/lib/db.js";
import { inviteCode, parseTester, PHOTO_SIZE, processPhoto, publicTester, validInvite } from "../src/lib/testers.js";

const dataUrl = (buf: Buffer, type = "image/png") => `data:${type};base64,${buf.toString("base64")}`;

test("parseTester tidies a valid sign-up", () => {
  const t = parseTester({ name: "  Priya   Sharma ", username: "@Priya.S_99", email: " Priya@Example.COM " });
  assert.deepEqual(t, { name: "Priya Sharma", username: "Priya.S_99", usernameKey: "priya.s_99", email: "priya@example.com" });
});

test("parseTester rejects bad names, usernames and emails", () => {
  const ok = { name: "Priya Sharma", username: "priya", email: "priya@example.com" };
  assert.throws(() => parseTester({ ...ok, name: "P" }), /your name/);
  assert.throws(() => parseTester({ ...ok, name: "x".repeat(61) }), /under 60/);
  assert.throws(() => parseTester({ ...ok, username: "ab" }), /at least 3/);
  assert.throws(() => parseTester({ ...ok, username: "x".repeat(31) }), /under 30/);
  assert.throws(() => parseTester({ ...ok, username: "has space" }), /letters, numbers/);
  assert.throws(() => parseTester({ ...ok, username: ".dotfirst" }), /letters, numbers/);
  assert.throws(() => parseTester({ ...ok, username: "two..dots" }), /letters, numbers/);
  assert.throws(() => parseTester({ ...ok, email: "not-an-email" }), /valid email/);
  assert.throws(() => parseTester({ ...ok, username: "bhosdike99" }), /respectful/);
  assert.throws(() => parseTester({ ...ok, website: "spam.example" }), /Couldn't save/);
});

test("the invite code is stable, secret-derived and can be overridden", () => {
  const a = inviteCode({ AUTH_SECRET: "one" });
  assert.ok(a && a.length === 16);
  assert.equal(inviteCode({ AUTH_SECRET: "one" }), a, "same secret, same code");
  assert.notEqual(inviteCode({ AUTH_SECRET: "two" }), a, "different secret, different code");
  assert.equal(inviteCode({ AUTH_SECRET: "one", TESTER_INVITE_CODE: " early-birds " }), "early-birds");
  assert.equal(inviteCode({}), null, "no secret: sign-up closed");

  assert.equal(validInvite(a, { AUTH_SECRET: "one" }), true);
  assert.equal(validInvite("guess", { AUTH_SECRET: "one" }), false);
  assert.equal(validInvite(undefined, { AUTH_SECRET: "one" }), false);
  assert.equal(validInvite("", {}), false);
});

test("photos are compressed to a small square JPEG without metadata", async () => {
  // A big, sideways phone-style photo with an orientation tag and EXIF details.
  const big = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: { r: 120, g: 90, b: 200 } } })
    .withMetadata({ orientation: 6, exif: { IFD0: { Copyright: "secret location" } } })
    .jpeg({ quality: 95 })
    .toBuffer();
  const out = await processPhoto(dataUrl(big, "image/jpeg"));
  const meta = await sharp(out).metadata();
  assert.equal(meta.format, "jpeg");
  assert.equal(meta.width, PHOTO_SIZE);
  assert.equal(meta.height, PHOTO_SIZE);
  assert.equal(meta.exif, undefined, "EXIF (and any GPS) is stripped");
  assert.ok(out.length < 60 * 1024, `compressed photo is ${out.length} bytes`);
  assert.ok(out.length < big.length / 5);
});

test("transparent PNGs get a white background", async () => {
  const png = await sharp({ create: { width: 200, height: 200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
  const out = await processPhoto(dataUrl(png));
  const { data } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
  assert.ok(data[0] > 240 && data[1] > 240 && data[2] > 240, "corner pixel is white, not black");
});

test("bad photos are rejected with a helpful message", async () => {
  await assert.rejects(processPhoto(undefined), /add a profile photo/);
  await assert.rejects(processPhoto("https://example.com/me.jpg"), /add a profile photo/);
  await assert.rejects(processPhoto(dataUrl(Buffer.from("not an image at all"))), /couldn't read/);
  const tiny = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#fff" } }).png().toBuffer();
  await assert.rejects(processPhoto(dataUrl(tiny)), /too small/);
});

test("the public shape never includes the email", () => {
  const t = publicTester({ id: "abc", name: "Priya", username: "priya", createdAt: new Date(0), updatedAt: new Date(5000), ...{ email: "priya@example.com" } } as never);
  assert.deepEqual(Object.keys(t).sort(), ["id", "joinedAt", "name", "photo", "username"]);
  assert.equal(t.photo, "/api/testers/abc/photo?v=5000");
});

// ─── HTTP, without a database ──────────────────────────────────────

let server: Server;
let base = "";

before(async () => {
  server = createApp().listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

// A local .env may configure a database that isn't running; these checks are about the fallback.
test("the public list is empty, not an error, without a database", { skip: dbEnabled && "a database is configured" }, async () => {
  const res = await fetch(`${base}/api/testers`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { testers: [] });
});

test("sign-up refuses requests without a valid invite, and checks the origin", async () => {
  const res = await fetch(`${base}/api/testers/join`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  // Closed (no database or secret) or forbidden (no invite code): never accepted.
  assert.ok(res.status === 503 || res.status === 403, `status ${res.status}`);
  const foreign = await fetch(`${base}/api/testers/join`, { method: "POST", headers: { "content-type": "application/json", origin: "https://evil.example" }, body: "{}" });
  assert.equal(foreign.status, 403);
  assert.match((await foreign.json()).error, /origin/);
});

test("the invite check never reveals the real code", async () => {
  const res = await fetch(`${base}/api/testers/invite/guess`);
  const body = await res.json();
  assert.equal(body.valid, false);
  assert.ok(!JSON.stringify(body).includes(inviteCode() ?? "\u0000"));
});

test("tester admin endpoints need an admin session", async () => {
  const res = await fetch(`${base}/api/admin/testers`);
  assert.ok(res.status === 401 || res.status === 503);
});
