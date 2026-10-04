import { useState } from "react";
import { Alert, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { Camera, ClipboardPaste, FolderOpen, History, Images, type LucideIcon } from "lucide-react-native";
import { C } from "@/theme";
import { useSession } from "@/lib/session";
import { useReduced } from "@/lib/motion";
import { clipboardImageToFile, pickDocuments, pickPhotos, takePhoto, type PickedFile } from "@/lib/files";
import { Sheet } from "./Sheet";
import { PressScale, T } from "./ui";
import { openTool } from "./DropStage";

const TYPES = {
  pdf: "application/pdf",
  image: "image/*",
  document: "*/*",
  any: "*/*",
} as const;

/**
 * "Add a file": Files, Photos, scanning with the camera (several pages, one
 * PDF), pasting an image, or a recent result. Opened by the drop card and the
 * + button in the tab bar.
 */
export function AddSheet() {
  const { sheetOpen, closeSheet, stage } = useSession();
  const reduced = useReduced();
  const [pages, setPages] = useState<PickedFile[]>([]);

  const done = (files: PickedFile[]) => {
    if (!files.length) return;
    closeSheet();
    stage(files);
    router.navigate("/");
  };

  const guard = (fn: () => Promise<void>) => async () => {
    try {
      await fn();
    } catch (e) {
      Alert.alert("Couldn't open that", (e as Error).message);
    }
  };

  const scan = guard(async () => {
    const photo = await takePhoto();
    if (photo) setPages((p) => [...p, photo]);
  });

  const finishScan = () => {
    const shot = pages;
    setPages([]);
    closeSheet();
    stage(shot);
    openTool("scan-to-pdf", true);
  };

  const paste = guard(async () => {
    if (!(await Clipboard.hasImageAsync())) throw new Error("There's no image on the clipboard. Copy a photo or screenshot first.");
    const img = await Clipboard.getImageAsync({ format: "png" });
    if (!img) throw new Error("The clipboard image couldn't be read.");
    done([clipboardImageToFile(img.data)]);
  });

  const rows: { icon: LucideIcon; title: string; text: string; tint: string; onPress: () => void }[] = [
    { icon: FolderOpen, title: "Choose from Files", text: "PDF, Word, Excel, PowerPoint, images", tint: "#80a6ff", onPress: guard(async () => done(await pickDocuments(TYPES.any))) },
    { icon: Images, title: "Choose from Photos", text: "One or several photos", tint: "#b7a2ff", onPress: guard(async () => done(await pickPhotos())) },
    { icon: Camera, title: pages.length ? "Scan another page" : "Scan with camera", text: pages.length ? `${pages.length} page${pages.length === 1 ? "" : "s"} so far` : "Turn paper into a PDF", tint: "#63d5cf", onPress: scan },
    { icon: ClipboardPaste, title: "Paste from clipboard", text: "A copied photo or screenshot", tint: "#ffcb66", onPress: paste },
    {
      icon: History, title: "Recent files", text: "Results you made on this device", tint: "#cdf564",
      onPress: () => {
        closeSheet();
        router.navigate("/recent");
      },
    },
  ];

  return (
    <Sheet open={sheetOpen} onClose={() => (setPages([]), closeSheet())}>
      <T weight="display" style={{ fontSize: 22, letterSpacing: -0.5 }}>Add a file</T>
      <T style={{ marginTop: 4, fontSize: 13.5, color: C.fgMuted }}>It stays on this device unless a tool says it converts on our server.</T>
      <View style={{ marginTop: 14, gap: 8 }}>
        {rows.map((r, i) => (
          <Animated.View key={r.title} entering={reduced ? undefined : FadeInDown.delay(i * 40).duration(260)}>
            <PressScale onPress={r.onPress} style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 60, borderRadius: 18, backgroundColor: C.raised, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: r.tint, alignItems: "center", justifyContent: "center" }}>
                <r.icon size={20} color="#0d0f14" />
              </View>
              <View style={{ flex: 1 }}>
                <T weight="semibold" style={{ fontSize: 15 }}>{r.title}</T>
                <T style={{ fontSize: 12.5, color: C.fgMuted }}>{r.text}</T>
              </View>
            </PressScale>
          </Animated.View>
        ))}
      </View>
      {pages.length > 0 && (
        <PressScale onPress={finishScan} style={{ marginTop: 12, height: 52, borderRadius: 26, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" }}>
          <T weight="bold" style={{ fontSize: 15.5, color: C.onAccent }}>Make PDF ({pages.length} page{pages.length === 1 ? "" : "s"})</T>
        </PressScale>
      )}
    </Sheet>
  );
}
