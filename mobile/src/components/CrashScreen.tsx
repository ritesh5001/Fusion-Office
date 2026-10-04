import { View } from "react-native";
import type { ErrorBoundaryProps } from "expo-router";
import { C } from "@/theme";
import { Backdrop, Logo, PressScale, T } from "./ui";

/** Shown instead of a blank screen if something breaks while rendering. */
export function CrashScreen({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={{ flex: 1, backgroundColor: C.app, alignItems: "center", justifyContent: "center", padding: 28 }}>
      <Backdrop />
      <Logo size={56} />
      <T weight="display" header style={{ marginTop: 20, fontSize: 24, letterSpacing: -0.6, textAlign: "center" }}>Something went wrong</T>
      <T style={{ marginTop: 8, fontSize: 14.5, lineHeight: 21, color: C.fgMuted, textAlign: "center", maxWidth: 320 }}>
        Your files are safe on this device. Try again, and if it keeps happening, restart the app.
      </T>
      <T selectable numberOfLines={3} style={{ marginTop: 14, fontSize: 12, color: C.fgSubtle, textAlign: "center", maxWidth: 320 }}>{error.message}</T>
      <PressScale onPress={retry} style={{ marginTop: 22, minHeight: 50, paddingHorizontal: 26, borderRadius: 25, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" }}>
        <T weight="bold" style={{ fontSize: 15.5, color: C.onAccent }}>Try again</T>
      </PressScale>
    </View>
  );
}
