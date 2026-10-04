/**
 * The file picker's filter, as plain extensions.
 *
 * Chrome on macOS opens the picker noticeably slower when `accept` holds MIME
 * types ("application/pdf", "image/*"): it first resolves every matching
 * system file type. A list of extensions opens it at once, and filters the
 * same files.
 */
const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tif", ".tiff", ".svg", ".heic", ".heif", ".avif", ".ico"];

const BY_MIME: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "image/*": IMAGE_EXTS,
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
  "image/svg+xml": [".svg"],
  "text/markdown": [".md", ".markdown"],
  "text/csv": [".csv"],
  "text/plain": [".txt"],
};

export function pickerAccept(accept: string): string {
  const out = new Set<string>();
  for (const raw of accept.split(",")) {
    const t = raw.trim().toLowerCase();
    if (!t) continue;
    // "Any file", or a MIME type we can't spell as extensions: keep the original.
    if (t === "*/*" || (t.includes("/") && !BY_MIME[t])) return accept;
    for (const ext of BY_MIME[t] ?? [t]) out.add(ext);
  }
  return [...out].join(",");
}
