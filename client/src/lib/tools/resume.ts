/**
 * Resume builder: one data model, two outputs (PDF and Word), two looks.
 * Both are single-column with plain section headings and real text, which is
 * what applicant tracking systems (ATS) read best. Pure, so it runs in tests.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";

export interface ResumeJob {
  role: string;
  org: string;
  location: string;
  start: string;
  end: string;
  /** One achievement per line. */
  points: string;
}

export interface ResumeEducation {
  degree: string;
  school: string;
  start: string;
  end: string;
  /** CGPA, percentage or class. */
  score: string;
}

export interface ResumeProject {
  name: string;
  link: string;
  points: string;
}

export interface Resume {
  name: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  /** Websites and profiles, one per line (LinkedIn, GitHub, portfolio). */
  links: string;
  summary: string;
  jobs: ResumeJob[];
  education: ResumeEducation[];
  projects: ResumeProject[];
  /** Comma or line separated. */
  skills: string;
  /** One per line. */
  certifications: string;
  achievements: string;
  languages: string;
}

export type ResumeStyle = "classic" | "modern" | "compact";

export const emptyJob = (): ResumeJob => ({ role: "", org: "", location: "", start: "", end: "", points: "" });
export const emptyEducation = (): ResumeEducation => ({ degree: "", school: "", start: "", end: "", score: "" });
export const emptyProject = (): ResumeProject => ({ name: "", link: "", points: "" });

export const EMPTY_RESUME: Resume = {
  name: "",
  headline: "",
  email: "",
  phone: "",
  location: "",
  links: "",
  summary: "",
  jobs: [emptyJob()],
  education: [emptyEducation()],
  projects: [],
  skills: "",
  certifications: "",
  achievements: "",
  languages: "",
};

const lines = (s: string) =>
  s
    .split("\n")
    .map((l) => l.replace(/^\s*[-•*·]\s*/, "").trim())
    .filter(Boolean);
export const skillList = (s: string) =>
  s
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
const dates = (a: string, b: string) => [a.trim(), b.trim()].filter(Boolean).join(" – ");
const filled = <T extends object>(list: T[]) => list.filter((x) => Object.values(x).some((v) => typeof v === "string" && v.trim()));

/** Problems worth fixing before downloading (not blocking, except a missing name). */
export function resumeChecks(r: Resume): { level: "error" | "warn"; text: string }[] {
  const out: { level: "error" | "warn"; text: string }[] = [];
  if (!r.name.trim()) out.push({ level: "error", text: "Add your name." });
  if (!r.email.trim() && !r.phone.trim()) out.push({ level: "warn", text: "Add an email or phone number so recruiters can reach you." });
  if (r.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email.trim())) out.push({ level: "warn", text: "The email address doesn't look right." });
  const jobs = filled(r.jobs);
  if (jobs.some((j) => !lines(j.points).length)) out.push({ level: "warn", text: "Add 2–4 achievement lines to each job; ATS and recruiters look for them." });
  const allPoints = jobs.flatMap((j) => lines(j.points)).concat(filled(r.projects).flatMap((p) => lines(p.points)));
  if (allPoints.length >= 3 && !allPoints.some((p) => /\d/.test(p))) out.push({ level: "warn", text: "Add numbers to a few achievements (%, ₹, users, time saved): they stand out." });
  if (!skillList(r.skills).length) out.push({ level: "warn", text: "List your key skills: they are what an ATS matches against the job." });
  if (r.summary.trim().split(/\s+/).length > 90) out.push({ level: "warn", text: "Keep the summary under about 80 words." });
  return out;
}

// ─── PDF ──────────────────────────────────────────────────────────

const A4: [number, number] = [595.28, 841.89];

interface Look {
  regular: StandardFonts;
  bold: StandardFonts;
  italic: StandardFonts;
  accent: RGB;
  nameSize: number;
  body: number;
  margin: number;
  centered: boolean;
  gap: number;
}

const LOOKS: Record<ResumeStyle, Look> = {
  classic: { regular: StandardFonts.TimesRoman, bold: StandardFonts.TimesRomanBold, italic: StandardFonts.TimesRomanItalic, accent: rgb(0.1, 0.1, 0.1), nameSize: 22, body: 10.5, margin: 50, centered: true, gap: 14 },
  modern: { regular: StandardFonts.Helvetica, bold: StandardFonts.HelveticaBold, italic: StandardFonts.HelveticaOblique, accent: rgb(0.14, 0.32, 0.72), nameSize: 24, body: 9.8, margin: 46, centered: false, gap: 13 },
  compact: { regular: StandardFonts.Helvetica, bold: StandardFonts.HelveticaBold, italic: StandardFonts.HelveticaOblique, accent: rgb(0.1, 0.1, 0.1), nameSize: 18, body: 9.2, margin: 36, centered: false, gap: 9 },
};

