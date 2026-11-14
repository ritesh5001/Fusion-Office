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

test("narrate rewrites each page for speech, keeps page order, and skips empty pages", async () => {
  seen.length = 0;
  queue.length = 0;
  queue.push(answer("Page one, spoken."), answer("Page three, spoken."));
  const out = await (await ai()).narrate(["Skills • React. js | Node. js", "   ", "Projects & awards"]);
  assert.deepEqual(out, ["Page one, spoken.", "", "Page three, spoken."]);
  assert.equal(seen.length, 2, "the blank page costs no AI call");
  const system = (seen[0].body.messages as { role: string; content: string }[])[0].content;
  assert.match(system, /read aloud by a text-to-speech voice/);
  assert.match(system, /never add facts/);
});

test("narrateSummary asks for a short spoken briefing of the whole document", async () => {
  seen.length = 0;
  queue.length = 0;
  queue.push(answer(" This document is a resume. "));
  const out = await (await ai()).narrateSummary(["one", "two"]);
  assert.equal(out, "This document is a resume.");
  const msgs = seen[0].body.messages as { role: string; content: string }[];
  assert.match(msgs[0].content, /spoken briefing/);
  assert.ok(msgs[1].content.includes('<page number="2">'));
});

test("speak sends one sentence to the Orpheus voice and returns the audio", async () => {
  seen.length = 0;
  queue.length = 0;
  queue.push({ status: 200, body: { fake: "wav" } });
  const audio = await (await ai()).speak("Hello there.", "hannah");
  assert.ok(audio.length > 0);
  assert.equal(seen[0].body.model, "canopylabs/orpheus-v1-english");
  assert.equal(seen[0].body.voice, "hannah");
  assert.equal(seen[0].body.input, "Hello there.");
});

test("speak explains the one-time terms step and rate limits plainly", async () => {
  queue.length = 0;
  queue.push({ status: 400, body: { error: { message: "requires terms acceptance", code: "model_terms_required" } } });
  await assert.rejects((await ai()).speak("Hi.", "troy"), (e: { status?: number; message: string }) => e.status === 503 && /one-time setup/.test(e.message));
  queue.push({ status: 429, body: { error: { message: "slow down" } } });
  await assert.rejects((await ai()).speak("Hi.", "troy"), (e: { status?: number }) => e.status === 429);
});

// ─── Structured tools: quiz, extraction, slides, resume check, rewrite ────

