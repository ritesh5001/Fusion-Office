import { useState } from "react";
import { View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInLeft } from "react-native-reanimated";
import { router } from "expo-router";
import { Search } from "lucide-react-native";
import Svg, { Path } from "react-native-svg";
import { C, F } from "@/theme";
import { useReduced } from "@/lib/motion";
import { useColumns } from "@/lib/layout";
import { toolBySlug, type ToolDef, TOOL_COUNT } from "@/lib/tools";
import { BrandHeader, Screen } from "@/components/Screen";
import { DropStage, openTool } from "@/components/DropStage";
import { QuickActions } from "@/components/QuickActions";
import { ToolCard } from "@/components/ToolCard";
import { ToolPreview } from "@/components/ToolPreview";
import { GradientText, PressScale, T } from "@/components/ui";
import { IOS } from "@/lib/ease";

const POPULAR = ["edit-pdf", "split-pdf", "ocr-pdf", "jpg-to-pdf", "sign-pdf", "word-to-pdf", "protect-pdf", "pdf-to-jpg"];

export default function Home() {
  const reduced = useReduced();
  const [preview, setPreview] = useState<ToolDef | null>(null);
  const enter = (delay: number, anim: typeof FadeInDown | typeof FadeIn | typeof FadeInLeft = FadeInDown) => (reduced ? undefined : anim.delay(delay).duration(380));
  const { columns, gap, cardWidth } = useColumns();
  // A full last row on every width: 6 popular tools on phones, 8 on 4-column tablets.
  const popular = POPULAR.map(toolBySlug).filter((t): t is ToolDef => !!t).slice(0, columns === 4 ? 8 : 6);

  return (
    <Screen>
      <Animated.View entering={enter(0, FadeIn)}>
        <BrandHeader
          right={
            <PressScale onPress={() => router.navigate({ pathname: "/tools", params: { focus: "1" } })} accessibilityLabel="Search tools" style={{ width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: C.raised, borderWidth: 1, borderColor: C.line }}>
              <Search size={19} color={C.fg} />
            </PressScale>
          }
        />
      </Animated.View>

      {/* Hero: compact on phones so the drop card and quick actions show early. */}
      <View style={{ marginTop: 14 }}>
        <Animated.View entering={enter(60)}>
          <T weight="display" header style={{ fontSize: 32, lineHeight: 36, letterSpacing: -1.1 }}>Your private file</T>
        </Animated.View>
        <Animated.View entering={enter(170, FadeInLeft)}>
          <GradientText colors={[C.brand300, C.accent]} style={{ fontFamily: F.display, fontSize: 32, lineHeight: 38, letterSpacing: -1.1 }}>workspace.</GradientText>
        </Animated.View>
        <Animated.View entering={enter(260)} style={{ marginTop: 10, flexDirection: "row" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 99, borderWidth: 1, borderColor: "rgba(205,245,100,0.3)", backgroundColor: "rgba(205,245,100,0.08)", paddingHorizontal: 10, paddingVertical: 5 }}>
            <Svg width={13} height={13} viewBox="0 0 24 24"><Path d="M12 2 4 5v6c0 5.1 3.4 9.4 8 11 4.6-1.6 8-5.9 8-11V5z" fill={C.accent} /><Path d="m8.4 12.2 2.5 2.5 4.7-5" stroke={C.ink} strokeWidth={2.6} fill="none" strokeLinecap="round" /></Svg>
            <T weight="semibold" style={{ fontSize: 12.5, color: C.accent }}>Stays on this device</T>
          </View>
        </Animated.View>
      </View>

      <Animated.View entering={reduced ? undefined : FadeInDown.delay(300).duration(420).easing(IOS)} style={{ marginTop: 22 }}>
        <DropStage />
      </Animated.View>

      <Animated.View entering={enter(560)} style={{ marginTop: 32 }}>
        <T weight="display" header style={{ fontSize: 20, letterSpacing: -0.4, marginBottom: 12 }}>Quick actions</T>
        <QuickActions />
      </Animated.View>

      <View style={{ marginTop: 32 }}>
        <T weight="display" header style={{ fontSize: 22, letterSpacing: -0.6 }}>Choose your next move</T>
        <T style={{ marginTop: 4, fontSize: 13.5, color: C.fgMuted }}>{TOOL_COUNT} tools for PDFs, Office files and images. Long-press a tool for a preview.</T>
        <View style={{ marginTop: 14, flexDirection: "row", flexWrap: "wrap", gap }}>
          {popular.map((t, i) => (
            <ToolCard key={t.slug} tool={t} index={i} width={cardWidth} onPress={() => openTool(t.slug)} onLongPress={() => setPreview(t)} />
          ))}
        </View>
        <PressScale onPress={() => router.navigate("/tools")} style={{ marginTop: 14, height: 50, borderRadius: 16, borderWidth: 1, borderColor: C.lineStrong, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" }}>
          <T weight="semibold" style={{ fontSize: 15 }}>View all {TOOL_COUNT} tools</T>
        </PressScale>
      </View>

      <ToolPreview tool={preview} onClose={() => setPreview(null)} />
    </Screen>
  );
}
