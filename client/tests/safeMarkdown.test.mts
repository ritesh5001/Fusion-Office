// AI answers are rendered as Markdown without letting their content run or load anything.
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderSafeMarkdown } from "../src/lib/tools/safeMarkdown.ts";

test("formatting still works", () => {
  const html = renderSafeMarkdown("**Due:** 15 Oct (p. 2)\n\n- one\n- two\n\n| a | b |\n|---|---|\n| 1 | 2 |");
  assert.ok(html.includes("<strong>Due:</strong>"));
  assert.ok(html.includes("<li>one</li>"));
  assert.ok(html.includes("<table>"));
});

test("raw HTML is shown as text, not run", () => {
  const html = renderSafeMarkdown('Hello <script>alert(1)</script> <img src=x onerror="alert(2)"> <b onmouseover="x">b</b>');
  assert.ok(!/<script|<img|<b /.test(html), html); // tags appear only as escaped text
  assert.ok(html.includes("&lt;script&gt;"));
});

test("only web and mail links survive; images become links", () => {
  const html = renderSafeMarkdown("[ok](https://example.com) [bad](javascript:alert(1)) ![pic](https://example.com/x.png)");
  assert.ok(html.includes('<a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">ok</a>'));
  assert.ok(!html.includes("javascript:"));
  assert.ok(!html.includes("<img"));
  assert.ok(html.includes(">pic</a>"));
});
