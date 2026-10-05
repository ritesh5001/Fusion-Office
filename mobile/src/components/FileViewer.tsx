import { useState } from "react";
import { Alert, Image, Modal, View } from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Download, Share2, X } from "lucide-react-native";
import { C } from "@/theme";
import { formatBytes, openWithApp, saveToDevice, shareFile, viewableInApp, type SavedFile } from "@/lib/files";
import { PressScale, T } from "./ui";

/**
 * Opening a result: images (and PDFs/text on iOS) show in a full-screen viewer
 * inside the app; anything else opens in the phone's own app for that type.
 */
export function useFileActions() {
  const [viewing, setViewing] = useState<SavedFile | null>(null);

  const open = (f: SavedFile) => {
    if (viewableInApp(f)) return setViewing(f);
    openWithApp(f).catch((e: Error) => Alert.alert("Couldn't open the file", e.message));
  };
  const download = async (f: SavedFile) => {
    try {
      const where = await saveToDevice(f);
      if (where) Alert.alert("Downloaded", `Saved to ${where}.`);
    } catch (e) {
      Alert.alert("Couldn't download", (e as Error).message);
    }
  };
  const share = (f: SavedFile) => shareFile(f).catch((e: Error) => Alert.alert("Couldn't share", e.message));

  const viewer = <FileViewer file={viewing} onClose={() => setViewing(null)} onDownload={download} onShare={share} />;
  return { open, download, share, viewer };
}

function FileViewer({ file, onClose, onDownload, onShare }: { file: SavedFile | null; onClose: () => void; onDownload: (f: SavedFile) => void; onShare: (f: SavedFile) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!file} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      {file && (
        <View style={{ flex: 1, backgroundColor: "#05060a", paddingTop: insets.top, paddingBottom: insets.bottom }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
            <PressScale onPress={onClose} accessibilityLabel="Close" style={{ width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: C.raised }}>
              <X size={20} color={C.fg} />
            </PressScale>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T weight="semibold" numberOfLines={1} style={{ fontSize: 15, color: C.fg }}>{file.name}</T>
              <T style={{ fontSize: 12, color: C.fgSubtle }}>{formatBytes(file.size)}</T>
            </View>
            <PressScale onPress={() => onDownload(file)} accessibilityLabel={`Download ${file.name}`} style={{ width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: C.raised }}>
              <Download size={19} color={C.fg} />
            </PressScale>
            <PressScale onPress={() => onShare(file)} accessibilityLabel={`Share ${file.name}`} style={{ width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: C.accent }}>
              <Share2 size={19} color={C.onAccent} />
            </PressScale>
          </View>
          {file.mimeType.startsWith("image/") ? (
            <Image source={{ uri: file.uri }} resizeMode="contain" style={{ flex: 1 }} accessibilityLabel={file.name} />
          ) : (
            <WebView source={{ uri: file.uri }} originWhitelist={["*"]} allowFileAccess allowingReadAccessToURL={file.uri} style={{ flex: 1, backgroundColor: "#05060a" }} />
          )}
        </View>
      )}
    </Modal>
  );
}
