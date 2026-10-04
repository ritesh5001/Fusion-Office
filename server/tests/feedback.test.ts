import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFeedback } from "../src/routes/feedback.js";
import { checkPassword, createToken, verifyToken } from "../src/lib/admin.js";

test("parseFeedback tidies a valid submission", () => {
  const f = parseFeedback({ name: "  Aman   Gupta ", message: " Great tool! ", rating: 5, page: "/tools/merge-pdf" });
  assert.deepEqual(f, { name: "Aman Gupta", message: "Great tool!", rating: 5, page: "/tools/merge-pdf" });
});

test("parseFeedback rejects missing or oversized fields", () => {
  assert.throws(() => parseFeedback({ name: "", message: "hello" }), /your name/);
  assert.throws(() => parseFeedback({ name: "A", message: "hi" }), /a little feedback/);
  assert.throws(() => parseFeedback({ name: "A", message: "x".repeat(2001) }), /under 2000/);
  assert.throws(() => parseFeedback({ name: "x".repeat(81), message: "hello" }), /under 80/);
});

test("parseFeedback drops bad optional fields and catches bots", () => {
  const f = parseFeedback({ name: "A", message: "hello", rating: 9, page: "https://evil.example" });
  assert.equal(f.rating, null);
  assert.equal(f.page, null);
  assert.throws(() => parseFeedback({ name: "A", message: "hello", website: "spam.example" }));
});

test("admin password check and signed sessions", () => {
  process.env.ADMIN_PASSWORD = "correct horse";
  process.env.AUTH_SECRET = "test-secret";
  assert.equal(checkPassword("correct horse"), true);
  assert.equal(checkPassword("wrong"), false);
  assert.equal(checkPassword(undefined), false);

  const token = createToken();
  assert.equal(verifyToken(token), true);
  assert.equal(verifyToken(token.replace(/.$/, (c) => (c === "A" ? "B" : "A"))), false, "tampered signature");
  assert.equal(verifyToken(token, Date.now() + 13 * 60 * 60 * 1000), false, "expired after 12 hours");

  process.env.ADMIN_PASSWORD = "new password";
  assert.equal(verifyToken(token), false, "changing the password signs everyone out");
});
