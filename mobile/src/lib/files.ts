import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { Directory, File, Paths } from "expo-file-system";
import { kindOf, type FileKind } from "./tools";

/** A file the user picked: it stays on the device; only its local URI is held. */
export interface PickedFile {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
  kind: FileKind;
}

/** A file a tool produced, saved in the app's own documents folder. */
export interface SavedFile {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
}

const guessMime = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", gif: "image/gif",
    zip: "application/zip", txt: "text/plain", md: "text/markdown", csv: "text/csv",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };
  return map[ext] ?? "application/octet-stream";
};

const toPicked = (uri: string, name: string, size?: number | null, mime?: string | null): PickedFile => {
  const mimeType = mime || guessMime(name);
  return { uri, name, size: size ?? 0, mimeType, kind: kindOf(name, mimeType) };
};

/** Files app / Google Drive / iCloud, any type (or limited to `types`). */
export async function pickDocuments(types: string | string[] = "*/*", multiple = true): Promise<PickedFile[]> {
  const res = await DocumentPicker.getDocumentAsync({ type: types, multiple, copyToCacheDirectory: true });
  if (res.canceled) return [];
  return res.assets.map((a) => toPicked(a.uri, a.name, a.size, a.mimeType));
}

export async function pickPhotos(multiple = true): Promise<PickedFile[]> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: multiple, quality: 1 });
  if (res.canceled) return [];
  return res.assets.map((a, i) => toPicked(a.uri, a.fileName ?? `photo-${Date.now()}-${i + 1}.jpg`, a.fileSize, a.mimeType ?? "image/jpeg"));
}

/** One page of a document scan: a camera photo. Returns null if cancelled or not allowed. */
export async function takePhoto(): Promise<PickedFile | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new Error("Camera access is off. Turn it on in Settings to scan documents.");
  const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.85 });
  if (res.canceled) return null;
  const a = res.assets[0];
  return toPicked(a.uri, `scan-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.jpg`, a.fileSize, "image/jpeg");
}

export const readBytes = (uri: string) => new File(uri).bytes();

/** A pasted image (base64 PNG, with or without a data: prefix) as a picked file. */
export function clipboardImageToFile(data: string): PickedFile {
  const file = new File(Paths.cache, `pasted-${Date.now()}.png`);
  file.create();
  file.write(data.replace(/^data:image\/\w+;base64,/, ""), { encoding: "base64" });
  return { uri: file.uri, name: "pasted-image.png", size: file.size ?? 0, mimeType: "image/png", kind: "image" };
}

const outputs = () => {
  const dir = new Directory(Paths.document, "outputs");
  dir.create({ idempotent: true, intermediates: true });
  return dir;
};

/** Saves a result next to earlier ones, without overwriting (report.pdf → report (2).pdf). */
export function saveOutput(name: string, content: Uint8Array | string, mimeType = guessMime(name), base64 = false): SavedFile {
  const dir = outputs();
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let file = new File(dir, name);
  for (let n = 2; file.exists; n++) file = new File(dir, `${stem} (${n})${ext}`);
  file.create();
  if (typeof content === "string") file.write(content, base64 ? { encoding: "base64" } : undefined);
  else file.write(content);
  return { uri: file.uri, name: file.name, size: file.size ?? (typeof content === "string" ? content.length : content.byteLength), mimeType };
}

export function deleteFile(uri: string) {
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    /* already gone */
  }
}

/** Removes every saved result from this device. */
export function deleteAllOutputs() {
  const dir = new Directory(Paths.document, "outputs");
  if (dir.exists) dir.delete();
}

const UTI: Record<string, string> = { "application/pdf": "com.adobe.pdf", "image/jpeg": "public.jpeg", "image/png": "public.png", "application/zip": "public.zip-archive" };

/** The system share sheet: save to Files, send on WhatsApp, Mail, Drive… */
export async function shareFile(f: Pick<SavedFile, "uri" | "mimeType" | "name">) {
  if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing isn't available on this device.");
  await Sharing.shareAsync(f.uri, { mimeType: f.mimeType, UTI: UTI[f.mimeType], dialogTitle: f.name });
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export const stem = (name: string) => name.replace(/\.[^.]+$/, "");
