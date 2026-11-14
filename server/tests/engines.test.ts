// PDF engines: PDF/A (Ghostscript), web-optimized PDF (qpdf), PDF → SVG
// (Poppler) and the extra Office formats. Each test runs when its program is
// installed and is skipped otherwise.
import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { type Server } from "node:http";
import { type AddressInfo } from "node:net";
import { spawnSync } from "node:child_process";

process.env.GROQ_API_KEY = "";
const { createApp } = await import("../src/app.js");
const { isPdf, pdfaDefinition, srgbProfile } = await import("../src/lib/engines.js");

let server: Server;
let base = "";
before(async () => {
  server = createApp().listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

const has = (cmd: string, arg = "--version") => spawnSync(cmd, [arg], { stdio: "ignore" }).status === 0;
const hasGs = has(process.env.GS_PATH || "gs") && !!srgbProfile();
const hasQpdf = has(process.env.QPDF_PATH || "qpdf");
const hasCairo = has(process.env.PDFTOCAIRO_PATH || "pdftocairo", "-v");
const hasSoffice = has(process.env.SOFFICE_PATH || "soffice");

/** A small valid PDF with one line of text per page (Helvetica, not embedded). */
function makePdf(pages: string[]): Buffer {
  const objs: string[] = [];
  const kids = pages.map((_, i) => `${4 + i * 2} 0 R`).join(" ");
  objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objs[2] = `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`;
  objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  pages.forEach((text, i) => {
    const stream = `BT /F1 24 Tf 72 700 Td (${text}) Tj ET`;
    objs[4 + i * 2] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`;
    objs[5 + i * 2] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let n = 1; n < objs.length; n++) {
    offsets[n] = out.length;
    out += `${n} 0 obj\n${objs[n]}\nendobj\n`;
  }
  const xref = out.length;
  out += `xref\n0 ${objs.length}\n0000000000 65535 f \n${offsets.slice(1).map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

const post = (path: string, body: Uint8Array, name = "doc.pdf") => fetch(`${base}${path}`, { method: "POST", headers: { "x-filename": name }, body: body as unknown as BodyInit });

test("PDF detection and the PDF/A definition file", () => {
  assert.equal(isPdf(makePdf(["x"])), true);
  assert.equal(isPdf(Buffer.from("junk then %PDF-1.7 header")), true);
  assert.equal(isPdf(Buffer.from("PK\u0003\u0004 a zip")), false);
  const def = pdfaDefinition("/x/(odd) path\\srgb.icc");
  assert.match(def, /\/ICCProfile \(\/x\/\\\(odd\\\) path\\\\srgb\.icc\) def/);
  assert.match(def, /\/GTS_PDFA1/);
});

test("engines refuse files that aren't PDFs", async () => {
  for (const path of ["/api/convert/pdfa", "/api/convert/linearize", "/api/convert/svg"]) {
    const res = await post(path, Buffer.from("not a pdf"));
    assert.equal(res.status, 415, path);
  }
  assert.equal((await post("/api/convert/pdfa", new Uint8Array())).status, 400);
});

test("PDF/A: fonts embedded, sRGB output intent and PDF/A identification", { skip: !hasGs && "ghostscript not installed", timeout: 120_000 }, async () => {
  for (const level of ["2b", "1b"]) {
    const res = await post(`/api/convert/pdfa?level=${level}`, makePdf(["Archive me", "Page two"]), "report.pdf");
    assert.equal(res.status, 200, await res.clone().text());
    assert.match(res.headers.get("content-disposition") ?? "", /report-pdfa\.pdf/);
    let bytes = Buffer.from(await res.arrayBuffer());
    // Ghostscript packs most objects into compressed object streams; unpack them to look inside.
    if (hasQpdf) {
      const { mkdtempSync, writeFileSync, readFileSync, rmSync } = await import("node:fs");
      const dir = mkdtempSync(`${(await import("node:os")).tmpdir()}/fo-pdfa-test-`);
      writeFileSync(`${dir}/in.pdf`, bytes);
      spawnSync(process.env.QPDF_PATH || "qpdf", ["--qdf", "--object-streams=disable", `${dir}/in.pdf`, `${dir}/out.pdf`]);
      bytes = readFileSync(`${dir}/out.pdf`);
      rmSync(dir, { recursive: true, force: true });
    }
    const text = bytes.toString("latin1");
    assert.match(text, /\/OutputIntents/, "output intent");
    if (hasQpdf) assert.match(text, /GTS_PDFA1/, "PDF/A output intent");
    assert.match(text, new RegExp(`pdfaid:part[^\\d]{0,4}${level[0]}`), "XMP identification");
    assert.match(text, /FontFile/, "fonts embedded");
  }
});

test("web optimization: the result is linearized and says whether the input was", { skip: !hasQpdf && "qpdf not installed", timeout: 60_000 }, async () => {
  const res = await post("/api/convert/linearize", makePdf(["One", "Two", "Three"]));
  assert.equal(res.status, 200, await res.clone().text());
  assert.equal(res.headers.get("x-already-linearized"), "0");
  const out = Buffer.from(await res.arrayBuffer());
  assert.match(out.subarray(0, 1024).toString("latin1"), /\/Linearized/);
  const again = await post("/api/convert/linearize", out);
  assert.equal(again.headers.get("x-already-linearized"), "1");
});

test("PDF → SVG: one SVG per page, stopping at the last page", { skip: !hasCairo && "pdftocairo not installed", timeout: 60_000 }, async () => {
  const res = await post("/api/convert/svg?first=1&last=5", makePdf(["Alpha", "Beta"]));
  assert.equal(res.status, 200, await res.clone().text());
  const { pages } = (await res.json()) as { pages: string[] };
  assert.equal(pages.length, 2);
  for (const svg of pages) assert.match(svg, /^<\?xml[\s\S]*<svg/);
});

test("Office formats: Word → ODT, RTF and plain text; spreadsheet → CSV", { skip: !hasSoffice && "soffice not installed", timeout: 240_000 }, async () => {
  const rtf = "{\\rtf1\\ansi{\\fonttbl\\f0 Helvetica;}\\f0 Namaste from RTF\\par}";
  const odt = await fetch(`${base}/api/convert/office?to=odt`, { method: "POST", headers: { "x-filename": "note.rtf" }, body: rtf });
  assert.equal(odt.status, 200, await odt.clone().text());
  assert.match(odt.headers.get("content-type") ?? "", /opendocument\.text/);
  assert.equal(Buffer.from(await odt.arrayBuffer()).subarray(0, 2).toString(), "PK");
  const txt = await fetch(`${base}/api/convert/office?to=txt`, { method: "POST", headers: { "x-filename": "note.rtf" }, body: rtf });
  assert.equal(txt.status, 200);
  assert.match(await txt.text(), /Namaste from RTF/);
  const ods = await fetch(`${base}/api/convert/office?to=ods`, { method: "POST", headers: { "x-filename": "t.csv" }, body: "name,amount\nAsha,10\n" });
  assert.equal(ods.status, 200);
  const csv = await fetch(`${base}/api/convert/office?to=csv`, { method: "POST", headers: { "x-filename": "t.ods" }, body: new Uint8Array(await ods.arrayBuffer()) });
  assert.equal(csv.status, 200, await csv.clone().text());
  assert.match(await csv.text(), /name,amount\s+Asha,10/);
  // A document can't become a spreadsheet.
  assert.equal((await fetch(`${base}/api/convert/office?to=csv`, { method: "POST", headers: { "x-filename": "note.rtf" }, body: rtf })).status, 400);
});