export async function resumePdf(r: Resume, style: ResumeStyle): Promise<Uint8Array> {
  if (!r.name.trim()) throw new Error("Add your name.");
  const L = LOOKS[style];
  const doc = await PDFDocument.create();
  doc.setTitle(`${r.name.trim()} – Resume`);
  doc.setAuthor(r.name.trim());
  doc.setCreator("Fusion Office");
  const reg = await doc.embedFont(L.regular);
  const bold = await doc.embedFont(L.bold);
  const ital = await doc.embedFont(L.italic);
  const ink = rgb(0.1, 0.11, 0.13);
  const soft = rgb(0.33, 0.35, 0.4);
  const [W, H] = A4;
  const M = L.margin;
  const maxW = W - 2 * M;
  let page: PDFPage = doc.addPage(A4);
  let y = H - M;

  // Standard fonts cover Latin text; anything else becomes "?" rather than failing.
  const clean = (font: PDFFont, s: string) =>
    [...s.replace(/₹/g, "Rs.").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/•/g, "-")]
      .map((ch) => {
        try {
          font.encodeText(ch);
          return ch;
        } catch {
          return "?";
        }
      })
      .join("");
  const width = (s: string, size: number, font: PDFFont) => font.widthOfTextAtSize(clean(font, s), size);
  const wrap = (s: string, w: number, size: number, font: PDFFont) => {
    const out: string[] = [];
    let line = "";
    for (const word of s.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (width(next, size, font) <= w || !line) line = next;
      else {
        out.push(line);
        line = word;
      }
    }
    if (line) out.push(line);
    return out;
  };
  const room = (h: number) => {
    if (y - h < M) {
      page = doc.addPage(A4);
      y = H - M;
    }
  };
  const text = (s: string, x: number, size: number, font: PDFFont, color = ink) => page.drawText(clean(font, s), { x, y, size, font, color });
  const right = (s: string, size: number, font: PDFFont, color = soft) => text(s, W - M - width(s, size, font), size, font, color);
  const para = (s: string, size = L.body, font = reg, indent = 0, color = ink) => {
    for (const l of wrap(s, maxW - indent, size, font)) {
      room(size * 1.45);
      text(l, M + indent, size, font, color);
      y -= size * 1.42;
    }
  };
  const bullets = (items: string[]) => {
    for (const item of items) {
      const ls = wrap(item, maxW - 12, L.body, reg);
      ls.forEach((l, i) => {
        room(L.body * 1.45);
        if (i === 0) text("-", M + 2, L.body, reg);
        text(l, M + 12, L.body, reg);
        y -= L.body * 1.42;
      });
    }
  };
  const heading = (s: string) => {
    room(L.gap + 30);
    y -= L.gap;
    text(s.toUpperCase(), M, L.body + 1.6, bold, L.accent);
    y -= 5;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: style === "modern" ? 1.1 : 0.6, color: style === "modern" ? L.accent : soft });
    y -= L.body * 1.6;
  };
  /** Bold title on the left, dates on the right; second line in italics. */
  const entry = (title: string, when: string, sub: string) => {
    room(L.body * 4);
    const dateW = when ? width(when, L.body, reg) + 12 : 0;
    const titleLines = wrap(title, maxW - dateW, L.body + 0.6, bold);
    titleLines.forEach((t, i) => {
      text(t, M, L.body + 0.6, bold);
      if (i === 0 && when) right(when, L.body, reg);
      y -= (L.body + 0.6) * 1.38;
    });
    if (sub) {
      for (const l of wrap(sub, maxW, L.body, ital)) {
        room(L.body * 1.4);
        text(l, M, L.body, ital, soft);
        y -= L.body * 1.4;
      }
    }
    y -= 1;
  };

  // ── Header ──
  const contact = [r.email, r.phone, r.location].map((s) => s.trim()).filter(Boolean);
  const links = lines(r.links);
  const centre = (s: string, size: number, font: PDFFont, color = ink) => text(s, L.centered ? (W - width(s, size, font)) / 2 : M, size, font, color);
  centre(r.name.trim(), L.nameSize, bold, style === "modern" ? L.accent : ink);
  y -= L.nameSize * 1.05;
  if (r.headline.trim()) {
    centre(r.headline.trim(), L.body + 2, reg, soft);
    y -= (L.body + 2) * 1.5;
  }
  for (const row of [contact.join("  |  "), links.join("  |  ")].filter(Boolean)) {
    for (const l of wrap(row, maxW, L.body, reg)) {
      centre(l, L.body, reg, soft);
      y -= L.body * 1.45;
    }
  }

  if (r.summary.trim()) {
    heading("Summary");
    para(r.summary.trim().replace(/\s+/g, " "));
  }
  const jobs = filled(r.jobs);
  if (jobs.length) {
    heading("Experience");
    for (const j of jobs) {
      entry([j.role, j.org].map((s) => s.trim()).filter(Boolean).join(", "), dates(j.start, j.end), j.location.trim());
      bullets(lines(j.points));
      y -= 4;
    }
  }
  const projects = filled(r.projects);
  if (projects.length) {
    heading("Projects");
    for (const p of projects) {
      entry(p.name.trim(), "", p.link.trim());
      bullets(lines(p.points));
      y -= 4;
    }
  }
  const edu = filled(r.education);
  if (edu.length) {
    heading("Education");
    for (const e of edu) entry([e.degree, e.school].map((s) => s.trim()).filter(Boolean).join(", "), dates(e.start, e.end), e.score.trim());
  }
  const skills = skillList(r.skills);
  if (skills.length) {
    heading("Skills");
    para(skills.join(", "));
  }
  for (const [title, value] of [
    ["Certifications", r.certifications],
    ["Achievements", r.achievements],
  ] as const) {
    if (lines(value).length) {
      heading(title);
      bullets(lines(value));
    }
  }
  if (skillList(r.languages).length) {
    heading("Languages");
    para(skillList(r.languages).join(", "));
  }
  return doc.save();
}

