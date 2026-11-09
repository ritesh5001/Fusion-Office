import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import { Eye, FolderOpen, Share2 } from "lucide-react-native";
import { File } from "expo-file-system";
import { C } from "@/theme";
import { useSession } from "@/lib/session";
import { useReduced } from "@/lib/motion";
import { useColumns } from "@/lib/layout";
import { formatBytes, saveOutput, type PickedFile, type SavedFile } from "@/lib/files";
import { addRecent } from "@/lib/recents";
import { toolsFor } from "@/lib/suggest";
import { BackHeader, Screen } from "@/components/Screen";
import { KindGlyph, PressScale, T } from "@/components/ui";
import { ToolCard } from "@/components/ToolCard";
import { openTool } from "@/components/DropStage";
import { useFileActions } from "@/components/FileViewer";

export { CrashScreen as ErrorBoundary } from "@/components/CrashScreen";

/**
 * A file opened with Fusion Office from another app ("Open with" in a file
 * manager, or "Share" from WhatsApp, Gmail, Drive…). A single file opens in
 * the viewer straight away; the tools that fit are listed underneath.
 * Opened files are kept in Recent so they're easy to find again.
 */
export default function OpenScreen() {
  const { incoming, stage, openSheet } = useSession();
  const reduced = useReduced();
  const files = useFileActions();
  const { cardWidth, gap } = useColumns();
  const [saved, setSaved] = useState<SavedFile[]>([]);
  const shownFor = useRef<PickedFile[] | null>(null);

  // Keep a copy in Recent, then open the first file.
  useEffect(() => {
    if (!incoming?.length || shownFor.current === incoming) return;
    shownFor.current = incoming;
    let live = true;
    (async () => {
      const kept: SavedFile[] = [];
      for (const f of incoming) {
        try {
          const copy = saveOutput(f.name, await new File(f.uri).bytes(), f.mimeType);
          await addRecent(copy, "document-viewer", "Opened");
          kept.push(copy);
        } catch {
          kept.push({ uri: f.uri, name: f.name, size: f.size, mimeType: f.mimeType });
        }
      }
      if (!live) return;
      setSaved(kept);
      if (kept.length === 1) files.open(kept[0]);
    })();
    return () => {
      live = false;
    };
  }, [incoming]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!incoming?.length)
    return (
      <Screen tabs={false}>
        <BackHeader title="Open a file" />
        <View style={{ marginTop: 40, alignItems: "center", paddingHorizontal: 20 }}>
          <T weight="semibold" style={{ fontSize: 17 }}>No file to show</T>
          <T style={{ marginTop: 6, color: C.fgMuted, textAlign: "center" }}>Choose a file, or use “Open with Fusion Office” from your file manager.</T>
          <PressScale onPress={() => (router.replace("/"), openSheet())} style={{ marginTop: 18, height: 48, paddingHorizontal: 22, borderRadius: 24, backgroundColor: C.accent, justifyContent: "center" }}>
            <T weight="bold" style={{ color: C.onAccent, fontSize: 15 }}>Choose a file</T>
          </PressScale>
        </View>
      </Screen>
    );

  const tools = toolsFor(incoming).slice(0, 8);
  const runWith = (slug: string) => {
    stage(incoming);
    openTool(slug, true);
  };

  return (
    <Screen tabs={false}>
      <BackHeader title={incoming.length === 1 ? "Opened file" : `${incoming.length} files`} />

      <View style={{ marginTop: 8, gap: 8 }}>
        {incoming.map((f, i) => {
          const s = saved[i];
          return (
            <Animated.View key={`${f.uri}-${i}`} entering={reduced ? undefined : FadeInDown.delay(Math.min(i, 5) * 50).duration(360)}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, backgroundColor: C.paper, padding: 12 }}>
                <View style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}>
                  <KindGlyph kind={f.kind} size={32} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T weight="semibold" numberOfLines={2} style={{ fontSize: 15, color: C.ink }}>{f.name}</T>
                  <T style={{ fontSize: 12.5, color: C.paperMuted }}>{formatBytes(f.size)} · stays on this device</T>
                </View>
                <PressScale disabled={!s} onPress={() => s && files.share(s)} accessibilityLabel={`Share ${f.name}`} hitSlop={8} style={{ padding: 8, opacity: s ? 1 : 0.4 }}>
                  <Share2 size={19} color={C.paperMuted} />
                </PressScale>
              </View>
              <PressScale
                disabled={!s}
                onPress={() => s && files.open(s)}
                accessibilityLabel={`View ${f.name}`}
                style={{ marginTop: 8, height: 50, borderRadius: 16, backgroundColor: C.accent, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, opacity: s ? 1 : 0.6 }}
              >
                <Eye size={19} color={C.onAccent} />
                <T weight="bold" style={{ color: C.onAccent, fontSize: 15 }}>{s ? "View" : "Opening…"}</T>
              </PressScale>
            </Animated.View>
          );
        })}
      </View>

      {tools.length > 0 && (
        <View style={{ marginTop: 28 }}>
          <T weight="display" header style={{ fontSize: 20, letterSpacing: -0.4 }}>Do more with {incoming.length === 1 ? "this file" : "these files"}</T>
          <T style={{ marginTop: 4, fontSize: 13.5, color: C.fgMuted }}>Tools that take {incoming.length === 1 ? "it" : "them"}, best first.</T>
          <View style={{ marginTop: 14, flexDirection: "row", flexWrap: "wrap", gap }}>
            {tools.map((t, i) => (
              <ToolCard key={t.slug} tool={t} index={i} width={cardWidth} onPress={() => runWith(t.slug)} />
            ))}
          </View>
        </View>
      )}

      <PressScale onPress={() => (stage(incoming), router.replace("/"))} style={{ marginTop: 18, height: 50, borderRadius: 16, borderWidth: 1, borderColor: C.lineStrong, backgroundColor: C.surface, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }}>
        <FolderOpen size={18} color={C.fg} />
        <T weight="semibold" style={{ fontSize: 15 }}>Go to Home with {incoming.length === 1 ? "this file" : "these files"}</T>
      </PressScale>
      {files.viewer}
    </Screen>
  );
}
