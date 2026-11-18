/**
 * The dedicated viewers (PDF viewer, Excel viewer, JSON viewer…). They all
 * open the same full-screen viewer at /viewer?v=<slug>; the preset only
 * changes its start screen: heading, file picker filter and what it shows.
 * Any file the viewer understands still opens, whichever preset is active.
 */
export interface ViewerPreset {
  /** Start-screen heading. */
  heading: string;
  /** One line under it. */
  blurb: string;
  /** File picker filter. */
  accept: string;
  /** Drop area label. */
  label: string;
  /** What this viewer shows, in a few short points. */
  points: string[];
}

export const PDF_ACCEPT = "application/pdf,.pdf";
export const WORD_ACCEPT = ".docx,.doc,.odt,.rtf";
export const EXCEL_ACCEPT = ".xlsx,.xlsm,.xls,.ods";
export const CSV_ACCEPT = ".csv,.tsv,text/csv";
export const PPT_ACCEPT = ".pptx,.ppt,.odp";
export const IMAGE_ACCEPT = "image/*,.heic,.heif,.avif,.tif,.tiff,.svg";
export const HEIC_ACCEPT = ".heic,.heif,image/heic,image/heif";
export const TIFF_ACCEPT = ".tif,.tiff,image/tiff";
export const JSON_ACCEPT = ".json,.geojson,application/json";
export const XML_ACCEPT = ".xml,.svg,.plist,.gpx,.kml,application/xml,text/xml";
export const EMAIL_ACCEPT = ".eml,.msg,message/rfc822";
export const ZIP_ACCEPT = ".zip,application/zip";
export const EPUB_ACCEPT = ".epub,application/epub+zip";
export const MARKDOWN_ACCEPT = ".md,.markdown,text/markdown";
export const TEXT_ACCEPT = ".txt,.log,.csv,.json,.xml,.yaml,.yml,.ini,.toml,.conf,.env,.html,.htm,.css,.js,.ts,.sql,.py,.java,.kt,.c,.cpp,.h,.cs,.go,.rs,.php,.rb,.sh,.srt,.vtt,text/plain";

