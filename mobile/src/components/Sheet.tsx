import { type ReactNode, useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "@/theme";
import { useReduced } from "@/lib/motion";

/**
 * Bottom sheet: springs up from the bottom, dims the screen behind it, and
 * closes on a tap outside or a swipe down. Thumb-friendly for tool settings
 * and actions.
 */
export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const reduced = useReduced();
  const [mounted, setMounted] = useState(open);
  const y = useSharedValue(600);
  const fade = useSharedValue(0);
  // Mount as soon as it opens (adjusting state during render, not in an effect).
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open) {
      fade.value = withTiming(1, { duration: 200 });
      y.value = reduced ? 0 : withSpring(0, { damping: 22, stiffness: 240 });
    } else if (mounted) {
      fade.value = withTiming(0, { duration: 160 });
      y.value = withTiming(600, { duration: reduced ? 0 : 200, easing: Easing.in(Easing.quad) }, (done) => done && runOnJS(setMounted)(false));
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      y.set(Math.max(0, e.translationY));
    })
    .onEnd((e) => {
      if (e.translationY > 90 || e.velocityY > 800) runOnJS(onClose)();
      else y.set(withSpring(0, { damping: 22, stiffness: 240 }));
    });

  const panel = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const dim = useAnimatedStyle(() => ({ opacity: fade.value }));

  if (!mounted) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(5,6,10,0.62)" }, dim]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View style={[styles.panel, { paddingBottom: insets.bottom + 16 }, panel]}>
          <GestureDetector gesture={pan}>
            <View style={{ alignItems: "center", paddingVertical: 10 }}>
              <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: C.lineStrong }} />
            </View>
          </GestureDetector>
          {children}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.overlay,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: C.lineStrong,
    paddingHorizontal: 18,
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 30,
  },
});
