"use client";

/** Text tools: Unicode ↔ Kruti Dev and the resume builder. */
import { useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PDF } from "@/lib/tools/files";
import { EMPTY_RESUME, emptyEducation, emptyJob, emptyProject, resumeChecks, type Resume, type ResumeStyle } from "@/lib/tools/resume";
import type { LoadedFile, ToolSpec } from "./ToolRunner";
import { Segmented, TextArea, TextInput } from "./controls";

const Note = ({ children }: { children: React.ReactNode }) => <p className="text-[12px] leading-relaxed text-fg-muted">{children}</p>;
const Heading = ({ children }: { children: React.ReactNode }) => <p className="border-t border-line pt-4 text-[13px] font-semibold text-fg">{children}</p>;
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// ─── Kruti Dev ──────────────────────────────────────────────────────

type KrutiOpts = { direction: "toKruti" | "toUnicode"; text: string };
const kruti = (direction: KrutiOpts["direction"]): ToolSpec<KrutiOpts> => ({
  action: "Convert",
  noFiles: true,
  defaults: { direction, text: "" },
  Options: ({ options: o, set }) => (
    <>
      <Segmented
        label="Convert"
        value={o.direction}
        onChange={(d) => set({ direction: d })}
        options={[
          { value: "toKruti", label: "Unicode → Kruti Dev", hint: "For Kruti Dev 010 documents" },
          { value: "toUnicode", label: "Kruti Dev → Unicode", hint: "For WhatsApp, email, web" },
        ]}
      />
      <TextArea
        label={o.direction === "toKruti" ? "Hindi text (Unicode)" : "Kruti Dev text"}
        hint={o.direction === "toKruti" ? "Paste ordinary Hindi, like “भारत”." : "Paste text typed in Kruti Dev 010; it looks like “Hkkjr” in other fonts."}
        value={o.text}
        onChange={(text) => set({ text })}
        rows={9}
        placeholder={o.direction === "toKruti" ? "मेरा भारत महान" : "esjk Hkkjr egku"}
      />
      <Note>
        {o.direction === "toKruti"
          ? "After converting, paste the result into Word or your document and set the font to Kruti Dev 010."
          : "Kruti Dev text only looks like Hindi in the Kruti Dev font. Unicode Hindi works everywhere and can be searched."}
      </Note>
    </>
  ),
  validate: (_f, o) => (o.text.trim() ? null : "Paste some text to convert."),
  run: async (_f, o) => {
    const k = await import("@/lib/tools/krutidev");
    const out = o.direction === "toKruti" ? k.unicodeToKrutidev(o.text) : k.krutidevToUnicode(o.text);
    const name = o.direction === "toKruti" ? "krutidev.txt" : "unicode-hindi.txt";
    const hint = o.direction === "toUnicode" && !k.looksLikeKrutidev(o.text) && !/[ऀ-ॿ]/.test(o.text) ? " This didn't look like Kruti Dev text, so check the result." : "";
    const wrong = o.direction === "toKruti" && !/[ऀ-ॿ]/.test(o.text) ? " There was no Hindi (Unicode) text to convert. Did you mean Kruti Dev → Unicode?" : "";
    return { files: [{ name, bytes: new TextEncoder().encode(out), type: "text/plain" }], text: { content: out, filename: name }, summary: `Converted ${o.text.length.toLocaleString("en-IN")} characters.${hint}${wrong}` };
  },
});

// ─── Resume builder ─────────────────────────────────────────────────

const STORE = "fusion-office.resume";
type ResumeOpts = Resume & { style: ResumeStyle; format: "pdf" | "docx" | "both"; loaded: boolean };

const box = "rounded-xl bg-sunken/60 p-3 ring-1 ring-line space-y-2";
const small = "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold text-brand-300 ring-1 ring-brand-500/35 hover:bg-brand-500/15";
const del = "flex h-8 items-center gap-1 rounded-lg px-2 text-[12px] text-fg-muted hover:bg-red-500/10 hover:text-red-300";

