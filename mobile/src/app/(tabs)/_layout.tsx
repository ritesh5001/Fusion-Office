import { Tabs } from "expo-router";
import { C } from "@/theme";
import { TabBar } from "@/components/TabBar";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props: any) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.app }, animation: "fade" }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="tools" options={{ title: "Tools" }} />
      <Tabs.Screen name="recent" options={{ title: "Recent" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
