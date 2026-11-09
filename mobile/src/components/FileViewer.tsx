import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, Image, Modal, PixelRatio, Platform, View } from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Download, Share2, X } from "lucide-react-native";
import { C } from "@/theme";
import { formatBytes, openWithApp, saveToDevice, shareFile, shownBySite, viewableInApp, type SavedFile } from "@/lib/files";
import { WEB_URL } from "@/lib/tools";
import { useOffline } from "@/lib/network";
import { File } from "expo-file-system";
import { PressScale, T } from "./ui";
import { pdfPages, renderPdfPage } from "../../modules/fo-downloads";

/**
 * Opening a result: images (and PDFs/text on iOS) show in a full-screen viewer
 * inside the app; anything else opens in the phone's own app for that type.
 */
export function useFileActions() {
  const [viewing, setViewing] = useState<SavedFile | null>(null);

  const open = (f: SavedFile) => {
    if (viewableInApp(f)) return setViewing(f);
    openWithApp(f).catch((e: Error) => Alert.alert("Couldn't open the file", e.message));
  };
  const download = async (f: SavedFile) => {
    try {
      const where = await saveToDevice(f);
      if (where) Alert.alert("Downloaded", `Saved to ${where}.`);
    } catch (e) {
      Alert.alert("Couldn't download", (e as Error).message);
    }
  };
  const share = (f: SavedFile) => shareFile(f).catch((e: Error) => Alert.alert("Couldn't share", e.message));

  // A PDF Android can't draw (password-protected, damaged) goes to another app instead.
  const fallback = (f: SavedFile) => {
    setViewing(null);
    openWithApp(f).catch((e: Error) => Alert.alert("Couldn't open the file", e.message));
  };
  const viewer = <FileViewer file={viewing} onClose={() => setViewing(null)} onDownload={download} onShare={share} onFail={fallback} />;
  return { open, download, share, viewer };
}

function FileViewer({ file, onClose, onDownload, onShare, onFail }: { file: SavedFile | null; onClose: () => void; onDownload: (f: SavedFile) => void; onShare: (f: SavedFile) => void; onFail: (f: SavedFile) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!file} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      {file && (
        <View style={{ flex: 1, backgroundColor: "#05060a", paddingTop: insets.top, paddingBottom: insets.bottom }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
            <PressScale onPress={onClose} accessibilityLabel="Close" style={{ width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: C.raised }}>
              <X size={20} color={C.fg} />
            </PressScale>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T weight="semibold" numberOfLines={1} style={{ fontSize: 15, color: C.fg }}>{file.name}</T>
              <T style={{ fontSize: 12, color: C.fgSubtle }}>{formatBytes(file.size)}</T>
            </View>
            <PressScale onPress={() => onDownload(file)} accessibilityLabel={`Download ${file.name}`} style={{ width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: C.raised }}>
              <Download size={19} color={C.fg} />
            </PressScale>
            <PressScale onPress={() => onShare(file)} accessibilityLabel={`Share ${file.name}`} style={{ width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: C.accent }}>
              <Share2 size={19} color={C.onAccent} />
            </PressScale>
          </View>
          {shownBySite(file) ? (
            <SiteDoc file={file} onFail={() => onFail(file)} />
          ) : file.mimeType.startsWith("image/") ? (
            <Image source={{ uri: file.uri }} resizeMode="contain" style={{ flex: 1 }} accessibilityLabel={file.name} />
          ) : file.mimeType === "application/pdf" && Platform.OS === "android" ? (
            <AndroidPdf uri={file.uri} onFail={() => onFail(file)} />
          ) : (
            <WebView source={{ uri: file.uri }} originWhitelist={["*"]} allowFileAccess allowingReadAccessToURL={file.uri} style={{ flex: 1, backgroundColor: "#05060a" }} />
          )}
        </View>
      )}
    </Modal>
  );
}

/** Files bigger than this aren't handed to the web viewer (the bridge copies the whole file as text). */
const SITE_MAX_BYTES = 30 * 1024 * 1024;

/**
 * Word, Excel, PowerPoint, CSV and Markdown: the website's document viewer in
 * a web view, in app mode (no site header). The file's bytes are handed to the
 * page directly, so it isn't uploaded. Needs a connection to load the viewer.
 */
