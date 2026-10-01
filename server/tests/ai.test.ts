// The Groq client, against a local stand-in for Groq's chat API: request
// shape, rate-limit retries and error messages.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http, { type Server } from "node:http";
import type { AddressInfo } from "node:net";

type Reply = { status: number; body: unknown; headers?: Record<string, string> };
const queue: Reply[] = [];
const seen: { auth?: string; body: Record<string, unknown> }[] = [];
let server: Server;

before(async () => {
  server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      seen.push({ auth: req.headers.authorization, body: JSON.parse(raw || "{}") });
      const r = queue.shift() ?? { status: 200, body: { choices: [{ message: { content: "ok" }, finish_reason: "stop" }] } };
      res.writeHead(r.status, { "content-type": "application/json", ...r.headers });
      res.end(JSON.stringify(r.body));
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  process.env.GROQ_API_KEY = "test-key";
  process.env.GROQ_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/openai/v1`;
  delete process.env.AI_MODEL;
});
after(() => server.close());

const ai = () => import("../src/lib/ai.js");
const answer = (content: string, finish = "stop") => ({ status: 200, body: { choices: [{ message: { content }, finish_reason: finish }] } });

test("summarize sends a well-formed Groq request and returns the answer", async () => {
  seen.length = 0;
  queue.push(answer("  - Key point (p. 1)  "));
  const out = await (await ai()).summarize(["The vessel was cleaned."], "short");
  assert.equal(out, "- Key point (p. 1)");
  const req = seen[0];
  assert.equal(req.auth, "Bearer test-key");
  assert.equal(req.body.model, "openai/gpt-oss-120b");
  assert.equal(req.body.include_reasoning, false);
  assert.equal(req.body.reasoning_effort, "low");
  const msgs = req.body.messages as { role: string; content: string }[];
  assert.equal(msgs[0].role, "system");
  assert.ok(msgs[1].content.includes('<page number="1">'));
});

test("a rate limit is waited out and retried", async () => {
  seen.length = 0;
  queue.push({ status: 429, headers: { "retry-after": "0.2" }, body: { error: { message: "Rate limit reached. Please try again in 200ms." } } }, answer("done"));
  const started = Date.now();
  assert.equal(await (await ai()).summarize(["text"], "short"), "done");
  assert.equal(seen.length, 2);
  assert.ok(Date.now() - started >= 200);
});

test("a document over the per-minute allowance gets a clear 'too long' error", async () => {
  queue.push({ status: 413, body: { error: { message: "Request too large for model on tokens per minute (TPM): Limit 8000, Requested 21000", code: "request_too_large" } } });
  await assert.rejects((await ai()).summarize(["long"], "short"), (e: { status?: number; message: string }) => e.status === 413 && /fewer pages/.test(e.message));
});

test("bad credentials read as 'not available', and cut-off answers as 'too long'", async () => {
  queue.push({ status: 401, body: { error: { message: "Invalid API Key" } } });
  await assert.rejects((await ai()).summarize(["x"], "short"), (e: { status?: number }) => e.status === 503);
  queue.push(answer("half an ans", "length"));
  await assert.rejects((await ai()).summarize(["x"], "short"), (e: { status?: number }) => e.status === 413);
});

test("chat sends the document first, then the conversation in order", async () => {
  seen.length = 0;
  queue.push(answer("On 1 October (p. 1)."));
  const out = await (await ai()).chatWithDocument(["Cleaned on 1 October."], [
    { role: "user", text: "Which vessel?" },
    { role: "assistant", text: "MV Ocean Star (p. 1)." },
    { role: "user", text: "When?" },
  ]);
  assert.equal(out, "On 1 October (p. 1).");
  const msgs = seen[0].body.messages as { role: string; content: string }[];
  assert.deepEqual(msgs.map((m) => m.role), ["system", "user", "assistant", "user"]);
  assert.ok(msgs[1].content.startsWith("<document>") && msgs[1].content.endsWith("Which vessel?"));
  assert.equal(msgs[3].content, "When?");
});
