import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";

/** Native helper that saves files into the public Downloads folder (Android 10+). */
interface FoDownloads {
  isSupported(): boolean;
  saveToDownloads(sourceUri: string, name: string, mimeType: string): Promise<string>;
}

const native = Platform.OS === "android" ? requireOptionalNativeModule<FoDownloads>("FoDownloads") : null;

/** True when files can be saved straight into Downloads without a picker. */
export const canSaveToDownloads = () => !!native?.isSupported();

/** Saves a copy into Downloads and resolves with the name Android gave it. */
export const saveToDownloads = (sourceUri: string, name: string, mimeType: string) => native!.saveToDownloads(sourceUri, name, mimeType);
