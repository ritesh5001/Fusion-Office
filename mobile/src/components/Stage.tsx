import { useEffect, useState } from "react";
import { Alert, View } from "react-native";
import Animated, {
  Easing, FadeIn, FadeInDown, ZoomIn, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { Check, Cpu, Share2, X } from "lucide-react-native";
import { C } from "@/theme";
import { useReduced } from "@/lib/motion";
import { formatBytes, shareFile, type PickedFile } from "@/lib/files";
import { STEPS, progressOf, type RunState } from "@/lib/runner";
import { KindGlyph, PressScale, T } from "./ui";

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** A stroke that draws itself (check marks, shield outlines). `length` ≈ the path length. */
export function DrawPath({ d, length, color, width = 2.4, delay = 0, fill = "none" }: { d: string; length: number; color: string; width?: number; delay?: number; fill?: string }) {
  const reduced = useReduced();
  const off = useSharedValue(reduced ? 0 : length);
  useEffect(() => {
    if (!reduced) off.value = withDelay(delay, withTiming(0, { duration: 480, easing: Easing.out(Easing.cubic) }));
  }, [reduced, delay, length, off]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: off.value }));
  return <AnimatedPath d={d} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" fill={fill} strokeDasharray={[length, length]} animatedProps={props} />;
}

const SHIELD = "M12 2 4 5v6c0 5.1 3.4 9.4 8 11 4.6-1.6 8-5.9 8-11V5z";
const TICK = "m8.4 12.2 2.5 2.5 4.7-5";

/** The file drops in with a bounce, a ripple spreads, a light scans it and the shield draws itself. */
export function Landing({ file, count }: { file: PickedFile; count: number }) {
  const reduced = useReduced();
  const ripple = useSharedValue(0);
  const scan = useSharedValue(-1);
  useEffect(() => {
    if (reduced) return;
    ripple.value = withDelay(220, withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }));
    scan.value = withDelay(420, withTiming(1, { duration: 750, easing: Easing.inOut(Easing.quad) }));
  }, [reduced, ripple, scan]);
  const ring = useAnimatedStyle(() => ({ opacity: (1 - ripple.value) * 0.9, transform: [{ scale: 0.4 + ripple.value * 2.4 }] }));
  const beam = useAnimatedStyle(() => ({ opacity: scan.value > -1 && scan.value < 1 ? 1 : 0, transform: [{ translateX: scan.value * 80 }] }));

  return (
    <View style={{ alignItems: "center", paddingTop: 34, paddingBottom: 30 }} accessibilityLiveRegion="polite">
      <View style={{ width: 200, height: 120, alignItems: "center", justifyContent: "center" }}>
        <Animated.View style={[{ position: "absolute", width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: C.brand400 }, ring]} />
        <Animated.View entering={reduced ? undefined : ZoomIn.springify().damping(11).stiffness(180)} style={{ width: 88, height: 88, borderRadius: 24, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", overflow: "hidden", shadowColor: C.ink, shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 10 } }}>
          <KindGlyph kind={file.kind} />
          <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, width: 36, backgroundColor: "rgba(205,245,100,0.6)" }, beam]} />
        </Animated.View>
        <View style={{ position: "absolute", right: 4, shadowColor: C.accent, shadowOpacity: 0.8, shadowRadius: 10 }}>
          <Svg width={40} height={40} viewBox="0 0 24 24">
            <DrawPath d={SHIELD} length={58} color={C.accent} width={1.6} delay={350} fill={C.ink} />
            <DrawPath d={TICK} length={12} color={C.accent} width={2.2} delay={750} />
          </Svg>
        </View>
      </View>
      <Animated.View entering={reduced ? undefined : FadeInDown.delay(250).duration(300)}>
        <T weight="displayBold" style={{ marginTop: 22, fontSize: 20, color: C.ink, letterSpacing: -0.4 }}>Processing locally — no upload</T>
      </Animated.View>
      <T numberOfLines={1} style={{ marginTop: 4, fontSize: 13.5, color: C.paperMuted, maxWidth: "90%" }}>
        {count > 1 ? `${count} files` : file.name}
      </T>
    </View>
  );
}

