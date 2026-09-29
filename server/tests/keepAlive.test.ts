// Keep-alive: which URLs the server pings to stay awake on Render's free plan.
import { test } from "node:test";
import assert from "node:assert/strict";
import { keepAliveMinutes, keepAliveUrls } from "../src/lib/keepAlive.js";

test("pings its own Render health URL by default", () => {
  assert.deepEqual(keepAliveUrls({ RENDER_EXTERNAL_URL: "https://fusion-office.onrender.com/" }), [
    "https://fusion-office.onrender.com/api/health",
  ]);
});

test("does nothing locally or when switched off", () => {
  assert.deepEqual(keepAliveUrls({}), []);
  assert.deepEqual(keepAliveUrls({ RENDER_EXTERNAL_URL: "https://x.onrender.com", KEEP_ALIVE: "off" }), []);
});

test("an explicit list replaces the default and drops junk", () => {
  assert.deepEqual(
    keepAliveUrls({
      RENDER_EXTERNAL_URL: "https://x.onrender.com",
      KEEP_ALIVE_URLS: "https://a.onrender.com/api/health, https://web.onrender.com/ ,ftp://no, https://a.onrender.com/api/health",
    }),
    ["https://a.onrender.com/api/health", "https://web.onrender.com/"],
  );
});

test("the interval stays under Render's 15 minute limit", () => {
  assert.equal(keepAliveMinutes({}), 13);
  assert.equal(keepAliveMinutes({ KEEP_ALIVE_MINUTES: "10" }), 10);
  assert.equal(keepAliveMinutes({ KEEP_ALIVE_MINUTES: "20" }), 13);
  assert.equal(keepAliveMinutes({ KEEP_ALIVE_MINUTES: "abc" }), 13);
});
