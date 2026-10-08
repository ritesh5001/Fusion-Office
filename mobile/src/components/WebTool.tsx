import { useEffect, useRef, useState } from "react";
import { Alert, BackHandler, Linking, View } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import type { ShouldStartLoadRequest } from "react-native-webview/lib/WebViewTypes";
import * as Speech from "expo-speech";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ExternalLink } from "lucide-react-native";
import { C } from "@/theme";
import { saveOutput } from "@/lib/files";
import { addRecent } from "@/lib/recents";
import { WEB_URL, type ToolDef } from "@/lib/tools";
import { useOffline } from "@/lib/network";
import { useReduced } from "@/lib/motion";
import { BackHeader } from "./Screen";
import { useFileActions } from "./FileViewer";
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

  // Read aloud: Android's web view has no speech engine (speechSynthesis), so
  // the page's speech goes to the phone's own text-to-speech through the app.
  // Same shape as the browser API, so the website's PDF to Audio works as is.
  if (!("speechSynthesis" in window)) {
    var post = function (m) { window.ReactNativeWebView.postMessage(JSON.stringify(m)); };
    var pending = {}, next = 1, voices = [], listeners = {};
    var fire = function (t) { (listeners[t] || []).forEach(function (f) { try { f({ type: t }); } catch (e) {} }); if (synth["on" + t]) synth["on" + t]({ type: t }); };
    window.SpeechSynthesisUtterance = function (text) { this.text = text || ""; this.rate = 1; this.pitch = 1; this.volume = 1; this.lang = ""; this.voice = null; this.onend = null; this.onerror = null; this.onstart = null; };
    var synth = {
      speaking: false, pending: false, paused: false, onvoiceschanged: null,
      getVoices: function () { return voices.slice(); },
      speak: function (u) {
        var id = next++; pending[id] = u; synth.speaking = true;
        post({ type: "tts-speak", id: id, text: u.text, rate: u.rate, pitch: u.pitch, lang: u.lang || (u.voice && u.voice.lang) || "", voice: u.voice ? u.voice.voiceURI : null });
      },
      cancel: function () {
        var was = pending; pending = {}; synth.speaking = false; post({ type: "tts-cancel" });
        Object.keys(was).forEach(function (k) { var u = was[k]; if (u.onerror) u.onerror({ error: "canceled" }); });
      },
      pause: function () { synth.paused = true; post({ type: "tts-pause" }); },
      resume: function () { synth.paused = false; post({ type: "tts-resume" }); },
      addEventListener: function (t, f) { (listeners[t] = listeners[t] || []).push(f); },
      removeEventListener: function (t, f) { listeners[t] = (listeners[t] || []).filter(function (x) { return x !== f; }); }
    };
    window.speechSynthesis = synth;
    window.__foTts = function (m) {
      if (m.type === "voices") { voices = m.voices; fire("voiceschanged"); return; }
      var u = pending[m.id]; if (!u) return;
      if (m.type === "start") { if (u.onstart) u.onstart({}); return; }
      delete pending[m.id]; synth.speaking = Object.keys(pending).length > 0;
      if (m.type === "end" && u.onend) u.onend({});
      if (m.type === "error" && u.onerror) u.onerror({ error: m.error || "synthesis-failed" });
    };
    post({ type: "tts-voices" });
  }
})(); true;`;

/** The phone's voices, named so the site ranks the better ones (online / enhanced) first. */
async function deviceVoices() {
  const list = await Speech.getAvailableVoicesAsync().catch(() => []);
  return list.map((v) => ({
    voiceURI: v.identifier,
    name: `${v.name || v.identifier}${v.quality === Speech.VoiceQuality.Enhanced ? " · Enhanced" : ""}${/network/i.test(v.identifier) ? " · Online" : ""}`,
    lang: v.language,
    localService: !/network/i.test(v.identifier),
    default: false,
  }));
}

/**
 * Everything a page loads stays inside the app: web pages and the frames
 * inside them (the security check, audio, downloads use blob:/data:/about:).
 * Android can't tell a frame from the page, and the default rule sends any
 * non-https address to the phone's browser, which is what kicked people out.
 * Only links meant for other apps (email, phone, WhatsApp, UPI…) leave.
 */
function stayInApp(req: ShouldStartLoadRequest) {
  if (/^(https?|about|blob|data|javascript):/i.test(req.url)) return true;
  Linking.openURL(req.url).catch(() => {});
  return false;
}

type TtsMessage = { type: "tts-speak"; id: number; text: string; rate?: number; pitch?: number; lang?: string; voice?: string | null } | { type: "tts-cancel" | "tts-pause" | "tts-resume" | "tts-voices" };

export function WebTool({ tool }: { tool: ToolDef }) {
  const insets = useSafeAreaInsets();
  const [progress, setProgress] = useState(0);
  const [loadFailed, setFailed] = useState(false);
  const offline = useOffline();
  const failed = loadFailed || offline;
  const web = useRef<WebView>(null);
  const reduced = useReduced();
  const page = `${WEB_URL}${tool.href ?? `/tools/${tool.slug}`}`;
  const files = useFileActions();
  const toPage = (m: object) => web.current?.injectJavaScript(`window.__foTts && window.__foTts(${JSON.stringify(m)}); true;`);

  // Leaving the tool stops any reading.
  useEffect(() => () => void Speech.stop(), []);

  // Android's back button goes back inside the tool first, then leaves it.
  const canGoBack = useRef(false);
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!canGoBack.current) return false;
      web.current?.goBack();
      return true;
    });
    return () => sub.remove();
  }, []);

  const onTts = async (m: TtsMessage) => {
    if (m.type === "tts-voices") return toPage({ type: "voices", voices: await deviceVoices() });
    if (m.type === "tts-cancel") return void Speech.stop();
    if (m.type === "tts-pause") return void Speech.pause().catch(() => {});
    if (m.type === "tts-resume") return void Speech.resume().catch(() => {});
    if (m.type !== "tts-speak") return;
    Speech.speak(m.text, {
      language: m.lang || undefined,
      voice: m.voice || undefined,
      rate: m.rate ?? 1,
      pitch: m.pitch ?? 1,
      onStart: () => toPage({ type: "start", id: m.id }),
      onDone: () => toPage({ type: "end", id: m.id }),
      onError: (e) => toPage({ type: "error", id: m.id, error: String((e as { message?: string })?.message ?? "synthesis-failed") }),
    });
  };
  // App mode hides the site's chrome; the motion setting follows the app's switch.
  const url = `${page}?app=1&motion=${reduced ? "reduced" : "full"}`;

  const onMessage = async (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as { type: string; name: string; mime: string; data: string };
      if (msg.type.startsWith("tts-")) return onTts(msg as unknown as TtsMessage);
      if (msg.type !== "download" || !msg.data) return;
      const file = saveOutput(msg.name, msg.data, msg.mime, true);
      await addRecent(file, tool.slug, tool.name);
      // Show the result in the app (it has Download and Share), like native tools do.
      files.open(file);
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
          onNavigationStateChange={(n) => (canGoBack.current = n.canGoBack)}
          onShouldStartLoadWithRequest={stayInApp}
          onError={() => setFailed(true)}
          allowsBackForwardNavigationGestures
          allowFileAccess
          // Read aloud plays one clip per sentence, each starting when the last ends (not on a tap).
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          setSupportMultipleWindows={false}
          thirdPartyCookiesEnabled
          domStorageEnabled
          forceDarkOn={false}
          originWhitelist={["*"]}
        />
      )}
      {files.viewer}
    </View>
  );
}
