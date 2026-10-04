import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { C } from "@/theme";
import { NATIVE } from "@/lib/native";
import { toolBySlug } from "@/lib/tools";
import { ToolRunnerScreen } from "@/components/ToolRunnerScreen";
import { WebTool } from "@/components/WebTool";
import { BackHeader, Screen } from "@/components/Screen";
import { T } from "@/components/ui";

/** A tool: native when the app has it, otherwise the website's version inside the app. */
export default function ToolScreen() {
  const { slug, staged } = useLocalSearchParams<{ slug: string; staged?: string }>();
  const tool = toolBySlug(slug);
  if (!tool)
    return (
      <Screen tabs={false}>
        <BackHeader />
        <View style={{ marginTop: 40, alignItems: "center" }}>
          <T weight="semibold" style={{ fontSize: 17 }}>Tool not found</T>
          <T style={{ marginTop: 6, color: C.fgMuted }}>It may have moved. Try the Tools tab.</T>
        </View>
      </Screen>
    );
  const native = NATIVE[tool.slug];
  return native ? <ToolRunnerScreen tool={tool} native={native} useStaged={staged === "1"} /> : <WebTool tool={tool} />;
}
