import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedProps, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import Svg, { Path, Rect } from "react-native-svg";
import { router } from "expo-router";
import { ChevronRight, Zap } from "lucide-react-native";
import { PDFDocument } from "pdf-lib";
import { C } from "@/theme";
import { useSession } from "@/lib/session";
import { useReduced } from "@/lib/motion";
import { readBytes } from "@/lib/files";
import { NATIVE } from "@/lib/native";
import { useRunner } from "@/lib/runner";
import { toolBySlug, type FileKind, type ToolDef } from "@/lib/tools";
import { toolsFor } from "@/lib/suggest";
import { GlowCard } from "./GlowCard";
import { KindOutline } from "./KindOutline";
import { Segmented } from "./Segmented";
import { DoneCard, ErrorCard, FileRow, Landing, PrivacyStrip, ProgressCard } from "./Stage";
import { Float, PressScale, T, ToolTile } from "./ui";

const KINDS: { value: FileKind; label: string }[] = [
  { value: "pdf", label: "PDF" },
  { value: "document", label: "Docs" },
  { value: "image", label: "Images" },
];

const SUGGESTED: Record<FileKind, string[]> = {
  pdf: ["compress-pdf", "merge-pdf", "edit-pdf", "split-pdf"],
  document: ["word-to-pdf", "word-editor", "excel-editor", "powerpoint-to-pdf"],
  image: ["compress-image", "resize-image", "jpg-to-pdf", "convert-image"],
};

/** Run right in the card, with default settings. */
const INLINE = ["merge-pdf", "jpg-to-pdf", "compress-image", "word-to-pdf", "excel-to-pdf", "powerpoint-to-pdf", "rotate-pdf", "page-numbers", "resize-image"];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Where a tool opens: the native screen, with the staged files handed over. */
export const openTool = (slug: string, withFiles = false) => router.push({ pathname: "/tool/[slug]", params: { slug, ...(withFiles ? { staged: "1" } : {}) } });

/**
 * The home screen's processing stage. Idle: a glowing card to choose a file.
 * With files: they land, are read on the device, and can be processed right
 * here or opened in any tool that takes them.
 */
export function DropStage({ onKind }: { onKind?: (k: FileKind) => void }) {
  const { staged, clear, openSheet } = useSession();
  const [phase, setPhase] = useState<"idle" | "landing" | "ready">("idle");
  const [kind, setKind] = useState<FileKind>("pdf");
  const [detail, setDetail] = useState<string>();
  const [hot, setHot] = useState(false);
  const { state, run, reset } = useRunner();

  useEffect(() => onKind?.(kind), [kind, onKind]);

  // New files: switch to the landing straight away (during render, not in an effect)…
  const [seen, setSeen] = useState(staged);
  if (seen !== staged) {
    setSeen(staged);
    setPhase(staged?.length ? "landing" : "idle");
    setDetail(undefined);
    if (staged?.length) setKind(staged[0].kind);
  }

  // …and read them on this device while it plays.
  useEffect(() => {
    reset();
    if (!staged?.length) return;
    let live = true;
    const first = staged[0];
    const read = (async () => {
      try {
        if (staged.length === 1 && first.kind === "pdf") {
          const n = (await PDFDocument.load(await readBytes(first.uri), { ignoreEncryption: true })).getPageCount();
          return `${n} page${n === 1 ? "" : "s"}`;
        }
        if (staged.length === 1 && first.kind === "image") {
          const { width, height } = await Image.getSize(first.uri);
          return `${width} × ${height}`;
        }
      } catch {
        /* details are optional */
      }
      return undefined;
    })();
    Promise.all([read, wait(1300)]).then(([d]) => {
      if (!live) return;
      setDetail(d);
      setPhase("ready");
    });
    return () => {
      live = false;
    };
  }, [staged, reset]);

  const matches = useMemo(() => toolsFor(staged ?? []), [staged]);

  const inline = INLINE.map(toolBySlug)
    .filter((t): t is ToolDef => !!t && matches.includes(t) && !!NATIVE[t.slug])
    .filter((t) => (t.slug === "merge-pdf" ? (staged?.length ?? 0) > 1 : true))
    .slice(0, 2);
  const rest = matches.filter((t) => !inline.includes(t)).slice(0, inline.length ? 4 : 6);

  const busy = state.phase === "running";

  return (
    <GlowCard hot={hot || phase === "landing" || busy}>
      {phase === "idle" ? (
        <Idle kind={kind} setKind={setKind} hot={hot} setHot={setHot} onChoose={() => openSheet()} />
      ) : phase === "landing" ? (
        <Landing file={staged![0]} count={staged!.length} />
      ) : (
        <View style={{ padding: 16 }}>
          <FileRow files={staged!} detail={detail} onClear={clear} />
          <PrivacyStrip
            state={state.phase === "running" ? "running" : state.phase === "done" ? "done" : "ready"}
            step={state.phase === "running" ? state.step : 0}
            device={state.phase === "running" ? state.device : true}
          />
          <View style={{ marginTop: 14 }}>
            {state.phase === "running" ? (
              <ProgressCard state={state} />
            ) : state.phase === "done" ? (
              <DoneCard state={state} onAgain={reset} />
            ) : state.phase === "error" ? (
              <ErrorCard message={state.message} onBack={reset} />
            ) : (
              <Ready inline={inline} rest={rest} total={matches.length} onRun={(t) => run(NATIVE[t.slug], t, staged!, NATIVE[t.slug].defaults)} />
            )}
          </View>
        </View>
      )}
    </GlowCard>
  );
}

