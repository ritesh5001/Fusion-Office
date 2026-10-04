import { type ReactNode } from "react";
import { ScrollView, View, type ScrollViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { C } from "@/theme";
import { Backdrop, Logo, PressScale, T } from "./ui";
import { TAB_BAR_SPACE } from "./TabBar";
import { MAX_CONTENT } from "@/lib/layout";

/** A tab screen: backdrop, safe-area padding, room for the floating tab bar. */
export function Screen({ children, tabs = true, scroll = true, ...p }: { children: ReactNode; tabs?: boolean; scroll?: boolean } & ScrollViewProps) {
  const insets = useSafeAreaInsets();
  // On tablets the content stays a readable width, centred.
  const pad = { paddingTop: insets.top + 6, paddingBottom: (tabs ? TAB_BAR_SPACE : 24) + insets.bottom + 12, paddingHorizontal: 16, width: "100%" as const, maxWidth: MAX_CONTENT, alignSelf: "center" as const };
  return (
    <View style={{ flex: 1, backgroundColor: C.app }}>
      <Backdrop />
      {scroll ? (
        <ScrollView {...p} contentContainerStyle={[pad, p.contentContainerStyle]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, pad]}>{children}</View>
      )}
    </View>
  );
}

/** Logo + name on the left, actions on the right. */
export function BrandHeader({ right }: { right?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", height: 52 }}>
      <Logo size={28} />
      <T weight="display" style={{ marginLeft: 10, fontSize: 19, letterSpacing: -0.4, flex: 1 }}>Fusion Office</T>
      {right}
    </View>
  );
}

export function BackHeader({ title, right }: { title?: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", height: 52, gap: 8 }}>
      <PressScale onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} accessibilityLabel="Back" style={{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: C.raised, borderWidth: 1, borderColor: C.line }}>
        <ArrowLeft size={20} color={C.fg} />
      </PressScale>
      {title ? <T weight="semibold" numberOfLines={1} style={{ flex: 1, fontSize: 16 }}>{title}</T> : <View style={{ flex: 1 }} />}
      {right}
    </View>
  );
}
