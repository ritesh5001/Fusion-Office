import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from "@expo-google-fonts/plus-jakarta-sans";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { C } from "@/theme";
import { MotionProvider } from "@/lib/motion";
import { SessionProvider } from "@/lib/session";
import { AddSheet } from "@/components/AddSheet";

export default function RootLayout() {
  const [loaded] = useFonts({ PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: C.app }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.app }}>
      <SafeAreaProvider>
        <MotionProvider>
          <SessionProvider>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.app }, animation: "slide_from_right" }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="tool/[slug]" />
            </Stack>
            <AddSheet />
          </SessionProvider>
        </MotionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
