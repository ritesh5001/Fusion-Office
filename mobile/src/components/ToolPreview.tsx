import { View } from "react-native";
import { C } from "@/theme";
import { NATIVE } from "@/lib/native";
import { CATEGORY_META, type ToolDef } from "@/lib/tools";
import { Sheet } from "./Sheet";
import { PressScale, T, ToolTile } from "./ui";
import { openTool } from "./DropStage";

/** Long-press preview: what a tool does and where it runs, before opening it. */
export function ToolPreview({ tool, onClose }: { tool: ToolDef | null; onClose: () => void }) {
  const t = tool;
  const where = !t ? "" : t.runs === "ai" ? "Sends the document's text to our AI provider. Nothing is stored." : t.runs === "server" ? "Converted on the Fusion Office server and deleted straight after." : NATIVE[t.slug] ? "Runs natively on this device. Nothing is uploaded." : "Runs privately in the app's browser. Nothing is uploaded.";
  return (
    <Sheet open={!!t} onClose={onClose}>
      {t && (
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <ToolTile tool={t} size={56} />
            <View style={{ flex: 1 }}>
              <T weight="display" style={{ fontSize: 22, letterSpacing: -0.5 }}>{t.name}</T>
              <T weight="medium" style={{ fontSize: 12.5, color: CATEGORY_META[t.category].color }}>{CATEGORY_META[t.category].title}</T>
            </View>
          </View>
          <T style={{ marginTop: 14, fontSize: 15, lineHeight: 22, color: C.fg }}>{t.description}</T>
          <View style={{ marginTop: 12, borderRadius: 14, backgroundColor: C.raised, padding: 12 }}>
            <T style={{ fontSize: 13, lineHeight: 19, color: C.fgMuted }}>{where}</T>
          </View>
          <PressScale onPress={() => (onClose(), openTool(t.slug))} style={{ marginTop: 16, height: 52, borderRadius: 26, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" }}>
            <T weight="bold" style={{ fontSize: 15.5, color: C.onAccent }}>Open {t.name}</T>
          </PressScale>
        </View>
      )}
    </Sheet>
  );
}
