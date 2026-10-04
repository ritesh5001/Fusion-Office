import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanForSpeech } from "../src/lib/tools/speech.ts";

test("cleanForSpeech drops symbols, links and rejoins split words", () => {
  const raw = "Rounak Gupta +91-7667991277 | rounak@gmail.com | https://github.com/x • Built apps with React. js, Node. js & MongoDB • 30 % faster, 900+ problems, 2022 - 2026";
  const out = cleanForSpeech(raw);
  assert.doesNotMatch(out, /[•|@]|https?:/);
  assert.match(out, /React\.js, Node\.js and MongoDB/);
  assert.match(out, /30 percent faster/);
  assert.match(out, /900 plus problems/);
  assert.match(out, /2022 to 2026/);
  assert.doesNotMatch(out, / {2}/);
});

test("cleanForSpeech keeps normal sentences untouched", () => {
  const s = "The meeting is on Monday. Bring your laptop, please.";
  assert.equal(cleanForSpeech(s), s);
});
