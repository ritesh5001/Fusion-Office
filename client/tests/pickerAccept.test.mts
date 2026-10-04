import { test } from "node:test";
import assert from "node:assert/strict";
import { pickerAccept } from "../src/lib/tools/pickerAccept.ts";

test("pickerAccept turns MIME types into extensions, without duplicates", () => {
  assert.equal(pickerAccept("application/pdf,.pdf"), ".pdf");
  assert.equal(pickerAccept("image/png,image/jpeg,image/webp"), ".png,.jpg,.jpeg,.webp");
  assert.match(pickerAccept("image/*,.heic"), /^\.jpg,.*\.heic/);
  assert.equal(pickerAccept(".docx,.doc"), ".docx,.doc");
});

test("pickerAccept leaves filters it can't spell as extensions alone", () => {
  assert.equal(pickerAccept("*/*"), "*/*");
  assert.equal(pickerAccept("application/zip,.zip"), "application/zip,.zip");
});