export function FileRow({ files, detail, onClear }: { files: PickedFile[]; detail?: string; onClear: () => void }) {
  const total = files.reduce((n, f) => n + f.size, 0);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e0dee9", alignItems: "center", justifyContent: "center" }}>
        <KindGlyph kind={files[0].kind} size={30} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T weight="semibold" numberOfLines={1} style={{ fontSize: 15, color: C.ink }}>{files.length === 1 ? files[0].name : `${files.length} files`}</T>
        <T style={{ fontSize: 12.5, color: C.paperMuted }}>{[formatBytes(total), detail].filter(Boolean).join(" · ")}</T>
      </View>
      <PressScale onPress={onClear} accessibilityLabel="Clear files" style={{ width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" }}>
        <X size={18} color={C.paperMuted} />
      </PressScale>
    </View>
  );
}

/** file → on-device engine → shield → result. Light travels the line while a tool runs. */
export function PrivacyStrip({ state, step = 0, device = true }: { state: "ready" | "running" | "done"; step?: number; device?: boolean }) {
  const reduced = useReduced();
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  const pulse = useSharedValue(0);
  const locked = state === "done" || (state === "running" && step >= 2);

  useEffect(() => {
    if (state !== "running" || reduced || !w) {
      x.value = 0;
      return;
    }
    x.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.linear }), -1);
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: 600 }), withTiming(0, { duration: 600 })), -1);
  }, [state, reduced, w, x, pulse]);
  const packet = useAnimatedStyle(() => ({ opacity: state === "running" ? 1 : 0, transform: [{ translateX: x.value * Math.max(0, w - 10) }] }));
  const chip = useAnimatedStyle(() => ({ shadowOpacity: state === "running" ? pulse.value * 0.8 : 0 }));

  const node = (lit: boolean, accent = false) => ({
    width: 32, height: 32, borderRadius: 9, alignItems: "center" as const, justifyContent: "center" as const, borderWidth: 1,
    backgroundColor: lit ? (accent ? C.accent : "#2a2c4d") : "#1a1c36", borderColor: lit ? (accent ? C.accent : "rgba(255,255,255,0.2)") : "rgba(255,255,255,0.1)",
  });
  const wire = (lit: boolean) => ({ flex: 1, height: 2, borderRadius: 1, backgroundColor: lit ? C.accent : "rgba(255,255,255,0.15)" });

  return (
    <View style={{ marginTop: 14, borderRadius: 16, backgroundColor: C.ink, paddingHorizontal: 12, paddingVertical: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        <View style={node(true)}>
          <Svg width={14} height={16} viewBox="0 0 16 18"><Path d="M3 1h7l4 4v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2z" stroke="#fff" strokeWidth={1.6} fill="none" /></Svg>
        </View>
        <View style={wire(state !== "ready")} />
        <Animated.View style={[{ flexDirection: "row", alignItems: "center", gap: 5, height: 32, borderRadius: 9, paddingHorizontal: 9, borderWidth: 1, backgroundColor: state === "running" ? "#2d2868" : "#1f2142", borderColor: state === "running" ? C.brand400 : "rgba(255,255,255,0.15)", shadowColor: C.brand400, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } }, chip]}>
          <Cpu size={13} color={state === "running" ? "#e7e3ff" : "rgba(255,255,255,0.8)"} />
          <T weight="semibold" style={{ fontSize: 11, color: state === "running" ? "#e7e3ff" : "rgba(255,255,255,0.8)" }}>{device ? "On-device engine" : "Temporary server"}</T>
        </Animated.View>
        <View style={wire(state !== "ready" && step >= 1)} />
        <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: locked ? "#29331d" : "#1f2142", shadowColor: C.accent, shadowOpacity: locked ? 0.7 : 0, shadowRadius: 10 }}>
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path d={SHIELD} fill={locked ? C.accent : "none"} stroke={C.accent} strokeWidth={1.8} strokeLinejoin="round" />
            {locked && <DrawPath d={TICK} length={12} color={C.ink} width={2.4} />}
          </Svg>
        </View>
        <View style={wire(state === "done")} />
        <View style={node(state === "done", true)}>
          <Check size={14} strokeWidth={2.8} color={state === "done" ? C.ink : "rgba(255,255,255,0.3)"} />
        </View>
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent, shadowColor: C.accent, shadowOpacity: 1, shadowRadius: 8 }, packet]} />
      </View>
      <View style={{ marginTop: 8, flexDirection: "row", justifyContent: "space-between" }}>
        <T style={{ fontSize: 11.5, color: "rgba(255,255,255,0.6)" }}>
          {state === "running" ? (device ? "Running locally" : "Converting, then deleted") : state === "done" ? (device ? "Processed on this device" : "Converted and deleted") : "Ready on this device"}
        </T>
        <T weight="semibold" style={{ fontSize: 11.5, color: C.accent }}>{device ? "0 files uploaded" : "Deleted after converting"}</T>
      </View>
    </View>
  );
}

