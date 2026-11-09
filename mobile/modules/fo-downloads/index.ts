import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";

/** Native helper that saves files into the public Downloads folder (Android 10+). */
interface FoDownloads {
  isSupported(): boolean;
  saveToDownloads(sourceUri: string, name: string, mimeType: string): Promise<string>;
  pdfPages?(uri: string): Promise<[number, number][]>;
  renderPdfPage?(uri: string, index: number, width: number): Promise<string>;
  takeIncoming?(): Promise<IncomingFile[]>;
  addListener?(event: "onIncoming", listener: () => void): { remove(): void };
}

/** A file another app opened with Fusion Office ("Open with") or shared to it, copied into the cache. */
export interface IncomingFile {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
}

const native = Platform.OS === "android" ? requireOptionalNativeModule<FoDownloads>("FoDownloads") : null;

/** True when files can be saved straight into Downloads without a picker. */
export const canSaveToDownloads = () => !!native?.isSupported();

/** Saves a copy into Downloads and resolves with the name Android gave it. */
export const saveToDownloads = (sourceUri: string, name: string, mimeType: string) => native!.saveToDownloads(sourceUri, name, mimeType);

/** True when this build can draw PDF pages itself (Android, with the page renderer). */
export const canRenderPdf = () => !!native?.pdfPages && !!native?.renderPdfPage;

/** Page sizes (points) of a PDF on the device. */
export const pdfPages = (uri: string) => native!.pdfPages!(uri);

/** One page drawn `width` px wide, as a JPEG file URI in the cache. */
export const renderPdfPage = (uri: string, index: number, width: number) => native!.renderPdfPage!(uri, index, width);

/** Files waiting from "Open with" or "Share" (each handed over once). Empty on iOS and older builds. */
export const takeIncoming = async (): Promise<IncomingFile[]> => (native?.takeIncoming ? native.takeIncoming() : []);

/** Called when a file arrives while the app is already open. */
export const onIncoming = (listener: () => void) => (native?.addListener ? native.addListener("onIncoming", listener) : { remove() {} });
