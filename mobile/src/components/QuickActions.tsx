import { View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ChevronRight, Files, Image as ImageIcon, Shrink, type LucideIcon } from "lucide-react-native";
import { C } from "@/theme";
import { useReduced } from "@/lib/motion";
import { toolBySlug } from "@/lib/tools";
import { PressScale, T } from "./ui";
import { openTool } from "./DropStage";

/** The four quick actions, as solid colour tiles (same as the website). */
const QUICK: { slug: string; bg: string; fg: string; icon?: LucideIcon; letter?: string }[] = [
  { slug: "merge-pdf", bg: "#e5676a", fg: "#fff", icon: Files },
  { slug: "compress-pdf", bg: "#7a72f0", fg: "#fff", icon: Shrink },
  { slug: "pdf-to-word", bg: "#cdf564", fg: "#14152b", letter: "W" },
  { slug: "resize-image", bg: "#b7a6f7", fg: "#14152b", icon: ImageIcon },
];

export function QuickActions() {
  const reduced = useReduced();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      {QUICK.map((q, i) => {
        const t = toolBySlug(q.slug);
        if (!t) return null;
        return (
          <Animated.View key={q.slug} entering={reduced ? undefined : FadeInDown.delay(80 + i * 50).duration(400)} style={{ width: "48.5%" }}>
            <PressScale onPress={() => openTool(q.slug)} style={{ borderRadius: 20, borderWidth: 1, borderColor: C.line, backgroundColor: "rgba(25,29,38,0.6)", padding: 12, minHeight: 112 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: q.bg, alignItems: "center", justifyContent: "center" }}>
                  {q.icon ? (
                    <q.icon size={26} color={q.fg} strokeWidth={1.9} />
                  ) : (
                    <View style={{ width: 30, height: 30, borderRadius: 7, borderWidth: 2.5, borderColor: q.fg, alignItems: "center", justifyContent: "center" }}>
                      <T weight="display" style={{ fontSize: 15, color: q.fg }}>{q.letter}</T>
                    </View>
                  )}
                </View>
                <ChevronRight size={18} color={C.fgMuted} />
              </View>
              <T weight="semibold" style={{ marginTop: 12, fontSize: 14.5 }}>{t.name}</T>
            </PressScale>
          </Animated.View>
        );
      })}
    </View>
  );
}