/** "Compressing PDF 68%", a bar with a moving light streak, and the current stage. */
export function ProgressCard({ state }: { state: Extract<RunState, { phase: "running" }> }) {
  const reduced = useReduced();
  const [now, setNow] = useState(() => Date.now());
  const [barW, setBarW] = useState(0);
  const streak = useSharedValue(0);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 120);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!reduced) streak.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.linear }), -1);
  }, [reduced, streak]);
  const pct = progressOf(state, now);
  const s = useAnimatedStyle(() => ({ transform: [{ translateX: -64 + streak.value * (barW + 64) }] }));

  return (
    <Animated.View entering={FadeInDown.duration(300)} style={{ borderRadius: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: C.paperLine, padding: 16 }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <T weight="semibold" style={{ fontSize: 15, color: C.ink }}>{state.verb}</T>
        <T weight="bold" style={{ fontSize: 15, color: C.ink, fontVariant: ["tabular-nums"] }}>{pct}%</T>
      </View>
      <View style={{ marginTop: 12, height: 10, borderRadius: 5, backgroundColor: "#ebe9f2", overflow: "hidden" }}>
        <View onLayout={(e) => setBarW(e.nativeEvent.layout.width)} style={{ height: "100%", width: `${pct}%`, borderRadius: 5, overflow: "hidden", backgroundColor: C.brand500 }}>
          <View style={{ position: "absolute", inset: 0, backgroundColor: C.accent, opacity: pct / 140 }} />
          {!reduced && <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, width: 64, backgroundColor: "rgba(255,255,255,0.7)" }, s]} />}
        </View>
      </View>
      <View style={{ marginTop: 10, flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
        <Animated.View key={state.step} entering={FadeIn.duration(250)}>
          <T weight="semibold" style={{ fontSize: 12.5, color: "#2b2d48" }}>{STEPS[state.step]}…</T>
        </Animated.View>
        <T style={{ fontSize: 12, color: C.paperMuted, flexShrink: 1, textAlign: "right" }}>{state.device ? "Running locally · Stays private" : "Secure server · Deleted after"}</T>
      </View>
    </Animated.View>
  );
}

const share = (f: Parameters<typeof shareFile>[0]) => shareFile(f).catch((e: Error) => Alert.alert("Couldn't share", e.message));

const PARTICLES = [[-46, -30], [40, -38], [54, 10], [-50, 18], [4, -54]];

function Particle({ dx, dy, color }: { dx: number; dy: number; color: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(120, withTiming(1, { duration: 800, easing: Easing.bezier(0.2, 0.7, 0.3, 1) }));
  }, [t]);
  const a = useAnimatedStyle(() => ({ opacity: 1 - t.value, transform: [{ translateX: dx * t.value }, { translateY: dy * t.value }, { scale: 1 - t.value * 0.6 }] }));
  return <Animated.View style={[{ position: "absolute", width: 8, height: 8, borderRadius: 4, backgroundColor: color }, a]} />;
}