export const VIEWER_PRESETS: Record<string, ViewerPreset> = {
  "pdf-viewer": {
    heading: "Open a PDF",
    blurb: "Read any PDF in your browser: every page, sharp at any zoom. Nothing to install, and the file stays on your device.",
    accept: PDF_ACCEPT,
    label: "Choose a PDF to view",
    points: ["Every page, with zoom in and out.", "Password-protected PDFs open after you type the password.", "Opens large PDFs page by page, so it stays quick.", "Edit, sign or compress it from the viewer."],
  },
  "word-viewer": {
    heading: "Open a Word document",
    blurb: "Read .docx, .doc, .odt and .rtf files without Word. Text, headings, lists, tables and pictures, laid out on the page.",
    accept: WORD_ACCEPT,
    label: "Choose a Word document",
    points: ["Headings, fonts, lists, tables and images.", "Page size and margins as in the file.", "Old .doc files are converted to open.", "Open it in the Word editor to make changes."],
  },
  "excel-viewer": {
    heading: "Open an Excel file",
    blurb: "See every sheet of an .xlsx, .xls or .ods spreadsheet, with number formats, colours and merged cells. No Excel needed.",
    accept: EXCEL_ACCEPT,
    label: "Choose a spreadsheet",
    points: ["Every sheet, with tabs to switch.", "Dates, currency and number formats shown as in Excel.", "Bold, colours, borders and merged cells.", "Open it in the Excel editor to change it."],
  },
  "csv-viewer": {
    heading: "Open a CSV file",
    blurb: "See a CSV or TSV file as a proper table with columns, instead of a wall of commas. Large files open in seconds.",
    accept: CSV_ACCEPT,
    label: "Choose a CSV file",
    points: ["Columns lined up with headers.", "Quoted values and commas inside cells handled.", "Tab-separated (TSV) files too.", "Open it in the Excel editor to sort, filter or total."],
  },
  "powerpoint-viewer": {
    heading: "Open a PowerPoint",
    blurb: "Flip through every slide of a .pptx, .ppt or .odp presentation, with speaker notes. No PowerPoint needed.",
    accept: PPT_ACCEPT,
    label: "Choose a presentation",
    points: ["Every slide, in order.", "Speaker notes under each slide.", "Text, shapes, pictures and tables.", "Open it in the PowerPoint editor to change it."],
  },
  "image-viewer": {
    heading: "Open an image",
    blurb: "View JPG, PNG, WEBP, GIF, SVG, AVIF, HEIC and TIFF images, at full size or fitted to the screen.",
    accept: IMAGE_ACCEPT,
    label: "Choose an image",
    points: ["Fit to screen, or click for actual size.", "iPhone HEIC photos and TIFF scans too.", "Shows the size in pixels.", "Resize, crop or compress it from the viewer."],
  },
  "heic-viewer": {
    heading: "Open a HEIC photo",
    blurb: "View iPhone HEIC and HEIF photos on Windows, Android or any browser. The photo is decoded on your device.",
    accept: HEIC_ACCEPT,
    label: "Choose a HEIC photo",
    points: ["Works in browsers that can't show HEIC by themselves.", "Decoded on your device: the photo isn't uploaded.", "Convert it to JPG in one click from the viewer."],
  },
  "tiff-viewer": {
    heading: "Open a TIFF file",
    blurb: "View TIFF and TIF images, including multi-page scans and faxes, page by page in your browser.",
    accept: TIFF_ACCEPT,
    label: "Choose a TIFF file",
    points: ["Every page of a multi-page TIFF.", "Scanner, fax and print TIFFs.", "Decoded on your device.", "Convert it to PDF or JPG from the viewer."],
  },
  "json-viewer": {
    heading: "Open a JSON file",
    blurb: "Explore JSON as a tree you can fold and search, or as neatly formatted text. Minified files are formatted for you.",
    accept: JSON_ACCEPT,
    label: "Choose a JSON file",
    points: ["Collapsible tree with item counts.", "Search keys and values.", "Formatted text view with a copy button.", "Tells you where the JSON is broken if it doesn't parse."],
  },
  "xml-viewer": {
    heading: "Open an XML file",
    blurb: "Read XML, SVG source, GPX, KML and plist files, formatted with indentation so the structure is easy to follow.",
    accept: XML_ACCEPT,
    label: "Choose an XML file",
    points: ["Minified XML is indented for you.", "Wrap long lines on or off.", "SVG, GPX, KML and plist files too."],
  },
  "email-viewer": {
    heading: "Open an email file",
    blurb: "Read .eml and Outlook .msg files without an email app: sender, date, the message and its attachments.",
    accept: EMAIL_ACCEPT,
    label: "Choose an .eml or .msg file",
    points: ["From, to, cc, date and subject.", "The message as it was formatted, with inline pictures.", "Open or save each attachment.", "Remote images are blocked, so senders can't track you."],
  },
  "zip-viewer": {
    heading: "Open a ZIP file",
    blurb: "See what's inside a ZIP without extracting it, open the files in it, or save just the one you need.",
    accept: ZIP_ACCEPT,
    label: "Choose a ZIP file",
    points: ["Every file and folder with its size.", "Open PDFs, documents and images inside it.", "Save a single file out of the archive.", "Nothing is uploaded."],
  },
  "epub-viewer": {
    heading: "Open an EPUB eBook",
    blurb: "Read EPUB books in your browser with a clean page, chapter list and adjustable text size.",
    accept: EPUB_ACCEPT,
    label: "Choose an EPUB book",
    points: ["Chapter list and next / previous buttons.", "Larger or smaller text.", "Pictures and the book's own styling.", "DRM-free EPUB 2 and EPUB 3 books."],
  },
  "markdown-viewer": {
    heading: "Open a Markdown file",
    blurb: "See a .md file rendered with headings, lists, tables, links and code blocks, the way it looks on GitHub.",
    accept: MARKDOWN_ACCEPT,
    label: "Choose a Markdown file",
    points: ["Headings, lists, tables, links and code.", "README and notes files.", "Edit it in the Markdown editor."],
  },
  "text-viewer": {
    heading: "Open a text or code file",
    blurb: "Read TXT, LOG, code and config files in a clean monospaced view. Big log files open without freezing.",
    accept: TEXT_ACCEPT,
    label: "Choose a text file",
    points: ["Plain text, logs, subtitles and config files.", "Source code: JS, Python, Java, SQL and more.", "Wrap long lines on or off."],
  },
};

export const presetFor = (slug: string | null | undefined): ViewerPreset | null => (slug ? (VIEWER_PRESETS[slug] ?? null) : null);
