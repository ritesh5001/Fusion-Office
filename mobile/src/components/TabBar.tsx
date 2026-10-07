import { useEffect } from "react";
import { Keyboard, Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { DUR, IOS } from "@/lib/ease";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Clock, House, LayoutGrid, Plus, Settings, type LucideIcon } from "lucide-react-native";
import { C } from "@/theme";
import { useSession } from "@/lib/session";
import { useReduced } from "@/lib/motion";
import { T, TEXT_SCALE, shadow } from "./ui";

/** The parts of React Navigation's tab bar props this bar uses. */
interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: { navigate: (name: string) => void; emit: (e: { type: "tabPress"; target: string; canPreventDefault: true }) => { defaultPrevented: boolean } };
}

const TABS: Record<string, { label: string; icon: LucideIcon }> = {
  index: { label: "Home", icon: House },
  tools: { label: "Tools", icon: LayoutGrid },
  recent: { label: "Recent", icon: Clock },
  settings: { label: "Settings", icon: Settings },
};

export const TAB_BAR_SPACE = 92;

/** Floating tab bar: Home, Tools, a raised + to add a file, Recent, Settings. */
export function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { openSheet } = useSession();
  const routes = state.routes.filter((r) => TABS[r.name]);
  const left = routes.slice(0, 2);
  const right = routes.slice(2);

  const tab = (r: { key: string; name: string }) => {
    const focused = state.routes[state.index]?.key === r.key;
    return (
      <TabButton
        key={r.key}
        focused={focused}
        label={TABS[r.name].label}
        icon={TABS[r.name].icon}
        onPress={() => {
          Keyboard.dismiss();
          const e = navigation.emit({ type: "tabPress", target: r.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) navigation.navigate(r.name);
        }}
      />
    );
  };

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]} pointerEvents="box-none">
      <View style={styles.bar} accessibilityRole="tablist">
        {Platform.OS === "ios" ? <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} /> : null}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: Platform.OS === "ios" ? "rgba(18,21,28,0.72)" : "rgba(18,21,28,0.97)" }]} />
        {left.map(tab)}
        <View style={{ width: 64 }} />
        {right.map(tab)}
      </View>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          Keyboard.dismiss();
          openSheet();
        }}
        accessibilityRole="button"
        accessibilityLabel="Add a file"
        style={({ pressed }) => [styles.fab, shadow(C.accent, 18, 0.55), pressed && { transform: [{ scale: 0.96 }], opacity: 0.92 }]}
      >
        <Plus size={28} color={C.onAccent} strokeWidth={2.6} />
      </Pressable>
    </View>
  );
}

function TabButton({ focused, label, icon: Icon, onPress }: { focused: boolean; label: string; icon: LucideIcon; onPress: () => void }) {
  const reduced = useReduced();
  const on = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    on.value = reduced ? (focused ? 1 : 0) : withTiming(focused ? 1 : 0, { duration: focused ? DUR.small : 150, easing: IOS });
  }, [focused, reduced, on]);
  // The active pill grows in behind the icon.
  const pill = useAnimatedStyle(() => ({ opacity: on.value, transform: [{ scaleX: 0.4 + on.value * 0.6 }] }));
  const lift = useAnimatedStyle(() => ({ transform: [{ translateY: -on.value * 1.5 }] }));
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 8 }}
    >
      <View style={{ width: 52, height: 30, alignItems: "center", justifyContent: "center" }}>
        <Animated.View style={[{ position: "absolute", inset: 0, borderRadius: 15, backgroundColor: "rgba(205,245,100,0.14)" }, pill]} />
        <Animated.View style={lift}>
          <Icon size={21} color={focused ? C.accent : C.fgSubtle} strokeWidth={focused ? 2.3 : 1.9} />
        </Animated.View>
      </View>
      <T weight={focused ? "semibold" : "medium"} numberOfLines={1} maxFontSizeMultiplier={TEXT_SCALE.label} style={{ marginTop: 2, fontSize: 11, color: focused ? C.accent : C.fgSubtle }}>{label}</T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 12, alignItems: "center" },
  bar: { flexDirection: "row", alignSelf: "stretch", width: "100%", maxWidth: 520, marginHorizontal: "auto", minHeight: 64, borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: C.line, alignItems: "center" },
  fab: { position: "absolute", top: -18, width: 60, height: 60, borderRadius: 30, backgroundColor: C.accent, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: C.app },
});
