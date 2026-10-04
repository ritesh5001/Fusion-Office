import { useEffect } from "react";
import { View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Check } from "lucide-react-native";
import { C } from "@/theme";
import { T } from "./ui";

const LABELS = ["Choose", "Configure", "Process", "Download"];

function Line({ filled }: { filled: boolean }) {
  const v = useSharedValue(filled ? 1 : 0);
  useEffect(() => {
    v.value = withTiming(filled ? 1 : 0, { duration: 450, easing: Easing.bezier(0.3, 0.7, 0.2, 1) });
  }, [filled, v]);
  const a = useAnimatedStyle(() => ({ transform: [{ scaleX: v.value }] }));
  return (
    <View style={{ flex: 1, height: 2, borderRadius: 1, backgroundColor: C.line, overflow: "hidden", marginHorizontal: 4 }}>
      <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: C.accent, transformOrigin: "left" }, a]} />
    </View>
  );
}

/** Where you are in a tool: choose → configure → process → download. */
export function StepTracker({ step }: { step: number }) {
  return (
    <View accessibilityLabel={`Step ${Math.min(step + 1, 4)} of 4: ${LABELS[Math.min(step, 3)]}`}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {LABELS.map((l, i) => {
          const done = i < step || (i === 3 && step >= 3);
          const now = i === step && step < 3;
          return (
            <View key={l} style={{ flexDirection: "row", alignItems: "center", flex: i < 3 ? 1 : 0 }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", borderWidth: 1, backgroundColor: done ? C.accent : now ? "rgba(139,124,246,0.2)" : C.surface, borderColor: done ? C.accent : now ? C.brand400 : C.lineStrong }}>
                {done ? <Check size={13} strokeWidth={3} color={C.onAccent} /> : <T weight="semibold" style={{ fontSize: 11.5, color: now ? C.brand200 : C.fgSubtle }}>{i + 1}</T>}
              </View>
              {i < 3 && <Line filled={i < step} />}
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
        {LABELS.map((l, i) => (
          <T key={l} weight="medium" style={{ fontSize: 11, color: i <= step ? C.fg : C.fgSubtle, width: 64, textAlign: i === 0 ? "left" : i === 3 ? "right" : "center", marginLeft: i === 0 ? -4 : 0, marginRight: i === 3 ? -4 : 0 }}>{l}</T>
        ))}
      </View>
    </View>
  );
}