function SiteDoc({ file, onFail }: { file: SavedFile; onFail: () => void }) {
  const web = useRef<WebView>(null);
  const offline = useOffline();
  const [ready, setReady] = useState(false);
  const sent = useRef(false);
  const tooBig = file.size > SITE_MAX_BYTES;

  const send = () => {
    if (sent.current) return;
    sent.current = true;
    (async () => {
      try {
        const b64 = await new File(file.uri).base64();
        const args = [file.name, file.mimeType, b64].map((a) => JSON.stringify(a)).join(",");
        web.current?.injectJavaScript(`(function go(n){ if (window.__foViewerOpen) window.__foViewerOpen(${args}); else if (n < 200) setTimeout(function(){ go(n + 1); }, 100); })(0); true;`);
      } catch {
        onFail();
      }
      setReady(true);
    })();
  };

  if (offline || tooBig)
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, gap: 14 }}>
        <T weight="semibold" style={{ fontSize: 16, textAlign: "center" }}>{tooBig ? "This file is too large to show in the app" : "You're offline"}</T>
        <T style={{ fontSize: 14, color: C.fgMuted, textAlign: "center" }}>
          {tooBig ? "Open it in another app on your phone instead." : "Word, Excel and PowerPoint files need a connection to show here. PDFs and images open offline."}
        </T>
        <PressScale onPress={onFail} style={{ height: 46, paddingHorizontal: 20, borderRadius: 23, backgroundColor: C.accent, justifyContent: "center" }}>
          <T weight="bold" style={{ color: C.onAccent, fontSize: 14.5 }}>Open in another app</T>
        </PressScale>
      </View>
    );
  return (
    <View style={{ flex: 1 }}>
      <WebView
        ref={web}
        source={{ uri: `${WEB_URL}/viewer?app=1` }}
        originWhitelist={["https://*"]}
        onLoadEnd={send}
        onError={onFail}
        setBuiltInZoomControls
        setDisplayZoomControls={false}
        style={{ flex: 1, backgroundColor: "#0a0c11" }}
      />
      {!ready && (
        <View pointerEvents="none" style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", backgroundColor: "#05060a" }}>
          <ActivityIndicator color={C.fgMuted} />
        </View>
      )}
    </View>
  );
}

/**
 * Android's web view can't show PDFs, so the app draws each page itself
 * (Android's PDF renderer, offline) and shows them in a web view, which gives
 * smooth scrolling and pinch-to-zoom. Pages fill in one by one, first page first.
 */
function AndroidPdf({ uri, onFail }: { uri: string; onFail: () => void }) {
  const web = useRef<WebView>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const fail = useRef(onFail);
  useEffect(() => {
    fail.current = onFail;
  }, [onFail]);

  useEffect(() => {
    let live = true;
    pdfPages(uri)
      .then((sizes) => {
        if (!live) return;
        setCount(sizes.length);
        setHtml(pagesHtml(sizes));
      })
      .catch(() => live && fail.current());
    return () => {
      live = false;
    };
  }, [uri]);

  // Once the page skeleton is up, draw pages in order. Wide enough to stay sharp when zoomed in.
  useEffect(() => {
    if (!loaded || !count) return;
    let live = true;
    const width = Math.min(2400, Math.round(Dimensions.get("window").width * PixelRatio.get() * 1.5));
    (async () => {
      for (let i = 0; i < count && live; i++) {
        try {
          const src = await renderPdfPage(uri, i, width);
          if (live) web.current?.injectJavaScript(`window.show(${i}, ${JSON.stringify(src)}); true;`);
        } catch {
          if (i === 0 && live) return fail.current();
        }
      }
    })();
    return () => {
      live = false;
    };
  }, [loaded, count, uri]);

  if (!html) return <View style={{ flex: 1 }} />;
  return (
    <WebView
      ref={web}
      source={{ html, baseUrl: "file:///" }}
      originWhitelist={["*"]}
      allowFileAccess
      allowFileAccessFromFileURLs
      setBuiltInZoomControls
      setDisplayZoomControls={false}
      onLoadEnd={() => setLoaded(true)}
      style={{ flex: 1, backgroundColor: "#05060a" }}
    />
  );
}

function pagesHtml(sizes: [number, number][]) {
  const pages = sizes
    .map(([w, h], i) => `<div class="p" style="aspect-ratio:${w}/${h}"><img id="i${i}" alt="Page ${i + 1}"></div><div class="n">${i + 1} / ${sizes.length}</div>`)
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=5,user-scalable=yes">
<style>html,body{margin:0;background:#05060a}body{padding:12px 10px 28px}.p{position:relative;width:100%;margin:0 auto;background:#fff;border-radius:3px;overflow:hidden;box-shadow:0 8px 24px -10px rgba(0,0,0,.8)}
.p::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,#f2f2f5 30%,#e6e6ec 50%,#f2f2f5 70%);background-size:300% 100%;animation:s 1.4s linear infinite}
.p.on::after{opacity:0;transition:opacity .25s;animation:none}img{display:block;width:100%;height:100%}.n{margin:8px 0 14px;text-align:center;font:500 11px system-ui,sans-serif;color:#7d8497}
@keyframes s{from{background-position:100% 0}to{background-position:-200% 0}}</style></head><body>${pages}
<script>window.show=function(i,src){var im=document.getElementById("i"+i);if(!im)return;im.onload=function(){im.parentNode.classList.add("on")};im.src=src;};</script></body></html>`;
}
