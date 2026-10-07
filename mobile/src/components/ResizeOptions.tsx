import { useEffect, useState, type ReactNode } from "react";
import { Image, Pressable, Switch, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import * as haptics from "@/lib/haptics";
import { ImageManipulator } from "expo-image-manipulator";
import { C } from "@/theme";
import { enterFade } from "@/lib/ease";
import { useReduced } from "@/lib/motion";
import type { PickedFile } from "@/lib/files";
import {
  PERCENT_PRESETS,
  PIXEL_PRESETS,
  PRINT_PRESETS,
  TARGET_PRESETS,
  convertUnit,
  previewSize,
  readResize,
  sideIn,
  type Mode,
  type PrintUnit,
  type Raw,
} from "@/lib/resize";
import { parseSize } from "@shared-image/encode";
import type { Size } from "@shared-image/geometry";
import { Segmented } from "./Segmented";
import { T, TEXT_SCALE } from "./ui";

/** The size of a picked photo, without decoding it when the platform can avoid that. */
function useImageSize(uri: string | undefined) {
  // Remember which photo the size belongs to, so a new photo never shows the old size.
  const [found, setFound] = useState<{ uri: string; size: Size } | null>(null);
  useEffect(() => {
    if (!uri) return;
    let live = true;
    const done = (width: number, height: number) => live && setFound({ uri, size: { width, height } });
    Image.getSize(uri, done, () =>
      ImageManipulator.manipulate(uri)
        .renderAsync()
        .then((img) => done(img.width, img.height))
        .catch(() => {}),
    );
    return () => {
      live = false;
    };
  }, [uri]);
  return found && found.uri === uri ? found.size : null;
}

/** Resize Image settings, the same choices as the website. */
export function ResizeOptions({ files, options, set }: { files: PickedFile[]; options: Raw; set: (patch: Raw) => void }) {
  const reduced = useReduced();
  const first = useImageSize(files[0]?.uri);
  const o = readResize(options);
  const ratio = first ? first.width / first.height : 0;
  const unit = o.mode === "pixels" ? "px" : o.unit;
  const fade = reduced ? undefined : enterFade();

  // With the ratio locked, typing one side fills in the other (from the first image).
  const setSide = (side: "width" | "height", text: string) => {
    const v = Number(text.replace(",", "."));
    if (!o.keepRatio || !ratio || !(v > 0)) return set({ [side]: text });
    const other = side === "width" ? v / ratio : v * ratio;
    const rounded = String(o.mode === "pixels" ? Math.round(other) : Math.round(other * 100) / 100);
    set(side === "width" ? { width: text, height: rounded } : { height: text, width: rounded });
  };

  // Start from the image's current size, in the new mode's unit.
  const setMode = (mode: Mode) =>
    set(first && mode !== "percent" ? { mode, width: sideIn(first.width, mode, o.unit, o.dpi), height: sideIn(first.height, mode, o.unit, o.dpi) } : { mode });

  const out = first ? previewSize(first, options) : null;
  const target = parseSize(o.target);

  return (
    <View style={{ marginTop: 16, borderRadius: 22, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, padding: 14, gap: 16 }}>
      <Field label="Resize by">
        <Segmented
          tone="dark"
          value={o.mode}
          onChange={setMode}
          options={[
            { value: "percent" as const, label: "Percent" },
            { value: "pixels" as const, label: "Pixels" },
            { value: "print" as const, label: "Print size" },
          ]}
        />
      </Field>

      {o.mode === "percent" ? (
        <Animated.View key="percent" entering={fade} style={{ gap: 10 }}>
          <NumberField label="Size" value={String(options.percent)} onChange={(percent) => set({ percent })} suffix="%" />
          <Chips items={PERCENT_PRESETS.map((p) => ({ key: String(p), label: `${p}%`, on: o.percent === p }))} onPick={(k) => set({ percent: k })} />
        </Animated.View>
      ) : (
        <Animated.View key="box" entering={fade} style={{ gap: 14 }}>
          {o.mode === "print" ? (
            <>
              <Chips
                items={PRINT_PRESETS.map((p) => ({ key: p.label, label: p.label, on: o.unit === p.unit && o.width === p.width && o.height === p.height }))}
                onPick={(k) => {
                  const p = PRINT_PRESETS.find((x) => x.label === k)!;
                  set({ width: String(p.width), height: String(p.height), unit: p.unit, keepRatio: 0, fit: "fill" });
                }}
              />
              <Field label="Unit">
                <Segmented
                  tone="dark"
                  value={o.unit}
                  onChange={(next: PrintUnit) => set({ unit: next, width: convertUnit(options.width, o.unit, next), height: convertUnit(options.height, o.unit, next) })}
                  options={[
                    { value: "cm" as const, label: "cm" },
                    { value: "mm" as const, label: "mm" },
                    { value: "in" as const, label: "inch" },
                  ]}
                />
              </Field>
            </>
          ) : (
            <Chips
              items={PIXEL_PRESETS.map((p) => ({ key: p.label, label: p.label, on: o.width === p.width && o.height === p.height }))}
              onPick={(k) => {
                const p = PIXEL_PRESETS.find((x) => x.label === k)!;
                set({ width: String(p.width), height: String(p.height), keepRatio: 0 });
              }}
            />
          )}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <NumberField label="Width" value={String(options.width)} onChange={(v) => setSide("width", v)} suffix={unit} decimals={o.mode === "print"} />
            </View>
            <View style={{ flex: 1 }}>
              <NumberField label="Height" value={String(options.height)} onChange={(v) => setSide("height", v)} suffix={unit} decimals={o.mode === "print"} />
            </View>
          </View>
          {o.mode === "print" && <NumberField label="Resolution" value={String(options.dpi)} onChange={(dpi) => set({ dpi })} suffix="DPI" />}
          <Toggle label="Keep proportions" hint="Leave on to avoid stretching. Off, you choose how the photo fills the new shape." value={o.keepRatio} onChange={(v) => set({ keepRatio: v ? 1 : 0 })} />
          {!o.keepRatio && (
            <Animated.View entering={fade}>
              <Field label="Fit">
                <Segmented
                  tone="dark"
                  value={o.fit}
                  onChange={(fit) => set({ fit })}
                  options={[
                    { value: "fill" as const, label: "Crop to fill" },
                    { value: "stretch" as const, label: "Stretch" },
                  ]}
                />
              </Field>
            </Animated.View>
          )}
        </Animated.View>
      )}

      {first && out && (
        <View style={{ borderRadius: 12, backgroundColor: C.sunken, paddingHorizontal: 12, paddingVertical: 9 }}>
          <T style={{ fontSize: 12.5, color: C.fgMuted, fontVariant: ["tabular-nums"] }}>
            {files.length > 1 ? "First photo: " : ""}
            {first.width} × {first.height} →{" "}
            <T weight="semibold" style={{ fontSize: 12.5, color: C.fg }}>
              {out.width} × {out.height} px
            </T>
          </T>
        </View>
      )}

      <Toggle label="Limit the file size" hint="For upload forms that need, say, under 50 KB." value={o.limit} onChange={(v) => set({ limit: v ? 1 : 0 })} />
      {o.limit && (
        <Animated.View entering={fade} style={{ gap: 10 }}>
          <NumberField label="Maximum size" value={o.target} onChange={(t) => set({ target: t })} suffix={/mb/i.test(o.target) ? "" : "KB"} free />
          <Chips items={TARGET_PRESETS.map((p) => ({ key: p, label: /mb/i.test(p) ? p : `${p} KB`, on: parseSize(p) === target }))} onPick={(k) => set({ target: k })} />
        </Animated.View>
      )}

      <Field label="Save as">
        <Segmented
          tone="dark"
          value={o.format}
          onChange={(format) => set({ format })}
          options={[
            { value: "keep" as const, label: "Keep" },
            { value: "jpeg" as const, label: "JPG" },
            { value: "png" as const, label: "PNG" },
            { value: "webp" as const, label: "WEBP" },
          ]}
        />
      </Field>
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View>
      <T weight="medium" style={{ fontSize: 12.5, color: C.fgMuted, marginBottom: 6 }}>
        {label}
      </T>
      {children}
    </View>
  );
}

/** A number box with its unit inside. `free` allows text like "1.5 MB". */
function NumberField({ label, value, onChange, suffix, decimals, free }: { label: string; value: string; onChange: (v: string) => void; suffix?: string; decimals?: boolean; free?: boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <Field label={label}>
      <View style={{ flexDirection: "row", alignItems: "center", height: 46, borderRadius: 12, borderWidth: 1, borderColor: focused ? C.brand400 : C.lineStrong, backgroundColor: C.sunken, paddingHorizontal: 14 }}>
        <TextInput
          value={value}
          onChangeText={(v) => onChange(free ? v : v.replace(/[^0-9.,]/g, ""))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType={free ? "default" : decimals ? "decimal-pad" : "number-pad"}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          selectTextOnFocus
          accessibilityLabel={suffix ? `${label} in ${suffix}` : label}
          placeholder="0"
          placeholderTextColor={C.fgSubtle}
          maxFontSizeMultiplier={1.4}
          style={{ flex: 1, height: "100%", color: C.fg, fontSize: 15, fontVariant: ["tabular-nums"] }}
        />
        {!!suffix && (
          <T weight="medium" maxFontSizeMultiplier={TEXT_SCALE.label} style={{ fontSize: 13, color: C.fgSubtle, marginLeft: 8 }}>
            {suffix}
          </T>
        )}
      </View>
    </Field>
  );
}

/** Quick picks. The one matching the current value is highlighted. */
function Chips({ items, onPick }: { items: { key: string; label: string; on: boolean }[]; onPick: (key: string) => void }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {items.map((c) => (
        <Pressable
          key={c.key}
          onPress={() => {
            haptics.tick();
            onPick(c.key);
          }}
          accessibilityRole="button"
          accessibilityState={{ selected: c.on }}
          hitSlop={4}
          style={({ pressed }) => ({
            minHeight: 34,
            justifyContent: "center",
            borderRadius: 99,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: c.on ? C.brand400 : C.lineStrong,
            backgroundColor: c.on ? "rgba(139,124,246,0.16)" : C.sunken,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <T weight={c.on ? "semibold" : "medium"} maxFontSizeMultiplier={TEXT_SCALE.label} style={{ fontSize: 12.5, color: c.on ? C.brand200 : C.fgMuted }}>
            {c.label}
          </T>
        </Pressable>
      ))}
    </View>
  );
}

function Toggle({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }} accessibilityHint={hint} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ flex: 1 }}>
        <T weight="semibold" style={{ fontSize: 14.5 }}>
          {label}
        </T>
        <T style={{ fontSize: 12.5, color: C.fgMuted, marginTop: 2 }}>{hint}</T>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: C.lineStrong, true: C.brand500 }} thumbColor="#ffffff" ios_backgroundColor={C.lineStrong} importantForAccessibility="no-hide-descendants" />
    </Pressable>
  );
}