// ─── Word (.docx) ─────────────────────────────────────────────────

export async function resumeDocx(r: Resume, style: ResumeStyle): Promise<Uint8Array> {
  if (!r.name.trim()) throw new Error("Add your name.");
  const d = await import("docx");
  const font = style === "classic" ? "Times New Roman" : "Calibri";
  const accent = style === "modern" ? "2452B8" : "1A1A1A";
  const size = style === "compact" ? 19 : 21; // half-points
  const run = (t: string, o: { bold?: boolean; italics?: boolean; color?: string; size?: number } = {}) => new d.TextRun({ text: t, font, size: o.size ?? size, bold: o.bold, italics: o.italics, color: o.color });
  const center = style === "classic" ? d.AlignmentType.CENTER : d.AlignmentType.LEFT;
  const children: InstanceType<typeof d.Paragraph>[] = [];
  const margin = style === "compact" ? 720 : 900;
  const tab = 11906 - 2 * margin;
  const heading = (t: string) =>
    children.push(
      new d.Paragraph({
        spacing: { before: 220, after: 80 },
        border: { bottom: { style: d.BorderStyle.SINGLE, size: 6, color: accent, space: 2 } },
        children: [run(t.toUpperCase(), { bold: true, color: accent, size: size + 3 })],
      }),
    );
  const bullet = (t: string) => children.push(new d.Paragraph({ bullet: { level: 0 }, spacing: { after: 30 }, children: [run(t)] }));
  // Dates sit at the right margin with a right tab stop.
  const entry = (title: string, when: string, sub: string) => {
    children.push(new d.Paragraph({ tabStops: [{ type: d.TabStopType.RIGHT, position: tab }], spacing: { before: 100 }, children: [run(title, { bold: true }), ...(when ? [run(`\t${when}`, { color: "555555" })] : [])] }));
    if (sub) children.push(new d.Paragraph({ children: [run(sub, { italics: true, color: "555555" })] }));
  };

  children.push(new d.Paragraph({ alignment: center, children: [run(r.name.trim(), { bold: true, size: style === "compact" ? 36 : 44, color: style === "modern" ? accent : undefined })] }));
  if (r.headline.trim()) children.push(new d.Paragraph({ alignment: center, children: [run(r.headline.trim(), { color: "555555", size: size + 3 })] }));
  const contact = [r.email, r.phone, r.location].map((s) => s.trim()).filter(Boolean).join("  |  ");
  if (contact) children.push(new d.Paragraph({ alignment: center, children: [run(contact, { color: "555555" })] }));
  if (lines(r.links).length) children.push(new d.Paragraph({ alignment: center, children: [run(lines(r.links).join("  |  "), { color: "555555" })] }));
  if (r.summary.trim()) {
    heading("Summary");
    children.push(new d.Paragraph({ children: [run(r.summary.trim().replace(/\s+/g, " "))] }));
  }
  const jobs = filled(r.jobs);
  if (jobs.length) {
    heading("Experience");
    for (const j of jobs) {
      entry([j.role, j.org].map((s) => s.trim()).filter(Boolean).join(", "), dates(j.start, j.end), j.location.trim());
      lines(j.points).forEach(bullet);
    }
  }
  const projects = filled(r.projects);
  if (projects.length) {
    heading("Projects");
    for (const p of projects) {
      entry(p.name.trim(), "", p.link.trim());
      lines(p.points).forEach(bullet);
    }
  }
  const edu = filled(r.education);
  if (edu.length) {
    heading("Education");
    for (const e of edu) entry([e.degree, e.school].map((s) => s.trim()).filter(Boolean).join(", "), dates(e.start, e.end), e.score.trim());
  }
  if (skillList(r.skills).length) {
    heading("Skills");
    children.push(new d.Paragraph({ children: [run(skillList(r.skills).join(", "))] }));
  }
  for (const [title, value] of [
    ["Certifications", r.certifications],
    ["Achievements", r.achievements],
  ] as const) {
    if (lines(value).length) {
      heading(title);
      lines(value).forEach(bullet);
    }
  }
  if (skillList(r.languages).length) {
    heading("Languages");
    children.push(new d.Paragraph({ children: [run(skillList(r.languages).join(", "))] }));
  }
  const docx = new d.Document({
    creator: "Fusion Office",
    title: `${r.name.trim()} – Resume`,
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: margin, bottom: margin, left: margin, right: margin } } }, children }],
  });
  return new Uint8Array(await d.Packer.toArrayBuffer(docx));
}
