import { Alert, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Clock, Download, Share2, Trash2 } from "lucide-react-native";
import { C } from "@/theme";
import { layoutMove } from "@/lib/ease";
import { useReduced } from "@/lib/motion";
import { useSession } from "@/lib/session";
import { formatBytes } from "@/lib/files";
import { clearRecents, removeRecent, useRecents } from "@/lib/recents";
import { Screen } from "@/components/Screen";
import { PressScale, T } from "@/components/ui";
import { useFileActions } from "@/components/FileViewer";

const ago = (t: number) => {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(t).toLocaleDateString();
};

/** Results made on this device. Nothing here has left the phone unless you shared it. */
export default function Recent() {
  const items = useRecents();
  const reduced = useReduced();
  const files = useFileActions();
  const { openSheet } = useSession();

  const confirmClear = () =>
    Alert.alert("Delete all local files?", "Every result saved in the app is removed from this device. Files you already shared or saved elsewhere are not affected.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete all", style: "destructive", onPress: () => clearRecents() },
    ]);

  return (
    <Screen>
      <T weight="display" header style={{ marginTop: 8, fontSize: 28, letterSpacing: -0.9 }}>Recent</T>
      <T style={{ marginTop: 4, fontSize: 13.5, color: C.fgMuted }}>Results you made, kept only on this device.</T>

      {items && items.length === 0 && (
        <Animated.View entering={reduced ? undefined : FadeInDown.duration(380)} style={{ marginTop: 40, alignItems: "center", paddingHorizontal: 20 }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: C.raised, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.line }}>
            <Clock size={28} color={C.fgMuted} />
          </View>
          <T weight="semibold" style={{ marginTop: 16, fontSize: 17 }}>Nothing here yet</T>
          <T style={{ marginTop: 6, fontSize: 14, color: C.fgMuted, textAlign: "center" }}>Files you merge, convert or compress appear here, ready to share again.</T>
          <PressScale onPress={openSheet} style={{ marginTop: 18, height: 48, paddingHorizontal: 22, borderRadius: 24, backgroundColor: C.accent, justifyContent: "center" }}>
            <T weight="bold" style={{ color: C.onAccent, fontSize: 15 }}>Add a file</T>
          </PressScale>
        </Animated.View>
      )}

      <View style={{ marginTop: 18, gap: 8 }}>
        {(items ?? []).map((r, i) => (
          <Animated.View key={r.id} layout={reduced ? undefined : layoutMove} entering={reduced ? undefined : FadeInDown.delay(Math.min(i, 5) * 50).duration(380)}>
            <PressScale onPress={() => files.open(r)} accessibilityLabel={`Open ${r.name}, ${formatBytes(r.size)}, made with ${r.toolName}`} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, padding: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: C.ink, alignItems: "center", justifyContent: "center" }}>
                <T weight="bold" style={{ fontSize: 10.5, color: C.accent }}>{(r.name.split(".").pop() ?? "").toUpperCase()}</T>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T weight="semibold" numberOfLines={1} style={{ fontSize: 14.5 }}>{r.name}</T>
                <T numberOfLines={1} style={{ fontSize: 12, color: C.fgMuted }}>{formatBytes(r.size)} · {r.toolName} · {ago(r.at)}</T>
              </View>
              <PressScale onPress={() => files.download(r)} accessibilityLabel={`Download ${r.name}`} hitSlop={8} style={{ padding: 6 }}>
                <Download size={18} color={C.fgMuted} />
              </PressScale>
              <PressScale onPress={() => files.share(r)} accessibilityLabel={`Share ${r.name}`} hitSlop={8} style={{ padding: 6 }}>
                <Share2 size={18} color={C.fgMuted} />
              </PressScale>
              <PressScale onPress={() => removeRecent(r.id)} accessibilityLabel={`Delete ${r.name}`} hitSlop={12} style={{ padding: 6 }}>
                <Trash2 size={18} color={C.fgSubtle} />
              </PressScale>
            </PressScale>
          </Animated.View>
        ))}
      </View>

      {!!items?.length && (
        <PressScale onPress={confirmClear} style={{ marginTop: 20, height: 48, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,107,107,0.35)", backgroundColor: "rgba(255,107,107,0.08)", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }}>
          <Trash2 size={17} color={C.danger} />
          <T weight="semibold" style={{ color: C.danger, fontSize: 14.5 }}>Delete all local files</T>
        </PressScale>
      )}
      {files.viewer}
    </Screen>
  );
}
