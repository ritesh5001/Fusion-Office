import { type ReactNode, useEffect } from "react";
import { Platform, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Defs, Path, Pattern, Rect, Text as SvgText } from "react-native-svg";
import { C, F } from "@/theme";
import { tileFor, type FileKind, type ToolDef } from "@/lib/tools";
import { useReduced } from "@/lib/motion";
import { DUR, IOS } from "@/lib/ease";

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Rect x="4" y="7" width="16" height="21" rx="4" fill={C.brand500} />
      <Rect x="11" y="3" width="17" height="22" rx="4" fill={C.accent} />
      <Path d="M15.5 10h8M15.5 14h8M15.5 18h5" stroke={C.onAccent} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * How far text may grow with the system text size. Body text scales the
 * most; big display headings and compact UI labels less, so layouts hold
 * at the largest accessibility sizes.
 */
export const TEXT_SCALE = { body: 1.6, display: 1.25, label: 1.2 } as const;

/** Text in the app's type scale. `header` marks section titles for screen readers. */
export function T({ style, weight = "body", header, ...p }: TextProps & { weight?: keyof typeof F; header?: boolean }) {
  const display = weight === "display" || weight === "displayBold";
  return (
    <Text
      maxFontSizeMultiplier={display ? TEXT_SCALE.display : TEXT_SCALE.body}
      accessibilityRole={header ? "header" : undefined}
      {...p}
      style={[{ fontFamily: F[weight], color: C.fg }, style]}
    />
  );
}

/** Text filled with the purple → lime (or any) gradient. */
export function GradientText({ children, style, colors = [C.brand500, C.brand300], header }: { children: string; style?: StyleProp<TextStyle>; colors?: readonly [string, string, ...string[]]; header?: boolean }) {
  // Masked views don't render in browsers; there, CSS gradient text does the same job.
  if (Platform.OS === "web") {
    const web = { backgroundImage: `linear-gradient(90deg, ${colors.join(", ")})`, backgroundClip: "text", WebkitBackgroundClip: "text", color: "transparent" } as unknown as TextStyle;
    return <Text maxFontSizeMultiplier={TEXT_SCALE.display} accessibilityRole={header ? "header" : undefined} style={[style, web]}>{children}</Text>;
  }
  // The mask hides its text from screen readers, so the wrapper carries the words.
  return (
    <View accessible accessibilityLabel={children} accessibilityRole={header ? "header" : "text"}>
      <MaskedView maskElement={<Text maxFontSizeMultiplier={TEXT_SCALE.display} style={style}>{children}</Text>}>
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Text maxFontSizeMultiplier={TEXT_SCALE.display} style={[style, { opacity: 0 }]}>{children}</Text>
        </LinearGradient>
      </MaskedView>
    </View>
  );
}

/** Flat colour tile with a dark glyph, like an app icon (as on the website). */
export function ToolTile({ tool, size = 40, radius }: { tool: Pick<ToolDef, "slug" | "category" | "icon">; size?: number; radius?: number }) {
  const { color, letter, Icon } = tileFor(tool);
  return (
    <View style={{ width: size, height: size, borderRadius: radius ?? size * 0.28, backgroundColor: color, alignItems: "center", justifyContent: "center" }}>
      {letter ? <Text allowFontScaling={false} style={{ fontFamily: F.display, fontSize: size * 0.45, color: C.tileGlyph }}>{letter}</Text> : <Icon size={size * 0.5} color={C.tileGlyph} strokeWidth={2} />}
    </View>
  );
}

