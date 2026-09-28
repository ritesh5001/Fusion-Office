import { zipSync } from "fflate";

/** A file flowing in or out of a tool. */
export interface ToolFile {
  name: string;
  bytes: Uint8Array;
  type: string;
}

export const PDF = "application/pdf";

export async function toToolFile(file: File): Promise<ToolFile> {
  return { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()), type: file.type || guessType(file.name) };
}

export function guessType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    pdf: PDF,
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    md: "text/markdown",
    txt: "text/plain",
    zip: "application/zip",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return (ext && map[ext]) || "application/octet-stream";
}

/** "report.pdf" → "report" */
export const stem = (name: string) => name.replace(/\.[^.]+$/, "");

/** Name for a derived file: stem + suffix + extension. */
export const derived = (name: string, suffix: string, ext = "pdf") => `${stem(name)}${suffix ? `-${suffix}` : ""}.${ext}`;

export function zipFiles(files: ToolFile[], name = "fusion-office.zip"): ToolFile {
  const used = new Set<string>();
  const entries: Record<string, Uint8Array> = {};
  for (const f of files) {
    let n = f.name;
    for (let i = 2; used.has(n); i++) n = `${stem(f.name)} (${i}).${f.name.split(".").pop()}`;
    used.add(n);
    entries[n] = f.bytes;
  }
  return { name, bytes: zipSync(entries, { level: 6 }), type: "application/zip" };
}

export function downloadFile(file: ToolFile) {
  const url = URL.createObjectURL(new Blob([file.bytes as BlobPart], { type: file.type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export const formatBytes = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(2)} MB`;

/** Parse "1-3, 5, 8-10" into groups of 0-based page indexes. */
export function parseRanges(input: string, pageCount: number): number[][] {
  const groups: number[][] = [];
  for (const part of input.split(",").map((s) => s.trim()).filter(Boolean)) {
    const m = part.match(/^(\d+)\s*(?:-\s*(\d+))?$/);
    if (!m) throw new Error(`"${part}" is not a valid page range`);
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    if (a < 1 || b > pageCount || a > b) throw new Error(`Range "${part}" is outside 1–${pageCount}`);
    groups.push(Array.from({ length: b - a + 1 }, (_, i) => a - 1 + i));
  }
  return groups;
}

/** Page selection helper: "all" or a range string → sorted unique 0-based indexes. */
export function selectPages(spec: string | undefined, pageCount: number): number[] {
  if (!spec || spec.trim() === "" || spec.trim().toLowerCase() === "all") return [...Array(pageCount).keys()];
  return [...new Set(parseRanges(spec, pageCount).flat())].sort((a, b) => a - b);
}
