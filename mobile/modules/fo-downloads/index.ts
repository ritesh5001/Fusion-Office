import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";

/** Native helper that saves files into the public Downloads folder (Android 10+). */
interface FoDownloads {
  isSupported(): boolean;
  saveToDownloads(sourceUri: string, name: string, mimeType: string): Promise<string>;
  pdfPages?(uri: string): Promise<[number, number][]>;
  renderPdfPage?(uri: string, index: number, width: number): Promise<string>;
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
