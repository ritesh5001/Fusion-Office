import { Alert, View } from "react-native";
import { router } from "expo-router";
import { FolderOpen } from "lucide-react-native";
import { C } from "@/theme";
import { useSession } from "@/lib/session";
import { pickDocuments } from "@/lib/files";
import type { ToolDef } from "@/lib/tools";
import { BackHeader, Screen } from "./Screen";
import { PressScale, T, ToolTile } from "./ui";

const WORD = ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword", "application/vnd.oasis.opendocument.text", "application/rtf", "text/rtf"];
const EXCEL = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel", "application/vnd.oasis.opendocument.spreadsheet"];
const PPT = ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/vnd.ms-powerpoint", "application/vnd.oasis.opendocument.presentation"];

/**
 * What each viewer asks the phone's file picker for. Types phones often
 * label as generic files (email, ZIP, EPUB, JSON, HEIC, TIFF, code) use
 * any file, so the file isn't hidden from the list.
 */
const VIEWERS: Record<string, { heading: string; blurb: string; pick: string | string[] }> = {
  "document-viewer": { heading: "Open any document", blurb: "PDF, Word, Excel, PowerPoint, images, emails, ZIP, EPUB, JSON and text files.", pick: "*/*" },
  "pdf-viewer": { heading: "Open a PDF", blurb: "Every page, sharp when you zoom in. Works offline.", pick: "application/pdf" },
  "word-viewer": { heading: "Open a Word document", blurb: ".docx, .doc, .odt and .rtf, laid out on the page.", pick: WORD },
  "excel-viewer": { heading: "Open an Excel file", blurb: "Every sheet of an .xlsx, .xls or .ods, with its number formats.", pick: EXCEL },
  "csv-viewer": { heading: "Open a CSV file", blurb: "A CSV or TSV file shown as a clean table.", pick: ["text/csv", "text/comma-separated-values", "text/tab-separated-values", "text/plain"] },
  "powerpoint-viewer": { heading: "Open a PowerPoint", blurb: "Every slide of a .pptx, .ppt or .odp, with speaker notes.", pick: PPT },
  "image-viewer": { heading: "Open an image", blurb: "JPG, PNG, WEBP, GIF, SVG, HEIC and TIFF.", pick: "image/*" },
  "heic-viewer": { heading: "Open a HEIC photo", blurb: "iPhone HEIC and HEIF photos, decoded on this phone.", pick: "*/*" },
  "tiff-viewer": { heading: "Open a TIFF file", blurb: "Every page of a TIFF scan or fax.", pick: "*/*" },
  "json-viewer": { heading: "Open a JSON file", blurb: "A tree you can fold and search, or formatted text.", pick: "*/*" },
  "xml-viewer": { heading: "Open an XML file", blurb: "XML, GPX, KML and SVG source, neatly indented.", pick: "*/*" },
  "email-viewer": { heading: "Open an email file", blurb: ".eml and Outlook .msg files, with their attachments.", pick: "*/*" },
  "zip-viewer": { heading: "Open a ZIP file", blurb: "See what's inside and open the files in it.", pick: "*/*" },
  "epub-viewer": { heading: "Open an EPUB book", blurb: "Read with a chapter list and larger text.", pick: "*/*" },
  "markdown-viewer": { heading: "Open a Markdown file", blurb: "A .md file with its headings, lists and tables.", pick: "*/*" },
  "text-viewer": { heading: "Open a text file", blurb: "TXT, LOG, subtitle, code and config files.", pick: "*/*" },
};

/** The viewers: pick a file from the phone and read it in the app (same screen as "Open with"). */
export function ViewerTool({ tool }: { tool: ToolDef }) {
  const { receive } = useSession();
  const v = VIEWERS[tool.slug] ?? VIEWERS["document-viewer"];
  const choose = async () => {
    try {
      const files = await pickDocuments(v.pick, false);
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
        <T weight="display" header style={{ marginTop: 16, fontSize: 24, letterSpacing: -0.6, textAlign: "center" }}>{v.heading}</T>
        <T style={{ marginTop: 8, fontSize: 14.5, color: C.fgMuted, textAlign: "center" }}>{v.blurb} The file stays on this device.</T>
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
