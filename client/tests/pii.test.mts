// Personal data detection: real-looking IDs are found; ordinary numbers are not.
import { test } from "node:test";
import assert from "node:assert/strict";
import { detectPii, luhnValid, mask, verhoeffValid } from "../src/lib/tools/pii.ts";

test("check digits", () => {
  assert.equal(verhoeffValid("234123412346"), true); // a valid test Aadhaar
  assert.equal(verhoeffValid("234123412345"), false);
  assert.equal(luhnValid("4111111111111111"), true);
  assert.equal(luhnValid("4111111111111112"), false);
});

test("finds each kind of personal data", () => {
  const text = [
    "Aadhaar: 2341 2341 2346",
    "PAN: ABCPE1234F",
    "Card 4111 1111 1111 1111 exp 12/29",
    "Mail ravi.kumar@example.co.in or call +91 98765 43210",
    "GSTIN 27AAPFU0939F1ZV, IFSC HDFC0001234",
  ].join("\n");
  const found = detectPii(text);
  const kinds = found.map((f) => f.kind).sort();
  assert.deepEqual(kinds, ["aadhaar", "card", "email", "gstin", "ifsc", "pan", "phone"].sort());
  assert.ok(found.find((f) => f.kind === "aadhaar")!.value === "2341 2341 2346");
  assert.ok(found.find((f) => f.kind === "phone")!.value.includes("98765 43210"));
});

test("ordinary numbers are not flagged", () => {
  const text = "Invoice 1234 5678 9012 total 4,55,000.00 on 2026-10-01, order 9876543210123456, ref 2341 2341 2345";
  const kinds = detectPii(text).map((f) => f.kind);
  assert.ok(!kinds.includes("aadhaar"), JSON.stringify(detectPii(text)));
  assert.ok(!kinds.includes("card"), JSON.stringify(detectPii(text)));
});

test("only the requested kinds", () => {
  assert.deepEqual(detectPii("a@b.co and ABCPE1234F", ["email"]).map((f) => f.kind), ["email"]);
});

test("masking keeps only the end", () => {
  assert.equal(mask("2341 2341 2346"), "••••••••2346");
  assert.equal(mask("ravi@example.com"), "••••@example.com");
});
