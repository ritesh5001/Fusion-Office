import { Linking, Switch, View } from "react-native";
import Constants from "expo-constants";
import { ExternalLink, Heart, Server, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react-native";
import { C } from "@/theme";
import { useMotion } from "@/lib/motion";
import { WEB_URL } from "@/lib/tools";
import { Screen } from "@/components/Screen";
import { Eyebrow, PressScale, T } from "@/components/ui";

const PRIVACY: { icon: LucideIcon; tint: string; title: string; text: string }[] = [
  { icon: ShieldCheck, tint: C.accent, title: "On your device", text: "Most tools open, change and save the file right on your phone. Nothing is uploaded." },
  { icon: Server, tint: C.amber, title: "Converted on our server", text: "Word, Excel and PowerPoint to PDF are converted on our server and deleted straight after." },
  { icon: Sparkles, tint: C.brand300, title: "With AI", text: "AI tools send only the document's text to our AI provider. Nothing is stored." },
];

function Row({ children }: { children: React.ReactNode }) {
  return <View style={{ borderRadius: 18, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, padding: 14 }}>{children}</View>;
}

export default function Settings() {
  const { reduced, setReduced } = useMotion();
  return (
    <Screen>
      <T weight="display" style={{ marginTop: 8, fontSize: 28, letterSpacing: -0.9 }}>Settings</T>

      <Eyebrow style={{ marginTop: 24, marginBottom: 8 }}>Motion</Eyebrow>
      <Row>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <T weight="semibold" style={{ fontSize: 15 }}>Reduce motion</T>
            <T style={{ marginTop: 2, fontSize: 12.5, color: C.fgMuted }}>Stops floating icons, glow loops and flourishes. Progress and results still show clearly.</T>
          </View>
          <Switch value={reduced} onValueChange={setReduced} trackColor={{ true: C.accent, false: C.lineStrong }} thumbColor={reduced ? C.onAccent : "#f4f4f5"} accessibilityLabel="Reduce motion" />
        </View>
      </Row>

      <Eyebrow style={{ marginTop: 24, marginBottom: 8 }}>Privacy</Eyebrow>
      <View style={{ gap: 8 }}>
        {PRIVACY.map((p) => (
          <Row key={p.title}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: C.raised, alignItems: "center", justifyContent: "center" }}>
                <p.icon size={18} color={p.tint} />
              </View>
              <View style={{ flex: 1 }}>
                <T weight="semibold" style={{ fontSize: 14.5 }}>{p.title}</T>
                <T style={{ marginTop: 2, fontSize: 12.5, lineHeight: 18, color: C.fgMuted }}>{p.text}</T>
              </View>
            </View>
          </Row>
        ))}
      </View>

      <Eyebrow style={{ marginTop: 24, marginBottom: 8 }}>About</Eyebrow>
      <PressScale onPress={() => Linking.openURL(WEB_URL)}>
        <Row>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <T weight="semibold" style={{ flex: 1, fontSize: 15 }}>Open fusionoffice.online</T>
            <ExternalLink size={17} color={C.fgMuted} />
          </View>
        </Row>
      </PressScale>

      <View style={{ marginTop: 28, alignItems: "center", gap: 10 }}>
        <PressScale onPress={() => Linking.openURL("https://nextgenfusion.in")} style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 99, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)", paddingHorizontal: 16, paddingVertical: 9, shadowColor: C.brand500, shadowOpacity: 0.4, shadowRadius: 14 }}>
          <T style={{ fontSize: 14, color: C.fgMuted }}>Made with</T>
          <Heart size={15} color="#ff5a6e" fill="#ff5a6e" />
          <T style={{ fontSize: 14, color: C.fgMuted }}>by</T>
          <T weight="bold" style={{ fontSize: 14, color: C.accent }}>NextGen Fusion</T>
        </PressScale>
        <T style={{ fontSize: 12, color: C.fgSubtle }}>Fusion Office {Constants.expoConfig?.version ?? ""} · No sign-up. No watermarks.</T>
      </View>
    </Screen>
  );
}