const AnimatedRect = Animated.createAnimatedComponent(Rect);

function Idle({ kind, setKind, hot, setHot, onChoose }: { kind: FileKind; setKind: (k: FileKind) => void; hot: boolean; setHot: (v: boolean) => void; onChoose: () => void }) {
  const reduced = useReduced();
  const [box, setBox] = useState({ w: 0, h: 0 });
  const dash = useSharedValue(0);
  const icon = useSharedValue(1);

  // Dashed border marches clockwise while the card is touched.
  useEffect(() => {
    if (hot && !reduced) dash.value = withRepeat(withTiming(dash.value - 28, { duration: 900, easing: Easing.linear }), -1);
    else dash.value = withTiming(dash.value, { duration: 0 });
    icon.value = withTiming(hot && !reduced ? 1.08 : 1, { duration: 400, easing: Easing.bezier(0.34, 1.56, 0.64, 1) });
  }, [hot, reduced, dash, icon]);
  const dashProps = useAnimatedProps(() => ({ strokeDashoffset: dash.value }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: icon.value }] }));
  const suggested = SUGGESTED[kind].map(toolBySlug).filter((t): t is ToolDef => !!t);

  return (
    <View style={{ padding: 12 }}>
      <Pressable
        onPressIn={() => setHot(true)}
        onPressOut={() => setHot(false)}
        onPress={onChoose}
        accessibilityRole="button"
        accessibilityLabel="Choose a file"
        onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        style={{ alignItems: "center", paddingTop: 30, paddingBottom: 22, paddingHorizontal: 14 }}
      >
        {box.w > 0 && (
          <Svg pointerEvents="none" width={box.w} height={box.h} style={{ position: "absolute", left: 0, top: 0 }}>
            <AnimatedRect x={0.75} y={0.75} width={box.w - 1.5} height={box.h - 1.5} rx={20} fill="none" stroke={hot ? C.brand500 : C.paperDash} strokeWidth={1.5} strokeDasharray={[7, 7]} animatedProps={dashProps} />
          </Svg>
        )}
        <Float distance={4}>
          <Animated.View style={[{ width: 60, height: 68 }, iconStyle]}>
            {KINDS.map((k) => (
              <KindOutline key={k.value} kind={k.value} active={k.value === kind} />
            ))}
            <View style={{ position: "absolute", right: -8, bottom: -4, width: 24, height: 24, borderRadius: 12, backgroundColor: hot ? C.brand600 : C.ink, borderWidth: 2.5, borderColor: C.paper, alignItems: "center", justifyContent: "center" }}>
              <T weight="bold" allowFontScaling={false} style={{ color: "#fff", fontSize: 16, lineHeight: 18 }}>+</T>
            </View>
          </Animated.View>
        </Float>
        <Animated.View key={hot ? "hot" : "idle"} entering={reduced ? undefined : FadeIn.duration(200)}>
          <T weight="display" style={{ marginTop: 18, fontSize: 24, letterSpacing: -0.6, color: C.ink }}>{hot ? "Choose a file to begin" : "Choose a file"}</T>
        </Animated.View>
        <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M12 2 4 5v6c0 5.1 3.4 9.4 8 11 4.6-1.6 8-5.9 8-11V5z" fill={C.successIcon} /><Path d="m8.4 12.2 2.5 2.5 4.7-5" stroke="#fff" strokeWidth={2.4} fill="none" strokeLinecap="round" /></Svg>
          <T weight="medium" style={{ fontSize: 13.5, color: C.paperMuted }}>Stays on this device</T>
        </View>
      </Pressable>

      <Segmented value={kind} options={KINDS} onChange={setKind} style={{ marginTop: 6 }} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 12, paddingBottom: 2 }} key={kind}>
        {suggested.map((t, i) => (
          <Animated.View key={t.slug} entering={reduced ? undefined : FadeInDown.delay(i * 40).duration(260)}>
            <PressScale onPress={() => openTool(t.slug)} style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 34, paddingLeft: 4, paddingRight: 12, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.75)", borderWidth: 1, borderColor: C.paperLine }}>
              <ToolTile tool={t} size={24} />
              <T weight="medium" style={{ fontSize: 12.5, color: C.paperText }}>{t.name}</T>
            </PressScale>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

function Ready({ inline, rest, total, onRun }: { inline: ToolDef[]; rest: ToolDef[]; total: number; onRun: (t: ToolDef) => void }) {
  const reduced = useReduced();
  return (
    <View>
      {inline.length > 0 && (
        <>
          <T weight="semibold" style={{ fontSize: 11.5, letterSpacing: 1.2, color: C.paperSubtle }}>DO IT RIGHT HERE</T>
          <View style={{ marginTop: 8, gap: 8 }}>
            {inline.map((t, n) => (
              <Animated.View key={t.slug} entering={reduced ? undefined : FadeInDown.delay(n * 50).duration(320)}>
                <PressScale
                  onPress={() => onRun(t)}
                  style={[{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, padding: 10 }, n === 0 ? { backgroundColor: C.inkDeep } : { backgroundColor: "#fff", borderWidth: 1, borderColor: C.paperLine }]}
                >
                  <ToolTile tool={t} size={40} />
                  <View style={{ flex: 1 }}>
                    <T weight="semibold" style={{ fontSize: 14.5, color: n === 0 ? "#fff" : C.ink }}>{t.name}</T>
                    <View style={{ marginTop: 2, flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Zap size={11} color={n === 0 ? C.accent : C.paperMuted} />
                      <T style={{ fontSize: 12, color: n === 0 ? C.accent : C.paperMuted }}>{NATIVE[t.slug].runs === "device" ? "Runs on-device" : "Converts on our server"}</T>
                    </View>
                  </View>
                </PressScale>
              </Animated.View>
            ))}
          </View>
        </>
      )}
      {rest.length > 0 && (
        <>
          <T weight="semibold" style={{ marginTop: inline.length ? 16 : 0, fontSize: 11.5, letterSpacing: 1.2, color: C.paperSubtle }}>{inline.length ? "OR OPEN IT IN" : "OPEN IT IN"}</T>
          <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {rest.map((t, n) => (
              <Animated.View key={t.slug} entering={reduced ? undefined : FadeInDown.delay((inline.length + n) * 40).duration(320)} style={{ width: "48.5%" }}>
                <PressScale onPress={() => openTool(t.slug, true)} style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 13, backgroundColor: "#fff", borderWidth: 1, borderColor: C.paperLine, padding: 8 }}>
                  <ToolTile tool={t} size={30} />
                  <T weight="medium" numberOfLines={2} style={{ flex: 1, fontSize: 13, lineHeight: 16, color: C.ink }}>{t.name}</T>
                  <ChevronRight size={14} color={C.paperIcon} />
                </PressScale>
              </Animated.View>
            ))}
          </View>
        </>
      )}
      {total > inline.length + rest.length && (
        <PressScale onPress={() => router.push({ pathname: "/tools", params: { fit: "1" } })} style={{ marginTop: 12, alignSelf: "flex-start" }}>
          <T weight="semibold" style={{ fontSize: 13, color: C.linkOnPaper }}>See all {total} tools for this file →</T>
        </PressScale>
      )}
      {total === 0 && (
        <T style={{ borderRadius: 12, backgroundColor: C.paperSunken, padding: 12, fontSize: 13.5, color: C.paperText2 }}>
          No tool opens this kind of file yet. PDFs, Word, Excel, PowerPoint, Markdown, CSV, eBooks and images are supported.
        </T>
      )}
    </View>
  );
}