/** Pressable that scales down a touch (150–200ms) and taps a light haptic. */
export function PressScale({ children, style, haptic = true, onPress, accessibilityRole = "button", hitSlop = 6, ...p }: PressableProps & { style?: StyleProp<ViewStyle>; haptic?: boolean; children: ReactNode }) {
  const s = useSharedValue(1);
  const reduced = useReduced();
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable
      {...p}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled: !!p.disabled, ...p.accessibilityState }}
      hitSlop={hitSlop}
      onPressIn={() => !reduced && s.set(withTiming(0.97, { duration: DUR.press, easing: IOS }))}
      onPressOut={() => s.set(withTiming(1, { duration: DUR.release, easing: IOS }))}
      onPress={(e) => {
        if (haptic) Haptics.selectionAsync().catch(() => {});
        onPress?.(e);
      }}
    >
      <Animated.View style={[style, a]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Coloured file icon for a kind of file (PDF page, Word doc, photo). */
export function KindGlyph({ kind, size = 40 }: { kind: FileKind; size?: number }) {
  if (kind === "image")
    return (
      <Svg width={size * 1.1} height={size} viewBox="0 0 44 40">
        <Rect width="44" height="40" rx="7" fill={C.brand500} />
        <Circle cx="31" cy="12" r="4.5" fill="#fff" />
        <Path d="M5 33 17 17l9 11 5-6 8 11z" fill="#fff" />
      </Svg>
    );
  const pdf = kind === "pdf";
  return (
    <Svg width={size * 0.83} height={size} viewBox="0 0 40 48">
      <Path d="M4 0h22l14 14v30a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4z" fill={pdf ? "#e5534b" : "#3b6fe0"} />
      <Path d="M26 0v10a4 4 0 0 0 4 4h10z" fill="#fff" fillOpacity={0.55} />
      <SvgText x="20" y="36" textAnchor="middle" fill="#fff" fontSize={pdf ? 11 : 15} fontWeight="800">
        {pdf ? "PDF" : "W"}
      </SvgText>
    </Svg>
  );
}

/** Gentle vertical float, `distance` px (no more than 6). */
export function Float({ children, distance = 4, duration = 3600, delay = 0, style }: { children: ReactNode; distance?: number; duration?: number; delay?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReduced();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduced) {
      y.value = 0;
      return;
    }
    y.value = withDelay(delay, withRepeat(withSequence(withTiming(-distance, { duration: duration / 2, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: duration / 2, easing: Easing.inOut(Easing.sin) })), -1));
  }, [reduced, distance, duration, delay, y]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

/** A dot that fades in and out on its own clock (background twinkle). */
function Twinkle({ x, y, delay, duration }: { x: string; y: string; delay: number; duration: number }) {
  const reduced = useReduced();
  const o = useSharedValue(0.05);
  useEffect(() => {
    o.value = reduced ? 0.12 : withDelay(delay, withRepeat(withSequence(withTiming(0.55, { duration: duration / 2 }), withTiming(0.04, { duration: duration / 2 })), -1));
  }, [reduced, delay, duration, o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ position: "absolute", left: x as `${number}%`, top: y as `${number}%`, width: 3, height: 3, borderRadius: 2, backgroundColor: "#fff" }, a]} />;
}

const TWINKLES = Array.from({ length: 14 }, (_, i) => ({
  x: `${(i * 37 + 11) % 97}%`,
  y: `${(i * 53 + 7) % 89}%`,
  delay: ((i * 7) % 11) * 450,
  duration: 4000 + ((i * 3) % 5) * 1000,
}));

/** Screen background: navy haze over a faint dot grid, with a few twinkling dots. */
export function Backdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={[C.navyGlow, C.app, C.app]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={["rgba(92,77,204,0.28)", "rgba(92,77,204,0)"]} start={{ x: 0.5, y: 0.1 }} end={{ x: 0.5, y: 0.6 }} style={[StyleSheet.absoluteFill, { height: 520 }]} />
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
            <Circle cx="1" cy="1" r="1" fill="#fff" fillOpacity={0.05} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#dots)" />
      </Svg>
      {TWINKLES.map((t, i) => (
        <Twinkle key={i} {...t} />
      ))}
    </View>
  );
}

export function Eyebrow({ children, color = C.fgSubtle, style }: { children: string; color?: string; style?: StyleProp<TextStyle> }) {
  return <T weight="semibold" header maxFontSizeMultiplier={TEXT_SCALE.label} style={[{ fontSize: 11.5, letterSpacing: 1.4, textTransform: "uppercase", color }, style]}>{children}</T>;
}

/** Small rounded label: Server, AI, Soon… */
export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "accent" }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: tone === "accent" ? C.accent : C.raised }}>
      {typeof children === "string" ? <T weight="medium" maxFontSizeMultiplier={TEXT_SCALE.label} style={{ fontSize: 10.5, color: tone === "accent" ? C.onAccent : C.fgMuted }}>{children}</T> : children}
    </View>
  );
}

export const shadow = (color: string, radius = 18, opacity = 0.6): ViewStyle => ({ shadowColor: color, shadowOpacity: opacity, shadowRadius: radius, shadowOffset: { width: 0, height: 0 }, elevation: 8 });
