import { View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WifiOff } from "lucide-react-native";
import { C } from "@/theme";
import { useOffline } from "@/lib/network";
import { useReduced } from "@/lib/motion";
import { T } from "./ui";

/** A slim notice at the top while offline. On-device tools keep working; the rest need a connection. */
export function OfflineBanner() {
  const offline = useOffline();
  const insets = useSafeAreaInsets();
  const reduced = useReduced();
  if (!offline) return null;
  return (
    <Animated.View
      entering={reduced ? undefined : FadeInUp.duration(250)}
      exiting={reduced ? undefined : FadeOutUp.duration(180)}
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={{ position: "absolute", top: insets.top + 4, left: 16, right: 16, alignItems: "center", zIndex: 50 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 99, backgroundColor: C.overlay, borderWidth: 1, borderColor: C.lineStrong, paddingHorizontal: 14, paddingVertical: 8, shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 12 }}>
        <WifiOff size={15} color={C.amber} />
        <T weight="medium" style={{ fontSize: 13 }}>Offline · on-device tools still work</T>
      </View>
    </Animated.View>
  );
}
