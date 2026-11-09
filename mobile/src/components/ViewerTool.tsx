import { Alert, View } from "react-native";
import { router } from "expo-router";
import { FolderOpen } from "lucide-react-native";
import { C } from "@/theme";
import { useSession } from "@/lib/session";
import { pickDocuments } from "@/lib/files";
import type { ToolDef } from "@/lib/tools";
import { BackHeader, Screen } from "./Screen";
import { PressScale, T, ToolTile } from "./ui";

/** Document viewer: pick any file from the phone and read it in the app (same screen as "Open with"). */
export function ViewerTool({ tool }: { tool: ToolDef }) {
  const { receive } = useSession();
  const choose = async () => {
    try {
      const files = await pickDocuments("*/*", false);
      if (!files.length) return;
      receive(files);
      router.replace("/open");
    } catch (e) {
      Alert.alert("Couldn't open the file", (e as Error).message);
    }
  };
  return (
    <Screen tabs={false}>
      <BackHeader title={tool.name} />
      <View style={{ marginTop: 24, alignItems: "center", paddingHorizontal: 12 }}>
        <ToolTile tool={tool} size={64} />
        <T weight="display" header style={{ marginTop: 16, fontSize: 24, letterSpacing: -0.6, textAlign: "center" }}>Open any document</T>
        <T style={{ marginTop: 8, fontSize: 14.5, color: C.fgMuted, textAlign: "center" }}>
          PDF, Word, Excel, PowerPoint, images and text files from your phone, Drive or any folder. The file stays on this device.
        </T>
        <PressScale onPress={choose} style={{ marginTop: 22, height: 52, paddingHorizontal: 26, borderRadius: 26, backgroundColor: C.accent, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <FolderOpen size={19} color={C.onAccent} />
          <T weight="bold" style={{ color: C.onAccent, fontSize: 15.5 }}>Choose a file</T>
        </PressScale>
        <T style={{ marginTop: 22, fontSize: 13, color: C.fgSubtle, textAlign: "center" }}>
          Tip: in your file manager, WhatsApp or Gmail, tap a file and choose “Open with” or “Share”, then Fusion Office.
        </T>
      </View>
    </Screen>
  );
}
