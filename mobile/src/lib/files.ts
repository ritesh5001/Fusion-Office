import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import * as IntentLauncher from "expo-intent-launcher";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getContentUriAsync } from "expo-file-system/legacy";
import { canRenderPdf, canSaveToDownloads, saveToDownloads } from "../../modules/fo-downloads";
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

export const guessMime = (name: string) => {
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

export const toPicked = (uri: string, name: string, size?: number | null, mime?: string | null): PickedFile => {
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

/**
 * Word, Excel, PowerPoint, CSV and Markdown files: the app shows them with the
 * website's document viewer (in a web view). The file is handed to the page
 * directly and isn't uploaded; old .doc/.xls/.ppt are converted on the server.
 */
export function shownBySite(f: Pick<SavedFile, "name">) {
  return /\.(docx|doc|odt|rtf|xlsx|xlsm|xls|ods|csv|tsv|pptx|ppt|odp|md|markdown)$/i.test(f.name);
}

/**
 * Can the in-app viewer show this file? Office documents (see shownBySite),
 * images and text everywhere; PDFs on
 * iOS (its web view renders them) and on Android through the app's own page
 * renderer. Other types open in the phone's app for them.
 */
export function viewableInApp(f: Pick<SavedFile, "mimeType" | "name">) {
  if (shownBySite(f)) return true;
  if (f.mimeType.startsWith("image/") || f.mimeType.startsWith("text/")) return true;
  return f.mimeType === "application/pdf" && (Platform.OS === "ios" || canRenderPdf());
}

/**
 * Opens a file in another app (Android): the phone's PDF viewer, Docs, Sheets…
 * Throws a friendly error when nothing on the phone can open it.
 */
export async function openWithApp(f: Pick<SavedFile, "uri" | "mimeType" | "name">) {
  if (Platform.OS !== "android") return shareFile(f);
  const data = await getContentUriAsync(f.uri);
  try {
    await IntentLauncher.startActivityAsync("android.intent.action.VIEW", { data, type: f.mimeType, flags: 1 /* FLAG_GRANT_READ_URI_PERMISSION */ });
  } catch {
    throw new Error(`No app on this phone can open ${(f.name.split(".").pop() ?? "this").toUpperCase()} files. Use Download or Share instead.`);
  }
}

const SAVE_DIR = "fo-save-dir";

/**
 * Download: saves a copy where the person can find it.
 * Android 10+: straight into the public Downloads folder, one tap, no picker.
 * Older Android: into a folder they pick once, remembered after that.
 * iOS has no Downloads folder, so the share sheet opens on "Save to Files".
 * Resolves with where it went, or null if they cancelled.
 */
export async function saveToDevice(f: Pick<SavedFile, "uri" | "mimeType" | "name">): Promise<string | null> {
  if (Platform.OS !== "android") {
    await shareFile(f);
    return null;
  }
  if (canSaveToDownloads()) {
    try {
      const kept = await saveToDownloads(f.uri, f.name, f.mimeType);
      return `Downloads as ${kept}`;
    } catch (e) {
      throw new Error((e as Error).message || "Couldn't save to Downloads.");
    }
  }
  const bytes = await new File(f.uri).bytes();
  let remembered = await AsyncStorage.getItem(SAVE_DIR).catch(() => null);
  for (let attempt = 0; attempt < 2; attempt++) {
    let dir: Directory;
    try {
      dir = remembered ? new Directory(remembered) : await Directory.pickDirectoryAsync();
    } catch {
      return null; // Picker cancelled.
    }
    try {
      const out = dir.createFile(f.name, f.mimeType);
      out.write(bytes);
      await AsyncStorage.setItem(SAVE_DIR, dir.uri).catch(() => {});
      return decodeURIComponent(dir.uri).split(/[/:]/).filter(Boolean).pop() ?? "your folder";
    } catch {
      // The remembered folder is gone or no longer allowed: ask again once.
      if (!remembered) throw new Error("Couldn't save the file there. Try another folder.");
      remembered = null;
      await AsyncStorage.removeItem(SAVE_DIR).catch(() => {});
    }
  }
  return null;
}