function ResumeOptions({ options: o, set }: { options: ResumeOpts; set: (p: Partial<ResumeOpts>) => void; files: LoadedFile[] }) {
  // Remember the resume on this device, so it can be updated later.
  useEffect(() => {
    if (o.loaded) return;
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) ?? "null");
      set({ ...(saved ?? {}), loaded: true });
    } catch {
      set({ loaded: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!o.loaded) return;
    const t = setTimeout(() => {
      try {
        const { loaded: _l, ...data } = o;
        void _l;
        localStorage.setItem(STORE, JSON.stringify(data));
      } catch {
        /* storage full or blocked */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [o]);
  const checks = resumeChecks(o);
  const setJob = (i: number, p: Partial<Resume["jobs"][number]>) => set({ jobs: o.jobs.map((j, k) => (k === i ? { ...j, ...p } : j)) });
  const setEdu = (i: number, p: Partial<Resume["education"][number]>) => set({ education: o.education.map((j, k) => (k === i ? { ...j, ...p } : j)) });
  const setProj = (i: number, p: Partial<Resume["projects"][number]>) => set({ projects: o.projects.map((j, k) => (k === i ? { ...j, ...p } : j)) });
  return (
    <>
      <Segmented
        label="Look"
        value={o.style}
        onChange={(style) => set({ style })}
        options={[
          { value: "classic", label: "Classic", hint: "Serif, centred" },
          { value: "modern", label: "Modern", hint: "Blue headings" },
          { value: "compact", label: "Compact", hint: "Fits more on a page" },
        ]}
      />
      <TextInput label="Full name" value={o.name} onChange={(name) => set({ name })} autoComplete="name" />
      <TextInput label="Headline" hint="Your role or target role." value={o.headline} onChange={(headline) => set({ headline })} placeholder="Frontend developer · React, TypeScript" />
      <div className="grid grid-cols-2 gap-3">
        <TextInput label="Email" value={o.email} onChange={(email) => set({ email })} autoComplete="email" />
        <TextInput label="Phone" value={o.phone} onChange={(phone) => set({ phone })} autoComplete="tel" />
      </div>
      <TextInput label="City" value={o.location} onChange={(location) => set({ location })} placeholder="Bengaluru, India" />
      <TextArea label="Links" hint="One per line: LinkedIn, GitHub, portfolio." value={o.links} onChange={(links) => set({ links })} rows={2} />
      <TextArea label="Summary" hint="2–4 sentences: what you do and what you're good at." value={o.summary} onChange={(summary) => set({ summary })} rows={3} />

      <Heading>Experience</Heading>
      {o.jobs.map((j, i) => (
        <div key={i} className={box}>
          <div className="grid grid-cols-2 gap-2">
            <TextInput label="Role" value={j.role} onChange={(role) => setJob(i, { role })} />
            <TextInput label="Company" value={j.org} onChange={(org) => setJob(i, { org })} />
            <TextInput label="From" value={j.start} onChange={(start) => setJob(i, { start })} placeholder="Jun 2023" />
            <TextInput label="To" value={j.end} onChange={(end) => setJob(i, { end })} placeholder="Present" />
          </div>
          <TextInput label="Location" value={j.location} onChange={(location) => setJob(i, { location })} />
          <TextArea label="Achievements" hint="One per line. Start with a verb; add numbers." value={j.points} onChange={(points) => setJob(i, { points })} rows={4} placeholder={"Cut page load time by 40% by…\nLed a team of 4 to ship…"} />
          <button type="button" className={del} onClick={() => set({ jobs: o.jobs.filter((_, k) => k !== i) })}>
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        </div>
      ))}
      <button type="button" className={small} onClick={() => set({ jobs: [...o.jobs, emptyJob()] })}>
        <Plus className="h-4 w-4" /> Add a job
      </button>

      <Heading>Education</Heading>
      {o.education.map((e, i) => (
        <div key={i} className={box}>
          <TextInput label="Degree or class" value={e.degree} onChange={(degree) => setEdu(i, { degree })} placeholder="B.Tech, Computer Science" />
          <TextInput label="College or school" value={e.school} onChange={(school) => setEdu(i, { school })} />
          <div className="grid grid-cols-3 gap-2">
            <TextInput label="From" value={e.start} onChange={(start) => setEdu(i, { start })} placeholder="2019" />
            <TextInput label="To" value={e.end} onChange={(end) => setEdu(i, { end })} placeholder="2023" />
            <TextInput label="Score" value={e.score} onChange={(score) => setEdu(i, { score })} placeholder="8.4 CGPA" />
          </div>
          <button type="button" className={del} onClick={() => set({ education: o.education.filter((_, k) => k !== i) })}>
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        </div>
      ))}
      <button type="button" className={small} onClick={() => set({ education: [...o.education, emptyEducation()] })}>
        <Plus className="h-4 w-4" /> Add education
      </button>

      <Heading>Projects (optional)</Heading>
      {o.projects.map((p, i) => (
        <div key={i} className={box}>
          <TextInput label="Project" value={p.name} onChange={(name) => setProj(i, { name })} />
          <TextInput label="Link" value={p.link} onChange={(link) => setProj(i, { link })} />
          <TextArea label="What you did" value={p.points} onChange={(points) => setProj(i, { points })} rows={3} />
          <button type="button" className={del} onClick={() => set({ projects: o.projects.filter((_, k) => k !== i) })}>
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        </div>
      ))}
      <button type="button" className={small} onClick={() => set({ projects: [...o.projects, emptyProject()] })}>
        <Plus className="h-4 w-4" /> Add a project
      </button>

      <Heading>Skills and more</Heading>
      <TextArea label="Skills" hint="Separate with commas. Use the words job posts use." value={o.skills} onChange={(skills) => set({ skills })} rows={2} placeholder="React, TypeScript, SQL, Figma" />
      <TextArea label="Certifications (optional)" hint="One per line." value={o.certifications} onChange={(certifications) => set({ certifications })} rows={2} />
      <TextArea label="Achievements (optional)" hint="One per line." value={o.achievements} onChange={(achievements) => set({ achievements })} rows={2} />
      <TextInput label="Languages (optional)" value={o.languages} onChange={(languages) => set({ languages })} placeholder="English, Hindi, Marathi" />

      <Segmented label="Download as" value={o.format} onChange={(format) => set({ format })} options={[{ value: "pdf", label: "PDF" }, { value: "docx", label: "Word" }, { value: "both", label: "Both" }]} />
      {checks.length > 0 && (
        <ul className="space-y-1 rounded-lg bg-amber-500/10 px-3 py-2 text-[12px] leading-relaxed text-amber-200">
          {checks.map((c) => (
            <li key={c.text}>{c.text}</li>
          ))}
        </ul>
      )}
      <Note>Single column with standard headings and real text, which applicant tracking systems read best. Saved on this device as you type; nothing is uploaded. Check it with the ATS resume checker afterwards.</Note>
    </>
  );
}

const resumeBuilder: ToolSpec<ResumeOpts> = {
  action: "Create resume",
  noFiles: true,
  defaults: { ...EMPTY_RESUME, style: "modern", format: "pdf", loaded: false },
  Options: ResumeOptions,
  validate: (_f, o) => (o.name.trim() ? null : "Add your name."),
  run: async (_f, o) => {
    const r = await import("@/lib/tools/resume");
    const base = `${o.name.trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-")}-resume`;
    const files = [];
    if (o.format !== "docx") files.push({ name: `${base}.pdf`, bytes: await r.resumePdf(o, o.style), type: PDF });
    if (o.format !== "pdf") files.push({ name: `${base}.docx`, bytes: await r.resumeDocx(o, o.style), type: DOCX });
    const pages = o.format !== "docx" ? (await (await import("pdf-lib")).PDFDocument.load(files[0].bytes)).getPageCount() : 0;
    return { files, summary: `${pages ? `${pages} page${pages === 1 ? "" : "s"}. ` : ""}${pages > 2 ? "Most recruiters prefer 1–2 pages; try the Compact look or trim older roles." : "Ready to send."}` };
  },
};

export const TEXT_SPECS = {
  "unicode-to-krutidev": kruti("toKruti"),
  "krutidev-to-unicode": kruti("toUnicode"),
  "resume-builder": resumeBuilder,
};
