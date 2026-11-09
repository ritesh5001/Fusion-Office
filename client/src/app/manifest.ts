import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo/site";

/** Installed as an app (Chrome, Edge), the site shows up in the system's "Open with" menu for these files. */
const FILE_HANDLERS = [
  {
    action: "/viewer",
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"],
      "application/vnd.oasis.opendocument.text": [".odt"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.oasis.opendocument.spreadsheet": [".ods"],
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
      "application/vnd.ms-powerpoint": [".ppt"],
      "application/vnd.oasis.opendocument.presentation": [".odp"],
      "text/markdown": [".md", ".markdown"],
      "text/plain": [".txt"],
    },
  },
];

export default function manifest(): MetadataRoute.Manifest {
  return {
    // Not in Next's manifest type yet; browsers read it from the JSON.
    ...({ file_handlers: FILE_HANDLERS } as object),
    name: `${SITE_NAME} – Free PDF, Office & Image Tools`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#0a0c11",
    theme_color: "#0a0c11",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/logo.png", type: "image/png", sizes: "512x512" },
    ],
  };
}
