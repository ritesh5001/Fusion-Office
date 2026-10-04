import { useEffect } from "react";
import { View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { ChevronRight, Server, Sparkles } from "lucide-react-native";
import { C } from "@/theme";
import { useReduced } from "@/lib/motion";
import { NATIVE } from "@/lib/native";
import type { ToolDef } from "@/lib/tools";
import { PressScale, T, ToolTile } from "./ui";

/**
 * Two-column tool card: icon on top, one-line name, where it runs, and a
 * short description. Long-press shows a preview (`onLongPress`).
 * Cards cascade in 50ms apart, at most six moving at once. The entrance
 * starts once on mount, so re-renders (typing in search) can't interrupt it.
 */
export function ToolCard({ tool: t, index = 0, onPress, onLongPress }: { tool: ToolDef; index?: number; onPress: () => void; onLongPress?: () => void }) {
  const reduced = useReduced();
  const soon = t.status === "soon";
  const shown = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    shown.value = withDelay(Math.min(index, 5) * 50 + 60, withTiming(1, { duration: 420, easing: Easing.bezier(0.2, 0.8, 0.2, 1) }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const enter = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ translateY: (1 - shown.value) * 16 }] }));
  return (
    <Animated.View style={[{ width: "48.5%" }, enter]}>
      <PressScale
        disabled={soon}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={320}
        accessibilityLabel={`${t.name}. ${t.description}`}
        style={{ minHeight: 150, borderRadius: 18, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, padding: 14, opacity: soon ? 0.55 : 1 }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <ToolTile tool={t} size={42} />
          {!soon && <ChevronRight size={16} color={C.fgSubtle} />}
        </View>
        <T weight="semibold" numberOfLines={1} style={{ marginTop: 12, fontSize: 14.5, letterSpacing: -0.2 }}>{t.name}</T>
        <View style={{ marginTop: 4, flexDirection: "row", alignItems: "center", gap: 4 }}>
          {t.runs === "ai" ? <Sparkles size={11} color={C.brand300} /> : t.runs === "server" ? <Server size={11} color={C.fgMuted} /> : <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent }} />}
          <T weight="medium" style={{ fontSize: 11, color: t.runs === "browser" ? C.accent : C.fgMuted }}>
            {soon ? "Coming soon" : t.runs === "ai" ? "Uses AI" : t.runs === "server" ? "Server" : NATIVE[t.slug] ? "On your device" : "Private"}
          </T>
        </View>
        <T numberOfLines={2} style={{ marginTop: 6, fontSize: 12.5, lineHeight: 17, color: C.fgMuted }}>{t.description}</T>
      </PressScale>
    </Animated.View>
  );
}
