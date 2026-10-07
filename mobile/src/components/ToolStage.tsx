import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedProps, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import Svg, { Path, Rect } from "react-native-svg";
import { Camera, FolderOpen } from "lucide-react-native";
import { C } from "@/theme";
import { useReduced } from "@/lib/motion";
import { formatBytes, type PickedFile } from "@/lib/files";
import type { NativeTool } from "@/lib/native";
import type { ToolDef } from "@/lib/tools";
import { KindOutline } from "./KindOutline";
import { Float, KindGlyph, PressScale, T, ToolTile } from "./ui";

/**
 * A tool screen's file stages, in the homepage card's style: the drop card
 * before any file is chosen, and the before → after row while it runs.
 */

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const WHAT: Record<NativeTool["pick"], string> = { pdf: "PDF files", image: "photos", document: "Word, Excel or PowerPoint files" };
const FORMATS: Record<NativeTool["pick"], string> = { pdf: "PDF", image: "JPG, PNG, HEIC, WEBP", document: "DOCX, XLSX, PPTX and more" };
/** Tools whose files aren't the usual ones for their kind. */
const FILES_FOR: Record<string, { what: string; formats: string }> = {
  "cdr-converter": { what: "CorelDRAW files", formats: "CorelDRAW .CDR" },
};

/** The empty state: dashed card with the file outline and "+", like the homepage. */
export function ToolDropCard({ native, multiple, onFiles, onPhotos, onCamera }: { native: NativeTool; multiple: boolean; onFiles: () => void; onPhotos: () => void; onCamera: () => void }) {
  const reduced = useReduced();
  const [hot, setHot] = useState(false);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const dash = useSharedValue(0);
  const icon = useSharedValue(1);
  const images = native.pick === "image";
  const primary = images ? onPhotos : onFiles;

  // Dashed border marches while the card is touched.
  useEffect(() => {
    if (hot && !reduced) dash.value = withRepeat(withTiming(dash.value - 28, { duration: 900, easing: Easing.linear }), -1);
    else dash.value = withTiming(dash.value, { duration: 0 });
    icon.value = withTiming(hot && !reduced ? 1.08 : 1, { duration: 400, easing: Easing.bezier(0.34, 1.56, 0.64, 1) });
  }, [hot, reduced, dash, icon]);
  const dashProps = useAnimatedProps(() => ({ strokeDashoffset: dash.value }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: icon.value }] }));

  return (
    <View style={{ padding: 12 }}>
      <Pressable
        onPressIn={() => setHot(true)}
        onPressOut={() => setHot(false)}
        onPress={primary}
        accessibilityRole="button"
        accessibilityLabel={`Choose ${FILES_FOR[native.slug]?.what ?? WHAT[native.pick]}`}
        onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        style={{ alignItems: "center", paddingTop: 30, paddingBottom: 24, paddingHorizontal: 14 }}
      >
        {box.w > 0 && (
          <Svg pointerEvents="none" width={box.w} height={box.h} style={{ position: "absolute", left: 0, top: 0 }}>
            <AnimatedRect x={0.75} y={0.75} width={box.w - 1.5} height={box.h - 1.5} rx={20} fill="none" stroke={hot ? C.brand500 : C.paperDash} strokeWidth={1.5} strokeDasharray={[7, 7]} animatedProps={dashProps} />
          </Svg>
        )}
        <Float distance={4}>
          <Animated.View style={[{ width: 60, height: 68 }, iconStyle]}>
            <KindOutline kind={native.pick} active />
            <View style={{ position: "absolute", right: -8, bottom: -4, width: 24, height: 24, borderRadius: 12, backgroundColor: hot ? C.brand600 : C.ink, borderWidth: 2.5, borderColor: C.paper, alignItems: "center", justifyContent: "center" }}>
              <T weight="bold" allowFontScaling={false} style={{ color: "#fff", fontSize: 16, lineHeight: 18 }}>+</T>
            </View>
          </Animated.View>
        </Float>
        <Animated.View key={hot ? "hot" : "idle"} entering={reduced ? undefined : FadeIn.duration(200)}>
          <T weight="display" style={{ marginTop: 18, fontSize: 23, letterSpacing: -0.6, color: C.ink, textAlign: "center" }}>{hot ? "Choose a file to begin" : images ? "Choose your photos" : native.pick === "pdf" ? (multiple ? "Choose your PDFs" : "Choose a PDF") : native.slug === "cdr-converter" ? "Choose a CorelDRAW file" : "Choose a document"}</T>
        </Animated.View>
        <T style={{ marginTop: 4, fontSize: 13.5, color: C.paperMuted, textAlign: "center" }}>or tap to choose {multiple ? "files" : "a file"}</T>

        <View style={{ marginTop: 18, alignSelf: "stretch", gap: 8 }}>
          <PressScale onPress={primary} style={{ height: 50, borderRadius: 25, backgroundColor: C.inkDeep, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }}>
            <T weight="semibold" style={{ fontSize: 15.5, color: "#fff" }}>{images ? "Choose photos" : multiple ? "Choose files" : "Choose a file"}</T>
          </PressScale>
          {images && (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <PressScale onPress={onCamera} style={{ height: 44, borderRadius: 22, backgroundColor: "#fff", borderWidth: 1, borderColor: C.paperLine, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}>
                  <Camera size={16} color={C.paperText} />
                  <T weight="semibold" style={{ fontSize: 13.5, color: C.paperText }}>Camera</T>
                </PressScale>
              </View>
              <View style={{ flex: 1 }}>
                <PressScale onPress={onFiles} style={{ height: 44, borderRadius: 22, backgroundColor: "#fff", borderWidth: 1, borderColor: C.paperLine, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}>
                  <FolderOpen size={16} color={C.paperText} />
                  <T weight="semibold" style={{ fontSize: 13.5, color: C.paperText }}>From Files</T>
                </PressScale>
              </View>
            </View>
          )}
        </View>

        <View style={{ marginTop: 14, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", columnGap: 10, rowGap: 4 }}>
          <T weight="medium" style={{ fontSize: 12.5, color: C.paperText }}>{FILES_FOR[native.slug]?.formats ?? FORMATS[native.pick]}</T>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Svg width={13} height={13} viewBox="0 0 24 24"><Path d="M12 2 4 5v6c0 5.1 3.4 9.4 8 11 4.6-1.6 8-5.9 8-11V5z" fill={C.successIcon} /><Path d="m8.4 12.2 2.5 2.5 4.7-5" stroke="#fff" strokeWidth={2.4} fill="none" strokeLinecap="round" /></Svg>
            <T style={{ fontSize: 12.5, color: C.paperMuted }}>{native.runs === "device" ? "Stays on this device" : "Deleted right after"}</T>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const RESULT: Record<string, [string, string]> = {
  "cdr-converter": ["PDF", "PDF of your drawing"],
  "merge-pdf": ["PDF", "One merged PDF"],
  "split-pdf": ["PDF", "Separate PDFs"],
  "rotate-pdf": ["PDF", "Rotated PDF"],
  "page-numbers": ["PDF", "Numbered PDF"],
  "watermark-pdf": ["PDF", "Watermarked PDF"],
  "jpg-to-pdf": ["PDF", "PDF document"],
  "scan-to-pdf": ["PDF", "Scanned PDF"],
  "word-to-pdf": ["PDF", "PDF document"],
  "excel-to-pdf": ["PDF", "PDF document"],
  "powerpoint-to-pdf": ["PDF", "PDF document"],
  "compress-image": ["JPG", "Smaller image"],
  "resize-image": ["JPG", "Resized image"],
  "convert-image": ["IMG", "Converted image"],
  "rotate-image": ["JPG", "Rotated image"],
};

const ext = (name: string) => (name.includes(".") ? name.split(".").pop()!.toUpperCase().slice(0, 5) : "FILE");

/** While a tool runs: your real file on the left, what it becomes on the right, light travelling between. */
export function BeforeAfter({ tool, files, verb }: { tool: ToolDef; files: PickedFile[]; verb: string }) {
  const reduced = useReduced();
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  useEffect(() => {
    if (!reduced) x.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }), -1);
  }, [reduced, x]);
  const packet = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * Math.max(0, w - 10) }], opacity: reduced ? 0 : 1 }));
  const [format, label] = RESULT[tool.slug] ?? ["PDF", "Your result"];
  const first = files[0];
  const total = files.reduce((n, f) => n + f.size, 0);

  return (
    <Animated.View entering={reduced ? undefined : FadeInDown.duration(320)} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
      <Pane label="Your file" badge={files.length > 1 ? `${files.length}×` : ext(first?.name ?? "")} title={files.length > 1 ? `${files.length} files` : first?.name ?? ""} detail={formatBytes(total)}>
        {first && <KindGlyph kind={first.kind} size={32} />}
      </Pane>

      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ width: 44, alignItems: "center", justifyContent: "center" }}>
        <View style={{ position: "absolute", left: 0, right: 0, height: 2, borderRadius: 1, backgroundColor: C.accent, opacity: 0.8 }} />
        <Animated.View style={[{ position: "absolute", left: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent, shadowColor: C.accent, shadowOpacity: 1, shadowRadius: 6 }, packet]} />
        <View style={{ borderRadius: 12, backgroundColor: "#fff", padding: 3, borderWidth: 1, borderColor: C.paperBorder }}>
          <ToolTile tool={tool} size={30} />
        </View>
      </View>

      <Pane label="Result" badge={format} accent title={label} detail={verb}>
        <Animated.View entering={reduced ? undefined : FadeIn.delay(200).duration(400)} style={{ width: 34, height: 42, borderRadius: 6, backgroundColor: "#fff", borderWidth: 1, borderColor: C.paperBorder, padding: 5, gap: 3 }}>
          {[90, 70, 85, 55].map((p, i) => (
            <View key={i} style={{ height: 3, width: `${p}%`, borderRadius: 2, backgroundColor: C.paperSunken }} />
          ))}
        </Animated.View>
      </Pane>
    </Animated.View>
  );
}

function Pane({ label, badge, title, detail, accent, children }: { label: string; badge: string; title: string; detail: string; accent?: boolean; children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, minWidth: 0, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: C.paperLine, padding: 10, alignItems: "center", gap: 6 }}>
      <View style={{ height: 52, alignSelf: "stretch", borderRadius: 10, backgroundColor: C.paperSunken, alignItems: "center", justifyContent: "center" }}>{children}</View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
        <T weight="semibold" style={{ fontSize: 9.5, letterSpacing: 0.8, color: C.paperSubtle }}>{label.toUpperCase()}</T>
        <View style={{ borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1, backgroundColor: accent ? C.ink : C.paperLine }}>
          <T weight="bold" style={{ fontSize: 9, color: accent ? C.accent : C.paperText }}>{badge}</T>
        </View>
      </View>
      <T weight="semibold" numberOfLines={1} style={{ fontSize: 12.5, color: C.ink, maxWidth: "100%" }}>{title}</T>
      <T numberOfLines={1} style={{ fontSize: 11, color: C.paperMuted, marginTop: -4, maxWidth: "100%" }}>{detail}</T>
    </View>
  );
}
