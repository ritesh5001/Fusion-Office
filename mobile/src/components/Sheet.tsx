import { type ReactNode, useEffect, useState } from "react";
import { Keyboard, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "@/theme";
import { useReduced } from "@/lib/motion";
import { DUR, IOS } from "@/lib/ease";

/**
 * Bottom sheet: glides up from the bottom (iOS curve, no bounce), dims the screen behind it, and
 * closes on a tap outside or a swipe down. Thumb-friendly for tool settings
 * and actions.
 */
export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const reduced = useReduced();
  const [mounted, setMounted] = useState(open);
  const y = useSharedValue(600);
  const fade = useSharedValue(0);
  // iOS doesn't resize a modal for the keyboard, so lift the sheet above it
  // with the keyboard's own timing. Android resizes the modal window itself.
  const kb = useSharedValue(0);
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    const lift = (to: number, duration: number) => (kb.value = withTiming(to, { duration: duration || DUR.small, easing: IOS }));
    const show = Keyboard.addListener("keyboardWillShow", (e) => lift(Math.max(0, e.endCoordinates.height - insets.bottom), e.duration));
    const hide = Keyboard.addListener("keyboardWillHide", (e) => lift(0, e.duration));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [insets.bottom, kb]);
  // Mount as soon as it opens (adjusting state during render, not in an effect).
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open) {
      fade.value = withTiming(1, { duration: DUR.small });
      y.value = reduced ? 0 : withTiming(0, { duration: DUR.sheet, easing: IOS });
    } else if (mounted) {
      fade.value = withTiming(0, { duration: DUR.exit });
      y.value = withTiming(600, { duration: reduced ? 0 : DUR.exit, easing: Easing.bezier(0.4, 0, 1, 1) }, (done) => done && runOnJS(setMounted)(false));
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      y.set(Math.max(0, e.translationY));
    })
    .onEnd((e) => {
      if (e.translationY > 90 || e.velocityY > 800) runOnJS(onClose)();
      else y.set(withTiming(0, { duration: DUR.small, easing: IOS }));
    });

  const panel = useAnimatedStyle(() => ({ transform: [{ translateY: y.value - kb.value }] }));
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
