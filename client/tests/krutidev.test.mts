// Unicode Hindi ↔ Kruti Dev 010, checked with words whose Kruti Dev spelling is well known.
import { test } from "node:test";
import assert from "node:assert/strict";
import { krutidevToUnicode, looksLikeKrutidev, unicodeToKrutidev } from "../src/lib/tools/krutidev.ts";

const PAIRS: [string, string][] = [
  ["भारत", "Hkkjr"],
  ["हिन्दी", "fgUnh"],
  ["नमस्ते", "ueLrs"],
  ["प्रेम", "izse"],
  ["क्षमा", "{kek"],
  ["कृष्ण", 'd`".k'],
  ["कर्म", "deZ"],
  ["विद्यालय", "fo|ky;"],
  ["राष्ट्र", 'jk"Vª'],
  ["श्री", "Jh"],
  ["ज्ञान", "Kku"],
  ["सिंह", "flag"],
  ["मंत्री", "ea=h"],
  ["आशीर्वाद", "vk'khokZn"],
  ["उत्तर", "mÙkj"],
  ["पूर्व", "iwoZ"],
  ["स्थिति", "fLFkfr"],
  ["धन्यवाद", "/kU;okn"],
  ["कीर्ति", "dhfrZ"],
  ["प्रिय", "fiz;"],
  ["क्रिया", "fØ;k"],
  ["ग्राम", "xzke"],
  ["ईश्वर", "bZ'oj"],
  ["औषधि", 'vkS"kf/k'],
  ["ओम", "vkse"],
  ["ऐसा", ",slk"],
  ["उन्होंने", "mUgksaus"],
  ["ज़मीन", "t+ehu"],
  ["पढ़ाई", "i<+kbZ"],
];

test("Unicode → Kruti Dev for well-known words", () => {
  for (const [u, k] of PAIRS) assert.equal(unicodeToKrutidev(u), k, u);
});

test("Kruti Dev → Unicode for the same words", () => {
  for (const [u, k] of PAIRS) assert.equal(krutidevToUnicode(k), u.normalize("NFC"), k);
});

test("sentences, digits and punctuation survive both ways", () => {
  const u = "मेरा नाम राम है। मैं १२ साल का हूँ, और आप?";
  const k = unicodeToKrutidev(u);
  assert.equal(k, "esjk uke jke gSA eSa ƒ„ lky dk gw¡] vkSj vki\\");
  assert.equal(krutidevToUnicode(k), u);
  // Latin digits and spaces pass through untouched.
  assert.equal(unicodeToKrutidev("कक्षा 10"), "d{kk 10");
});

test("Kruti Dev text is recognised, English is not", () => {
  assert.equal(looksLikeKrutidev("esjk uke jke gS vkSj ;g esa jgrk gw¡"), true);
  assert.equal(looksLikeKrutidev("esjk Hkkjr egku gSA"), true);
  assert.equal(looksLikeKrutidev("This is an ordinary English sentence."), false);
  assert.equal(looksLikeKrutidev("Looking for skills in ranking and banking"), false);
});
