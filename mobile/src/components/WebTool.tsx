import { useRef, useState } from "react";
import { Alert, Linking, View } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ExternalLink } from "lucide-react-native";
import { C } from "@/theme";
import { saveOutput, shareFile } from "@/lib/files";
import { addRecent } from "@/lib/recents";
import { WEB_URL, type ToolDef } from "@/lib/tools";
import { useOffline } from "@/lib/network";
import { useReduced } from "@/lib/motion";
import { BackHeader } from "./Screen";
import { PressScale, T } from "./ui";

/**
 * Tools that aren't native yet open the website's version inside the app.
 * The site's own header and footer are hidden so it reads as part of the
 * app, and files the tool "downloads" (blob links, which in-app browsers
 * ignore) are passed to the app: saved to Recent and offered in the share sheet.
 */
const BRIDGE = `(function () {
  if (window.__foBridge) return; window.__foBridge = true;
  function send(blob, name) {
    var r = new FileReader();
    r.onload = function () {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: "download", name: name || "download", mime: blob.type || "application/octet-stream", data: String(r.result).split(",")[1] || "" }));
    };
    r.readAsDataURL(blob);
  }
  function grab(href, name) { fetch(href).then(function (r) { return r.blob(); }).then(function (b) { send(b, name); }); }
  var click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    var h = this.href || "";
    if (this.hasAttribute("download") && /^(blob|data):/.test(h)) return grab(h, this.getAttribute("download"));
    return click.apply(this, arguments);
  };
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest && e.target.closest("a[download]");
    if (a && /^(blob|data):/.test(a.href)) { e.preventDefault(); grab(a.href, a.getAttribute("download")); }
  }, true);
  // The site hides its own chrome in app mode (?app=1). This is a fallback for older
  // deploys; it targets the site footer only (not the editors' status bars).
  var css = "header[class*='sticky'], footer.bg-app, aside[aria-label='Tool categories'], nav[aria-label='Breadcrumb'] { display: none !important; } main#main { padding-top: 8px !important; }";
  function style() { if (!document.head) return setTimeout(style, 20); var s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); }
  style();
})(); true;`;

export function WebTool({ tool }: { tool: ToolDef }) {
  const insets = useSafeAreaInsets();
  const [progress, setProgress] = useState(0);
  const [loadFailed, setFailed] = useState(false);
  const offline = useOffline();
  const failed = loadFailed || offline;
  const web = useRef<WebView>(null);
  const reduced = useReduced();
  const page = `${WEB_URL}${tool.href ?? `/tools/${tool.slug}`}`;
  // App mode hides the site's chrome; the motion setting follows the app's switch.
  const url = `${page}?app=1&motion=${reduced ? "reduced" : "full"}`;

  const onMessage = async (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as { type: string; name: string; mime: string; data: string };
      if (msg.type !== "download" || !msg.data) return;
      const file = saveOutput(msg.name, msg.data, msg.mime, true);
      await addRecent(file, tool.slug, tool.name);
      await shareFile(file);
    } catch (err) {
      Alert.alert("Couldn't save the file", (err as Error).message);
    }
  };

  const bar = useAnimatedStyle(() => ({ width: `${progress * 100}%`, opacity: withTiming(progress < 1 ? 1 : 0, { duration: 300 }) }));

  return (
    <View style={{ flex: 1, backgroundColor: C.app, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <BackHeader
          title={tool.name}
          right={
            <PressScale onPress={() => Linking.openURL(page)} accessibilityLabel="Open in browser" style={{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: C.raised, borderWidth: 1, borderColor: C.line }}>
              <ExternalLink size={18} color={C.fg} />
            </PressScale>
          }
        />
      </View>
      <View style={{ height: 2, backgroundColor: C.line }}>
        <Animated.View style={[{ height: 2, backgroundColor: C.accent }, bar]} />
      </View>
      {failed ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <T weight="semibold" style={{ fontSize: 16 }}>No connection</T>
          <T style={{ marginTop: 6, fontSize: 14, color: C.fgMuted, textAlign: "center" }}>This tool loads from fusionoffice.online. Check your connection and try again.</T>
          <PressScale onPress={() => (setFailed(false), web.current?.reload())} style={{ marginTop: 16, height: 44, paddingHorizontal: 20, borderRadius: 22, backgroundColor: C.accent, justifyContent: "center" }}>
            <T weight="bold" style={{ color: C.onAccent }}>Try again</T>
          </PressScale>
        </View>
      ) : (
        <WebView
          ref={web}
          source={{ uri: url }}
          style={{ flex: 1, backgroundColor: C.app }}
          containerStyle={{ backgroundColor: C.app }}
          injectedJavaScriptBeforeContentLoaded={BRIDGE}
          injectedJavaScript={BRIDGE}
          onMessage={onMessage}
          onLoadProgress={(e) => setProgress(e.nativeEvent.progress)}
          onError={() => setFailed(true)}
          allowsBackForwardNavigationGestures
          allowFileAccess
          mediaPlaybackRequiresUserAction
          setSupportMultipleWindows={false}
          decelerationRate="normal"
          forceDarkOn={false}
          originWhitelist={["https://*"]}
        />
      )}
    </View>
  );
}
