"use client";

import { apiFetch } from "../api";

export type ServerTarget = "pdf" | "docx" | "xlsx" | "pptx";

/**
 * Convert an office file on the server (LibreOffice): to PDF for export, or
 * from old formats (.doc, .xls, .ppt, OpenDocument) to the modern ones the
 * editors open.
 */
export async function convertOnServer(name: string, bytes: Uint8Array, to: ServerTarget): Promise<Uint8Array> {
  const res = await apiFetch(`/api/convert/office?to=${to}`, {
    method: "POST",
    headers: { "content-type": "application/octet-stream", "x-filename": encodeURIComponent(name) },
    body: new Blob([bytes as BlobPart]),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? (res.status === 503 ? "Conversion isn't available on this server yet." : `The server couldn't convert this file (${res.status}).`));
  }
  return new Uint8Array(await res.arrayBuffer());
}

/** Old or OpenDocument formats that need the server before editing. */
export const LEGACY: Record<string, ServerTarget> = { doc: "docx", odt: "docx", rtf: "docx", xls: "xlsx", ods: "xlsx", ppt: "pptx", odp: "pptx" };

export const extOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";
