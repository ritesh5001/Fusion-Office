import { useEffect, useState } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { C } from "@/theme";
import { T } from "./ui";

/**
 * Segmented control whose selected pill slides between options (250ms) rather
 * than fading. `tone="paper"` is the light version used inside the drop card.
 */
export function Segmented<V extends string | number>({
  value,
  options,
  onChange,
  tone = "paper",
  style,
}: {
  value: V;
  options: { value: V; label: string }[];
  onChange: (v: V) => void;
  tone?: "paper" | "dark";
  style?: StyleProp<ViewStyle>;
}) {
  const [width, setWidth] = useState(0);
  const at = Math.max(0, options.findIndex((o) => o.value === value));
  const x = useSharedValue(0);
  const seg = width ? (width - 8) / options.length : 0;

  useEffect(() => {
    x.value = withTiming(at * seg, { duration: 250, easing: Easing.bezier(0.3, 0.7, 0.2, 1) });
  }, [at, seg, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  const paper = tone === "paper";
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="radiogroup"
      style={[
        { flexDirection: "row", borderRadius: 99, padding: 4, borderWidth: 1 },
        paper ? { backgroundColor: "rgba(255,255,255,0.8)", borderColor: "#d9d7e4" } : { backgroundColor: C.sunken, borderColor: C.line },
        style,
      ]}
    >
      {seg > 0 && (
        <Animated.View
          style={[
            { position: "absolute", top: 4, bottom: 4, left: 4, width: seg, borderRadius: 99, backgroundColor: paper ? "#151738" : C.fg },
            paper && { shadowColor: "#151738", shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
            pill,
          ]}
        />
      )}
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(o.value);
            }}
            style={{ flex: 1, height: 40, alignItems: "center", justifyContent: "center" }}
          >
            <T weight="semibold" style={{ fontSize: 14, color: on ? (paper ? "#fff" : C.app) : paper ? "#2b2d48" : C.fgMuted }}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}
