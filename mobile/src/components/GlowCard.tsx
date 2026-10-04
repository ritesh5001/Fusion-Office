import { type ReactNode, useEffect, useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { C } from "@/theme";
import { useReduced } from "@/lib/motion";

/**
 * The neon card: a purple → lime gradient border with a slow light sweeping
 * round it (every 5 s), a soft outer glow that brightens when `hot`, and a
 * light paper surface inside.
 */
export function GlowCard({ children, hot = false, radius = 28, style, inner }: { children: ReactNode; hot?: boolean; radius?: number; style?: StyleProp<ViewStyle>; inner?: StyleProp<ViewStyle> }) {
  const reduced = useReduced();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const spin = useSharedValue(0);
  const glow = useSharedValue(0.55);

  useEffect(() => {
    if (reduced) {
      cancelAnimation(spin);
      return;
    }
    spin.value = 0;
    spin.value = withRepeat(withTiming(360, { duration: 5000, easing: Easing.linear }), -1);
  }, [reduced, spin]);
  useEffect(() => {
    glow.value = withTiming(hot ? 0.95 : 0.55, { duration: 250 });
  }, [hot, glow]);

  const sweep = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  const halo = useAnimatedStyle(() => ({ opacity: glow.value }));
  const diag = Math.hypot(size.w, size.h) * 1.15;

  return (
    <View style={style} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {/* Outer glow: violet on the left, lime on the right. */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, halo]}>
        <View style={[styles.halo, { borderRadius: radius + 6, shadowColor: "#8b7cf6", left: -2, right: "40%" }]} />
        <View style={[styles.halo, { borderRadius: radius + 6, shadowColor: "#cdf564", left: "40%", right: -2 }]} />
      </Animated.View>
      <View style={{ borderRadius: radius, overflow: "hidden", padding: 3 }}>
        <LinearGradient colors={["#9d91fb", "#cfc8ff", "#cdf564"]} start={{ x: 0, y: 0.3 }} end={{ x: 1, y: 0.7 }} style={StyleSheet.absoluteFill} />
        {/* The sweeping light: a rotating streak, clipped to the border by the card on top. */}
        {!reduced && size.w > 0 && (
          <Animated.View pointerEvents="none" style={[{ position: "absolute", width: diag, height: diag, left: (size.w - diag) / 2, top: (size.h - diag) / 2 }, sweep]}>
            <LinearGradient colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.95)", "rgba(255,255,255,0)"]} start={{ x: 0.5, y: 0 }} end={{ x: 0.62, y: 0 }} style={{ position: "absolute", left: "50%", top: 0, width: "14%", height: "50%" }} />
          </Animated.View>
        )}
        <View style={[{ borderRadius: radius - 2, backgroundColor: C.paper, overflow: "hidden" }, inner]}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  halo: { position: "absolute", top: 6, bottom: 6, backgroundColor: C.app, shadowOpacity: 0.9, shadowRadius: 26, shadowOffset: { width: 0, height: 0 }, elevation: 16 },
});
