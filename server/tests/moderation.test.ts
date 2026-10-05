// Feedback moderation: the abuse word list, the AI verdict and its fallbacks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ABUSE_REPLY_TAIL, ROASTS, hasAbuse, moderate, roast } from "../src/lib/moderation.js";

test("hasAbuse catches Hinglish, Hindi, English and masked abuse", () => {
  for (const t of ["tu chutiya hai", "BHOSDIKE", "madarchod", "ch@tiya", "f*ck this", "bkl kya bakwas", "bsdk", "भोसड़ीके", "you bitch"]) {
    assert.equal(hasAbuse(t), true, t);
  }
});

test("hasAbuse leaves ordinary words alone", () => {
  for (const t of ["That would explode my productivity", "I applaud the team", "Gandhinagar office", "loader keeps spinning", "Scunthorpe", "BCom student", "great tool, thanks", "abc mca student", "bc the merge failed"]) {
    assert.equal(hasAbuse(t), false, t);
  }
});

test("moderate: abuse never reaches the AI, and the AI decides the rest", async () => {
  let calls = 0;
  const ai = async () => (calls++, "fake" as const);
  assert.equal(await moderate("Kirti", "tu chutiya hai", ai, true), "abusive");
  assert.equal(calls, 0);
  assert.equal(await moderate("fuerifn", "ewicerieru cnekcjn", ai, true), "fake");
  assert.equal(calls, 1);
});

test("moderate accepts feedback when the AI is off or failing", async () => {
  assert.equal(await moderate("Rahul", "nice", async () => "fake", false), "real");
  assert.equal(await moderate("Rahul", "nice", async () => { throw new Error("down"); }, true), "real");
});

test("roast picks one of the lines and asks for real feedback", () => {
  assert.equal(roast(0), `${ROASTS[0]} ${ABUSE_REPLY_TAIL}`);
  assert.equal(roast(0.9999), `${ROASTS.at(-1)} ${ABUSE_REPLY_TAIL}`);
  assert.equal(ROASTS.length, 20);
});