/** Lime burst, the check draws itself, the result rises and Share springs in. */
export function DoneCard({ state, onAgain }: { state: Extract<RunState, { phase: "done" }>; onAgain: () => void }) {
  const reduced = useReduced();
  const burst = useSharedValue(0);
  useEffect(() => {
    if (!reduced) burst.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) });
  }, [reduced, burst]);
  const ring = useAnimatedStyle(() => ({ opacity: (1 - burst.value) * 0.8, transform: [{ scale: 0.5 + burst.value * 1.9 }] }));
  const first = state.outputs[0];
  const many = state.outputs.length > 1;
  const total = state.outputs.reduce((n, f) => n + f.size, 0);
  // "Smaller" only means something for compress tools; a conversion's size change isn't a saving.
  const saved = state.compress && total < state.inputBytes ? Math.round((1 - total / state.inputBytes) * 100) : 0;

  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ width: 64, height: 64, alignItems: "center", justifyContent: "center" }}>
        {!reduced && <Animated.View style={[{ position: "absolute", width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(205,245,100,0.5)" }, ring]} />}
        {!reduced && PARTICLES.map(([dx, dy], i) => <Particle key={i} dx={dx} dy={dy} color={i % 2 ? C.brand400 : C.accent} />)}
        <Animated.View entering={reduced ? undefined : ZoomIn.springify().damping(10)} style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.accent, alignItems: "center", justifyContent: "center", shadowColor: C.accent, shadowOpacity: 0.8, shadowRadius: 14 }}>
          <Svg width={28} height={28} viewBox="0 0 24 24"><DrawPath d="m5.5 12.5 4 4 9-9" length={19} color={C.ink} width={2.8} delay={200} /></Svg>
        </Animated.View>
      </View>
      <Animated.View entering={reduced ? undefined : FadeInDown.delay(150).duration(300)}>
        <T weight="displayBold" style={{ marginTop: 10, fontSize: 21, color: C.ink, letterSpacing: -0.4, textAlign: "center" }}>{many ? `${state.outputs.length} files are ready` : "Your file is ready"}</T>
        {many && saved > 0 && <T weight="semibold" style={{ marginTop: 2, fontSize: 13, color: "#3f7d12", textAlign: "center" }}>{saved}% smaller in total</T>}
      </Animated.View>

      <Animated.View entering={reduced ? undefined : FadeInDown.delay(250).duration(400)} style={{ alignSelf: "stretch", marginTop: 12, gap: 8 }}>
        {state.outputs.slice(0, 4).map((o) => (
          <View key={o.uri} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: C.paperLine, padding: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.ink, alignItems: "center", justifyContent: "center" }}>
              <T weight="bold" style={{ fontSize: 10, color: C.accent }}>{(o.name.split(".").pop() ?? "").toUpperCase()}</T>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T weight="semibold" numberOfLines={1} style={{ fontSize: 14, color: C.ink }}>{o.name}</T>
              <T style={{ fontSize: 12.5, color: C.paperMuted }}>
                {formatBytes(o.size)}
                {saved > 0 && !many && <T weight="semibold" style={{ color: "#3f7d12" }}>{` · ${saved}% smaller`}</T>}
                {!saved && state.compress && !many ? " · Already well optimized, so it kept its size" : ""}
              </T>
            </View>
            {many && (
              <PressScale onPress={() => share(o)} accessibilityLabel={`Share ${o.name}`} style={{ padding: 8 }}>
                <Share2 size={18} color={C.ink} />
              </PressScale>
            )}
          </View>
        ))}
        {state.outputs.length > 4 && <T style={{ fontSize: 12.5, color: C.paperMuted, textAlign: "center" }}>+{state.outputs.length - 4} more in Recent</T>}
      </Animated.View>

      <Animated.View entering={reduced ? undefined : ZoomIn.delay(450).springify().damping(12)} style={{ marginTop: 16, alignSelf: "stretch" }}>
        <PressScale onPress={() => share(first)} style={{ height: 52, borderRadius: 26, backgroundColor: "#151738", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Share2 size={18} color="#fff" />
          <T weight="semibold" style={{ fontSize: 15.5, color: "#fff" }}>{many ? "Share the first file" : `Save or share ${(first.name.split(".").pop() ?? "").toUpperCase()}`}</T>
        </PressScale>
      </Animated.View>
      <PressScale onPress={onAgain} style={{ marginTop: 6, height: 44, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" }}>
        <T weight="semibold" style={{ fontSize: 14, color: "#2b2d48" }}>Use another tool →</T>
      </PressScale>
      <T style={{ fontSize: 11.5, color: C.paperMuted, textAlign: "center" }}>Saved in Recent on this device · {formatBytes(total)}</T>
    </View>
  );
}

export function ErrorCard({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <Animated.View entering={FadeInDown.duration(300)} accessibilityRole="alert" style={{ borderRadius: 16, backgroundColor: "#fdecec", padding: 16 }}>
      <T weight="semibold" style={{ fontSize: 14.5, color: "#8a1f1f" }}>That didn&apos;t work</T>
      <T style={{ marginTop: 4, fontSize: 13.5, color: "#8a1f1f" }}>{message}</T>
      <PressScale onPress={onBack} style={{ marginTop: 12, alignSelf: "flex-start", height: 38, paddingHorizontal: 16, borderRadius: 19, backgroundColor: "#151738", justifyContent: "center" }}>
        <T weight="semibold" style={{ fontSize: 13, color: "#fff" }}>Back</T>
      </PressScale>
    </Animated.View>
  );
}

