import { useState } from "react";
import { Image, RefreshControl, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Heart, RefreshCw, Users } from "lucide-react-native";
import { C, F } from "@/theme";
import { useReduced } from "@/lib/motion";
import { useTesters, type Tester } from "@/lib/testers";
import { BackHeader, Screen } from "@/components/Screen";
import { GradientText, PressScale, T } from "@/components/ui";

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

/** Round photo with a lime ring; initials on a gradient if the photo can't load. */
function Avatar({ tester, size }: { tester: Tester; size: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <View style={{ width: size + 6, height: size + 6, borderRadius: (size + 6) / 2, padding: 3, backgroundColor: "rgba(205,245,100,0.35)" }}>
      {failed ? (
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.brand500, alignItems: "center", justifyContent: "center" }}>
          <T weight="bold" style={{ fontSize: size * 0.32, color: C.onAccent }}>{initials(tester.name)}</T>
        </View>
      ) : (
        <Image
          source={{ uri: tester.photo }}
          onError={() => setFailed(true)}
          accessibilityIgnoresInvertColors
          style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.raised }}
        />
      )}
    </View>
  );
}

function Card({ tester, index }: { tester: Tester; index: number }) {
  const reduced = useReduced();
  return (
    <Animated.View
      entering={reduced ? undefined : FadeInDown.delay(Math.min(index, 8) * 45).duration(380)}
      accessible
      accessibilityLabel={`${tester.name}, @${tester.username}`}
      style={{ width: "48.5%", alignItems: "center", borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, paddingVertical: 18, paddingHorizontal: 10 }}
    >
      <Avatar tester={tester} size={76} />
      <T weight="semibold" numberOfLines={1} style={{ marginTop: 12, fontSize: 15, maxWidth: "100%" }}>{tester.name}</T>
      <T numberOfLines={1} style={{ marginTop: 2, fontSize: 12.5, color: C.brand300, maxWidth: "100%" }}>@{tester.username}</T>
    </Animated.View>
  );
}

function Placeholder() {
  return (
    <View style={{ width: "48.5%", alignItems: "center", borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, paddingVertical: 18, opacity: 0.55 }}>
      <View style={{ width: 82, height: 82, borderRadius: 41, backgroundColor: C.raised }} />
      <View style={{ marginTop: 14, width: 90, height: 12, borderRadius: 6, backgroundColor: C.raised }} />
      <View style={{ marginTop: 8, width: 64, height: 10, borderRadius: 5, backgroundColor: C.raised }} />
    </View>
  );
}

/** Special thanks: the early testers who tried the app before launch. */
export default function Thanks() {
  const { testers, loading, error, refresh } = useTesters();
  const reduced = useReduced();

  return (
    <Screen tabs={false} refreshControl={<RefreshControl refreshing={loading && !!testers} onRefresh={refresh} tintColor={C.accent} colors={[C.accent]} progressBackgroundColor={C.raised} />}>
      <BackHeader />

      <Animated.View entering={reduced ? undefined : FadeInDown.duration(420)} style={{ marginTop: 6, alignItems: "center" }}>
        <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: C.accent, alignItems: "center", justifyContent: "center", shadowColor: C.accent, shadowOpacity: 0.5, shadowRadius: 20, elevation: 8 }}>
          <Heart size={26} color={C.onAccent} fill={C.onAccent} />
        </View>
        <GradientText header colors={[C.brand300, C.accent]} style={{ marginTop: 16, fontFamily: F.display, fontSize: 30, letterSpacing: -1 }}>
          Special thanks
        </GradientText>
        <T style={{ marginTop: 8, fontSize: 14.5, lineHeight: 21, color: C.fgMuted, textAlign: "center", paddingHorizontal: 12 }}>
          Fusion Office was shaped by these early testers. Every bug they found and idea they shared is somewhere in this app. Thank you.
        </T>
        {!!testers?.length && (
          <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 99, borderWidth: 1, borderColor: C.line, backgroundColor: C.raised, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Users size={14} color={C.fgMuted} />
            <T style={{ fontSize: 12.5, color: C.fgMuted }}>
              {testers.length} early {testers.length === 1 ? "tester" : "testers"}
            </T>
          </View>
        )}
      </Animated.View>

      <View style={{ marginTop: 22, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 }}>
        {testers ? testers.map((t, i) => <Card key={t.id} tester={t} index={i} />) : !error && Array.from({ length: 4 }, (_, i) => <Placeholder key={i} />)}
      </View>

      {testers?.length === 0 && (
        <T style={{ marginTop: 8, fontSize: 14, color: C.fgMuted, textAlign: "center" }}>Our early testers will appear here soon.</T>
      )}

      {error && !testers && (
        <View style={{ marginTop: 8, alignItems: "center", gap: 12 }}>
          <T style={{ fontSize: 14, color: C.fgMuted, textAlign: "center" }}>Couldn’t load the list right now. Check your connection and try again.</T>
          <PressScale onPress={refresh} style={{ flexDirection: "row", alignItems: "center", gap: 8, height: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: C.raised, borderWidth: 1, borderColor: C.lineStrong }}>
            <RefreshCw size={16} color={C.fg} />
            <T weight="semibold" style={{ fontSize: 14 }}>Try again</T>
          </PressScale>
        </View>
      )}
    </Screen>
  );
}
