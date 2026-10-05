import { useEffect } from "react";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle, Path, Rect, Text as SvgText } from "react-native-svg";
import { C } from "@/theme";
import type { FileKind } from "@/lib/tools";

/** Line-art icons per kind; switching kinds cross-fades and turns them like a morph. */
export function KindOutline({ kind, active }: { kind: FileKind; active: boolean }) {
  const v = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    v.value = withTiming(active ? 1 : 0, { duration: 250, easing: Easing.bezier(0.3, 0.7, 0.2, 1) });
  }, [active, v]);
  const a = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ scale: 0.75 + v.value * 0.25 }, { rotate: `${(1 - v.value) * -6}deg` }] }));
  return (
    <Animated.View style={[{ position: "absolute", inset: 0 }, a]}>
      <Svg width={60} height={68} viewBox="0 0 60 68" fill="none" stroke={C.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
        {kind === "image" ? (
          <>
            <Rect x="4" y="10" width="52" height="46" rx="8" />
            <Circle cx="40" cy="25" r="5" />
            <Path d="M8 50 22 34l10 11 6-6 14 13" />
          </>
        ) : (
          <>
            <Path d="M10 3h26l18 18v38a6 6 0 0 1-6 6H10a6 6 0 0 1-6-6V9a6 6 0 0 1 6-6z" />
            <Path d="M36 3v12a6 6 0 0 0 6 6h12" />
            {kind === "pdf" ? (
              <SvgText x="27" y="49" textAnchor="middle" stroke="none" fill={C.ink} fontSize="13" fontWeight="800">PDF</SvgText>
            ) : (
              <Path d="M14 32h22M14 40h28M14 48h18" strokeWidth={2.2} />
            )}
          </>
        )}
      </Svg>
    </Animated.View>
  );
}
