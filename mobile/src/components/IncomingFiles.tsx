import { useEffect } from "react";
import { Platform } from "react-native";
import { router } from "expo-router";
import { useSession } from "@/lib/session";
import { toPicked } from "@/lib/files";
import { onIncoming, takeIncoming } from "../../modules/fo-downloads";

/**
 * Files opened with Fusion Office from a file manager, WhatsApp, Gmail, Drive…
 * ("Open with" or "Share"). Android hands them over at launch, or while the
 * app is open; they are copied into the app's cache and shown on /open.
 */
export function IncomingFiles() {
  const { receive } = useSession();
  useEffect(() => {
    if (Platform.OS !== "android") return;
    let live = true;
    const check = () =>
      takeIncoming()
        .then((files) => {
          if (!live || !files.length) return;
          // The guessed type is better than "application/octet-stream" from some apps.
          receive(files.map((f) => toPicked(f.uri, f.name, f.size, f.mimeType === "application/octet-stream" ? null : f.mimeType)));
          router.push("/open");
        })
        .catch(() => {});
    check();
    const sub = onIncoming(check);
    return () => {
      live = false;
      sub.remove();
    };
  }, [receive]);
  return null;
}