test("JSON replies are read even when wrapped in prose or a code fence", async () => {
  const { parseJsonReply } = await ai();
  assert.deepEqual(parseJsonReply('{"a":1}'), { a: 1 });
  assert.deepEqual(parseJsonReply('Here you go:\n```json\n{"a":2}\n```'), { a: 2 });
  assert.deepEqual(parseJsonReply('Sure! {"a":3} Hope it helps.'), { a: 3 });
  assert.throws(() => parseJsonReply("no json here"), /couldn't be read/);
});

test("quiz: JSON mode is requested, malformed questions are dropped, pages are checked", async () => {
  seen.length = 0;
  queue.push(
    answer(
      JSON.stringify({
        items: [
          { question: "Capital of India?", options: ["Mumbai", "New Delhi", "Pune", "Agra"], answer: 1, explanation: "Stated on p. 1", page: 1 },
          { question: "Bad answer index", options: ["a", "b"], answer: 5, page: 1 },
          { question: "Only one option", options: ["a"], answer: 0 },
          { question: "Page out of range", options: ["x", "y", "z", "w"], answer: 0, page: 99 },
        ],
      }),
    ),
  );
  const items = await (await ai()).makeQuiz(["New Delhi is the capital.", "More text."], "mcq", 5, "easy");
  assert.equal(items.length, 2);
  assert.deepEqual(items[0], { kind: "mcq", question: "Capital of India?", options: ["Mumbai", "New Delhi", "Pune", "Agra"], answer: 1, explanation: "Stated on p. 1", page: 1 });
  assert.equal(items[1].page, null);
  assert.deepEqual(seen[0].body.response_format, { type: "json_object" });
  queue.push(answer(JSON.stringify({ items: [{ front: "GST", back: "Goods and Services Tax", page: 1 }, { front: "", back: "x" }] })));
  assert.deepEqual(await (await ai()).makeQuiz(["GST text"], "flashcards", 3, "medium"), [{ kind: "flashcards", front: "GST", back: "Goods and Services Tax", page: 1 }]);
  queue.push(answer(JSON.stringify({ items: [] })));
  await assert.rejects((await ai()).makeQuiz(["x"], "truefalse", 3, "hard"), /usable questions/);
});

test("extraction keeps only known invoice fields and item columns", async () => {
  queue.push(
    answer(
      JSON.stringify({
        documents: [{ fields: { seller_name: "Acme", total: 1180, invented_field: "x", buyer_gstin: "" }, items: [{ description: "Chairs", quantity: "2", amount: "1000", colour: "red" }, {}] }],
      }),
    ),
  );
  const out = await (await ai()).extractData(["INVOICE Acme total 1180"], "invoice");
  assert.deepEqual(out, { kind: "invoice", documents: [{ fields: { seller_name: "Acme", total: "1180" }, items: [{ description: "Chairs", quantity: "2", amount: "1000" }] }] });
  queue.push(answer(JSON.stringify({ tables: [{ title: "Marks", page: 1, columns: ["Name", "Marks"], rows: [["Asha", "91"], ["", ""]] }] })));
  const t = await (await ai()).extractData(["Name Marks"], "tables");
  assert.deepEqual(t, { kind: "tables", tables: [{ title: "Marks", page: 1, columns: ["Name", "Marks"], rows: [["Asha", "91"]] }] });
  queue.push(answer(JSON.stringify({ documents: [] })));
  await assert.rejects((await ai()).extractData(["nothing"], "receipt"), /No receipt data/);
});

test("slides and resume reports are cleaned up", async () => {
  queue.push(answer(JSON.stringify({ title: "Q3 report", slides: [{ title: "Revenue", bullets: ["Up 12%", ""], notes: "Explain." }, { title: "Empty", bullets: [] }] })));
  const deck = await (await ai()).makeSlides(["Revenue grew 12%"], 5, "the board");
  assert.deepEqual(deck, { title: "Q3 report", subtitle: "", slides: [{ title: "Revenue", bullets: ["Up 12%"], notes: "Explain." }] });
  queue.push(answer(JSON.stringify({ score: 140, verdict: "Strong.", matched: ["React"], missing: ["AWS"], sections: [{ name: "Skills", status: "great" }], formatting: [], suggestions: ["Add AWS projects"] })));
  const rep = await (await ai()).checkResume(["React developer"], "Needs React and AWS");
  assert.equal(rep.score, 100);
  assert.deepEqual(rep.sections, [{ name: "Skills", status: "improve", note: "" }]);
  assert.deepEqual(rep.missing, ["AWS"]);
});

test("rewrite returns the bare text, and chat cites files when pages are labelled", async () => {
  seen.length = 0;
  queue.push(answer('"Hello, team. The meeting is at 3 pm."'));
  assert.equal(await (await ai()).rewriteText("hello team meeting at 3pm", "proofread"), "Hello, team. The meeting is at 3 pm.");
  queue.push(answer("Both mention 3 pm (a.pdf, p. 1)."));
  await (await ai()).chatWithDocument(["Meet at 3 pm", "Lunch"], [{ role: "user", text: "When?" }], ["a.pdf, p. 1", "b.pdf, p. 1"]);
  const msgs = seen[1].body.messages as { role: string; content: string }[];
  assert.match(msgs[1].content, /<page source="a\.pdf, p\. 1">/);
  assert.match(msgs[0].content, /several files/);
  const { parseLabels } = await ai();
  assert.throws(() => parseLabels(["only one"], 2), /malformed/);
  assert.equal(parseLabels(undefined, 2), undefined);
});
