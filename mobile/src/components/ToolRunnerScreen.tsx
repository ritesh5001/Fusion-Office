import { useState } from "react";
import { Alert, ScrollView, TextInput, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react-native";
import { C } from "@/theme";
import { useReduced } from "@/lib/motion";
import { useSession } from "@/lib/session";
import { formatBytes, pickDocuments, pickPhotos, takePhoto, type PickedFile } from "@/lib/files";
import type { NativeTool } from "@/lib/native";
import { useRunner } from "@/lib/runner";
import { accepts, type ToolDef } from "@/lib/tools";
import { BackHeader } from "./Screen";
import { Segmented } from "./Segmented";
import { DoneCard, ErrorCard, PrivacyStrip, ProgressCard } from "./Stage";
import { StepTracker } from "./StepTracker";
import { Backdrop, KindGlyph, PressScale, T, ToolTile } from "./ui";

const PICK_TYPES = { pdf: "application/pdf", image: "image/*", document: "*/*" } as const;

/** A native tool: pick files, set options in the bottom panel, run on the device, share the result. */
export function ToolRunnerScreen({ tool, native, useStaged }: { tool: ToolDef; native: NativeTool; useStaged: boolean }) {
  const insets = useSafeAreaInsets();
  const reduced = useReduced();
  const session = useSession();
  const fits = (f: PickedFile) => accepts(tool, f.name, f.mimeType) || (native.pick === "image" && f.kind === "image") || (native.pick === "pdf" && f.kind === "pdf");
  // Files handed over from the home screen (or a scan) go straight in.
  const [files, setFiles] = useState<PickedFile[]>(() => {
    if (!useStaged || !session.staged) return [];
    const fit = session.staged.filter(fits);
    return tool.multiple ? fit : fit.slice(0, 1);
  });
  const [options, setOptions] = useState(native.defaults);
  const { state, run, reset } = useRunner();

  const add = async (source: "files" | "photos" | "camera") => {
    try {
      const picked =
        source === "photos" ? await pickPhotos(tool.multiple) : source === "camera" ? [await takePhoto()].filter((f): f is PickedFile => !!f) : await pickDocuments(PICK_TYPES[native.pick], tool.multiple);
      const fit = picked.filter(fits);
      if (picked.length && !fit.length) Alert.alert("That file doesn't fit", `${tool.name} takes ${native.pick === "pdf" ? "PDF files" : native.pick === "image" ? "images" : "Word, Excel or PowerPoint files"}.`);
      setFiles((cur) => (tool.multiple ? [...cur, ...fit] : fit.slice(0, 1)));
    } catch (e) {
      Alert.alert("Couldn't open that", (e as Error).message);
    }
  };

  const move = (i: number, d: -1 | 1) =>
    setFiles((cur) => {
      const next = [...cur];
      const j = i + d;
      if (j < 0 || j >= next.length) return cur;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const step = state.phase === "done" ? 3 : state.phase === "running" ? 2 : files.length ? 1 : 0;
  const need = native.minFiles ?? 1;
  const working = state.phase !== "idle";

  return (
    <View style={{ flex: 1, backgroundColor: C.app }}>
      <Backdrop />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 6, paddingHorizontal: 16, paddingBottom: 260 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <BackHeader />
        <Animated.View entering={reduced ? undefined : FadeInDown.duration(380)} style={{ flexDirection: "row", gap: 14, alignItems: "center", marginTop: 6 }}>
          <ToolTile tool={tool} size={56} />
          <View style={{ flex: 1 }}>
            <T weight="display" style={{ fontSize: 24, letterSpacing: -0.6 }}>{tool.name}</T>
            <T style={{ marginTop: 2, fontSize: 13.5, lineHeight: 19, color: C.fgMuted }}>{tool.description}</T>
          </View>
        </Animated.View>
        <View style={{ marginTop: 20 }}>
          <StepTracker step={step} />
        </View>

        {working ? (
          <View style={{ marginTop: 20, borderRadius: 24, backgroundColor: C.paper, padding: 16 }}>
            <PrivacyStrip state={state.phase === "running" ? "running" : state.phase === "done" ? "done" : "ready"} step={state.phase === "running" ? state.step : 0} device={native.runs === "device"} />
            <View style={{ marginTop: 14 }}>
              {state.phase === "running" && <ProgressCard state={state} />}
              {state.phase === "done" && <DoneCard state={state} onAgain={() => (reset(), setFiles([]))} />}
              {state.phase === "error" && <ErrorCard message={state.message} onBack={reset} />}
            </View>
          </View>
        ) : (
          <>
            <View style={{ marginTop: 20, gap: 8 }}>
              {files.map((f, i) => (
                <Animated.View key={`${f.uri}-${i}`} layout={reduced ? undefined : LinearTransition.springify().damping(15)} entering={reduced ? undefined : FadeInDown.delay(Math.min(i, 5) * 50).duration(320)}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, padding: 10 }}>
                    {tool.multiple && files.length > 1 && (
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.fg, alignItems: "center", justifyContent: "center" }}>
                        <T weight="bold" style={{ fontSize: 11, color: C.app }}>{i + 1}</T>
                      </View>
                    )}
                    <KindGlyph kind={f.kind} size={30} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <T weight="medium" numberOfLines={1} style={{ fontSize: 14 }}>{f.name}</T>
                      <T style={{ fontSize: 12, color: C.fgMuted }}>{formatBytes(f.size)}</T>
                    </View>
                    {tool.multiple && files.length > 1 && (
                      <>
                        <PressScale onPress={() => move(i, -1)} disabled={i === 0} accessibilityLabel="Move earlier" style={{ padding: 6, opacity: i === 0 ? 0.3 : 1 }}>
                          <ArrowUp size={16} color={C.fgMuted} />
                        </PressScale>
                        <PressScale onPress={() => move(i, 1)} disabled={i === files.length - 1} accessibilityLabel="Move later" style={{ padding: 6, opacity: i === files.length - 1 ? 0.3 : 1 }}>
                          <ArrowDown size={16} color={C.fgMuted} />
                        </PressScale>
                      </>
                    )}
                    <PressScale onPress={() => setFiles((cur) => cur.filter((_, k) => k !== i))} accessibilityLabel={`Remove ${f.name}`} style={{ padding: 6 }}>
                      <X size={16} color={C.fgMuted} />
                    </PressScale>
                  </View>
                </Animated.View>
              ))}
            </View>

            {(tool.multiple || files.length === 0) && (
              <View style={{ marginTop: files.length ? 10 : 0, gap: 8 }}>
                <AddButton label={files.length ? "Add more" : native.pick === "image" ? "Choose photos" : "Choose files"} onPress={() => add(native.pick === "image" ? "photos" : "files")} primary={!files.length} />
                {native.pick === "image" && (
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <AddButton label="Camera" onPress={() => add("camera")} />
                    <AddButton label="From Files" onPress={() => add("files")} />
                  </View>
                )}
              </View>
            )}
            {native.runs === "server" && (
              <T style={{ marginTop: 12, fontSize: 12.5, color: C.fgMuted }}>This conversion runs on the Fusion Office server: the file is uploaded, converted, and deleted straight after.</T>
            )}
          </>
        )}
      </ScrollView>

      {/* Settings and the main action sit in a bottom panel, in thumb reach. */}
      {!working && (
        <Animated.View entering={reduced ? undefined : FadeInDown.duration(320)} style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 14, paddingBottom: insets.bottom + 14, backgroundColor: C.overlay, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderTopWidth: 1, borderColor: C.lineStrong, gap: 12 }}>
          {native.options.map((o) =>
            o.kind === "choice" ? (
              <View key={o.key}>
                <T weight="medium" style={{ fontSize: 12.5, color: C.fgMuted, marginBottom: 6 }}>{o.label}</T>
                <Segmented tone="dark" value={options[o.key]} options={o.choices} onChange={(v) => setOptions((cur) => ({ ...cur, [o.key]: v }))} />
              </View>
            ) : (
              <View key={o.key}>
                <T weight="medium" style={{ fontSize: 12.5, color: C.fgMuted, marginBottom: 6 }}>{o.label}</T>
                <TextInput
                  value={String(options[o.key] ?? "")}
                  onChangeText={(v) => setOptions((cur) => ({ ...cur, [o.key]: v }))}
                  placeholder={o.placeholder}
                  placeholderTextColor={C.fgSubtle}
                  style={{ height: 46, borderRadius: 12, borderWidth: 1, borderColor: C.lineStrong, backgroundColor: C.sunken, color: C.fg, paddingHorizontal: 14, fontSize: 15 }}
                />
              </View>
            ),
          )}
          <PressScale
            disabled={files.length < need}
            onPress={() => run(native, tool, files, options)}
            style={{ height: 54, borderRadius: 27, backgroundColor: files.length < need ? C.raised : C.accent, alignItems: "center", justifyContent: "center" }}
          >
            <T weight="bold" style={{ fontSize: 16, color: files.length < need ? C.fgSubtle : C.onAccent }}>
              {files.length < need ? (need > 1 ? `Add at least ${need} files` : "Add a file to start") : `${tool.name}${native.runs === "device" ? " on this device" : ""}`}
            </T>
          </PressScale>
        </Animated.View>
      )}
    </View>
  );
}

function AddButton({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) {
  return (
    <PressScale onPress={onPress} style={{ flex: primary ? undefined : 1, height: primary ? 120 : 48, borderRadius: 18, borderWidth: 1.5, borderStyle: "dashed", borderColor: primary ? C.brand400 : C.lineStrong, backgroundColor: primary ? "rgba(139,124,246,0.08)" : C.surface, alignItems: "center", justifyContent: "center", flexDirection: primary ? "column" : "row", gap: 6 }}>
      <Plus size={primary ? 26 : 16} color={primary ? C.brand300 : C.fgMuted} />
      <T weight="semibold" style={{ fontSize: primary ? 15 : 13, color: primary ? C.fg : C.fgMuted }}>{label}</T>
    </PressScale>
  );
}
