"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useEditor } from "@/lib/editor/store";
import { openRecent } from "@/lib/editor/actions";
import { UploadScreen } from "./UploadScreen";
import { EditorShell } from "./EditorShell";
import { Toaster } from "./Toaster";
import { CloudContext, openCloudDocument, saveToCloud, type CloudInfo } from "./cloud";
import { toast } from "@/lib/editor/events";

/**
 * Client root. Shows the upload screen until a document is open.
 * URL params: ?doc=<localId> reopens a local document, ?cloud=<id> opens a
 * cloud document, &cloudsave=1 resumes "save to cloud" after signing in.
 */
export default function EditorApp({ cloud }: { cloud: CloudInfo }) {
  const hasDoc = useEditor((s) => !!s.doc);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const localId = params.get("doc");
    const cloudId = params.get("cloud");
    const resumeSave = params.get("cloudsave") === "1";
    const clearParams = () => window.history.replaceState(null, "", window.location.pathname);
    (async () => {
      try {
        if (cloudId) await openCloudDocument(cloudId);
        else if (localId) await openRecent(localId);
        if (resumeSave && cloud.user) await saveToCloud(cloud);
      } catch (e) {
        toast((e as Error).message, "error");
      } finally {
        if (cloudId || localId) clearParams();
        setBooting(false);
      }
    })();
  }, [cloud]);

  // Keep the tab title in sync with the document name.
  const name = useEditor((s) => s.doc?.name);
  useEffect(() => {
    document.title = name ? `${name} · Fusion Office` : "PDF Editor · Fusion Office";
  }, [name]);

  return (
    <CloudContext.Provider value={cloud}>
      {booting ? (
        <div className="flex h-dvh items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : hasDoc ? (
        <EditorShell />
      ) : (
        <UploadScreen />
      )}
      <Toaster />
    </CloudContext.Provider>
  );
}
