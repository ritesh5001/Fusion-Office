import { useEffect } from "react";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { C } from "@/theme";
import { useReduced } from "@/lib/motion";
import type { ToolDef } from "@/lib/tools";
import { PressScale, T, ToolTile } from "./ui";

/**
 * Tool card: the icon and name, centred. Long-press shows a preview
 * (`onLongPress`).
 * Cards cascade in 50ms apart, at most six moving at once. The entrance
 * starts once on mount, so re-renders (typing in search) can't interrupt it.
 */
export function ToolCard({ tool: t, index = 0, width, onPress, onLongPress }: { tool: ToolDef; index?: number; width?: number; onPress: () => void; onLongPress?: () => void }) {
  const reduced = useReduced();
  const soon = t.status === "soon";
  const shown = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    shown.value = withDelay(Math.min(index, 5) * 50 + 60, withTiming(1, { duration: 420, easing: Easing.bezier(0.2, 0.8, 0.2, 1) }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const enter = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ translateY: (1 - shown.value) * 16 }] }));
  return (
    <Animated.View style={[{ width: width ?? "48.5%" }, enter]}>
      <PressScale
        disabled={soon}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={320}
        accessibilityLabel={soon ? `${t.name}, coming soon` : t.name}
        style={{ aspectRatio: 1, borderRadius: 18, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, paddingHorizontal: 6, paddingVertical: 8, alignItems: "center", justifyContent: "center", opacity: soon ? 0.55 : 1 }}
      >
        <ToolTile tool={t} size={40} />
        <T weight="semibold" numberOfLines={2} maxFontSizeMultiplier={1.25} style={{ marginTop: 8, fontSize: 12.5, lineHeight: 16, letterSpacing: -0.1, textAlign: "center" }}>{t.name}</T>
      </PressScale>
    </Animated.View>
  );
}
