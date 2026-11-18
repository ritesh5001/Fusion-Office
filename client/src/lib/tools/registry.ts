/**
 * The tool catalogue. One entry per tool; pages, the hub, navigation and
 * workflows all read from here.
 */
export type Category = "view" | "office" | "organize" | "optimize" | "convert-to" | "convert-from" | "edit" | "security" | "intelligence" | "image";
export type Runs = "browser" | "server" | "ai";

export interface ToolDef {
  slug: string;
  name: string;
  description: string;
  category: Category;
  /** lucide-react icon name (see components/tools/icons.tsx) */
  icon: string;
  accept: string;
  multiple: boolean;
  runs: Runs;
  /** Tools that live elsewhere (the editor). */
  href?: string;
  status: "ready" | "soon";
  /** Single PDF in → single PDF out: can be a workflow step. */
  chainable?: boolean;
}

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: "view", label: "Viewers" },
  { id: "office", label: "Word, Excel, PowerPoint" },
  { id: "organize", label: "Organize" },
  { id: "optimize", label: "Optimize" },
  { id: "convert-to", label: "Convert to PDF" },
  { id: "convert-from", label: "Convert from PDF" },
  { id: "edit", label: "Edit" },
  { id: "security", label: "Security" },
  { id: "intelligence", label: "Intelligence" },
  { id: "image", label: "Images" },
];

const PDF = "application/pdf,.pdf";
const IMAGES = "image/png,image/jpeg,image/webp";
/** Anything the browser may decode, plus iPhone HEIC (opens where the browser supports it). */
const ANY_IMAGE = "image/*,.heic,.heif,.avif,.tif,.tiff";
const HEIC = ".heic,.heif,image/heic,image/heif";

export const TOOLS: ToolDef[] = [
  // Viewers (one full-screen app at /viewer): open and read a file, no sign-in, nothing uploaded.
  // Each viewer's start screen is set by ?v=<slug> (lib/viewer/presets.ts).
  { slug: "document-viewer", name: "Document viewer", description: "Open and read PDF, Word, Excel, PowerPoint, image, ZIP, email and text files. No sign-in, nothing uploaded.", category: "view", icon: "Eye", accept: "application/pdf,.pdf,.docx,.doc,.odt,.rtf,.xlsx,.xls,.ods,.csv,.tsv,.pptx,.ppt,.odp,.md,.markdown,.txt,.json,.xml,.eml,.msg,.zip,.epub,image/*,.heic,.heif,.avif,.tif,.tiff", multiple: false, runs: "browser", href: "/viewer", status: "ready" },
  { slug: "pdf-viewer", name: "PDF viewer", description: "Read any PDF in your browser: every page, zoom, password-protected files too.", category: "view", icon: "BookOpen", accept: PDF, multiple: false, runs: "browser", href: "/viewer?v=pdf-viewer", status: "ready" },
  { slug: "word-viewer", name: "Word viewer", description: "Read .docx, .doc, .odt and .rtf documents without Word.", category: "view", icon: "FileText", accept: ".docx,.doc,.odt,.rtf", multiple: false, runs: "browser", href: "/viewer?v=word-viewer", status: "ready" },
  { slug: "excel-viewer", name: "Excel viewer", description: "See every sheet of an .xlsx, .xls or .ods file with its number formats.", category: "view", icon: "FileSpreadsheet", accept: ".xlsx,.xlsm,.xls,.ods", multiple: false, runs: "browser", href: "/viewer?v=excel-viewer", status: "ready" },
  { slug: "csv-viewer", name: "CSV viewer", description: "Open a CSV or TSV file as a clean table with columns.", category: "view", icon: "Table", accept: ".csv,.tsv,text/csv", multiple: false, runs: "browser", href: "/viewer?v=csv-viewer", status: "ready" },
  { slug: "powerpoint-viewer", name: "PowerPoint viewer", description: "Flip through every slide of a .pptx, .ppt or .odp, with speaker notes.", category: "view", icon: "Presentation", accept: ".pptx,.ppt,.odp", multiple: false, runs: "browser", href: "/viewer?v=powerpoint-viewer", status: "ready" },
  { slug: "image-viewer", name: "Image viewer", description: "View JPG, PNG, WEBP, GIF, SVG, AVIF, HEIC and TIFF images.", category: "view", icon: "Image", accept: "image/*,.heic,.heif,.avif,.tif,.tiff,.svg", multiple: false, runs: "browser", href: "/viewer?v=image-viewer", status: "ready" },
  { slug: "heic-viewer", name: "HEIC viewer", description: "View iPhone HEIC photos on Windows, Android or any browser.", category: "view", icon: "Smartphone", accept: ".heic,.heif,image/heic,image/heif", multiple: false, runs: "browser", href: "/viewer?v=heic-viewer", status: "ready" },
  { slug: "tiff-viewer", name: "TIFF viewer", description: "View TIFF images and every page of multi-page scans and faxes.", category: "view", icon: "FileImage", accept: ".tif,.tiff,image/tiff", multiple: false, runs: "browser", href: "/viewer?v=tiff-viewer", status: "ready" },
  { slug: "json-viewer", name: "JSON viewer", description: "Explore JSON as a collapsible, searchable tree or formatted text.", category: "view", icon: "Braces", accept: ".json,.geojson,application/json", multiple: false, runs: "browser", href: "/viewer?v=json-viewer", status: "ready" },
  { slug: "xml-viewer", name: "XML viewer", description: "Read XML, SVG source, GPX and KML files, neatly indented.", category: "view", icon: "FileCode2", accept: ".xml,.svg,.plist,.gpx,.kml,application/xml,text/xml", multiple: false, runs: "browser", href: "/viewer?v=xml-viewer", status: "ready" },
  { slug: "email-viewer", name: "EML & MSG viewer", description: "Read .eml and Outlook .msg emails with their attachments, no email app needed.", category: "view", icon: "Mail", accept: ".eml,.msg,message/rfc822", multiple: false, runs: "browser", href: "/viewer?v=email-viewer", status: "ready" },
  { slug: "zip-viewer", name: "ZIP viewer", description: "See what's inside a ZIP, open its files, or save just one.", category: "view", icon: "FileArchive", accept: ".zip,application/zip", multiple: false, runs: "browser", href: "/viewer?v=zip-viewer", status: "ready" },
  { slug: "epub-viewer", name: "EPUB reader", description: "Read EPUB eBooks with a chapter list and adjustable text size.", category: "view", icon: "BookText", accept: ".epub,application/epub+zip", multiple: false, runs: "browser", href: "/viewer?v=epub-viewer", status: "ready" },
  { slug: "markdown-viewer", name: "Markdown viewer", description: "See a .md file rendered with headings, lists, tables and code.", category: "view", icon: "NotebookText", accept: ".md,.markdown,text/markdown", multiple: false, runs: "browser", href: "/viewer?v=markdown-viewer", status: "ready" },
  { slug: "text-viewer", name: "Text & code viewer", description: "Read TXT, LOG, code and config files in a clean monospaced view.", category: "view", icon: "FileCode", accept: ".txt,.log,.yaml,.yml,.ini,.toml,.conf,.env,.html,.htm,.css,.js,.ts,.sql,.py,.java,.kt,.c,.cpp,.h,.cs,.go,.rs,.php,.rb,.sh,.srt,.vtt,text/plain", multiple: false, runs: "browser", href: "/viewer?v=text-viewer", status: "ready" },
  // Office editors (full-screen apps)
  { slug: "word-editor", name: "Word editor", description: "Open and edit .docx files: fonts, headings, lists, tables, images. Save as Word or PDF.", category: "office", icon: "FileText", accept: ".docx,.doc,.odt,.rtf", multiple: false, runs: "browser", href: "/write", status: "ready" },
  { slug: "excel-editor", name: "Excel editor", description: "Open and edit .xlsx and CSV: formulas, formatting, sorting, several sheets.", category: "office", icon: "FileSpreadsheet", accept: ".xlsx,.xls,.ods,.csv", multiple: false, runs: "browser", href: "/sheets", status: "ready" },
  { slug: "powerpoint-editor", name: "PowerPoint editor", description: "Open and edit .pptx: text, shapes, pictures, tables, notes. Present or save.", category: "office", icon: "Presentation", accept: ".pptx,.ppt,.odp", multiple: false, runs: "browser", href: "/slides", status: "ready" },
  { slug: "office-converter", name: "Office format converter", description: "Convert between Word, OpenDocument, RTF, TXT, CSV and old Office formats.", category: "office", icon: "Repeat", accept: ".doc,.docx,.odt,.rtf,.xls,.xlsx,.ods,.csv,.ppt,.pptx,.odp,.pdf", multiple: true, runs: "server", status: "ready" },
  { slug: "resume-builder", name: "Resume builder", description: "Build an ATS-friendly resume and download it as PDF or Word.", category: "office", icon: "FileUser", accept: "", multiple: false, runs: "browser", status: "ready" },
  { slug: "markdown-editor", name: "Markdown editor", description: "Write notes in Markdown with a live preview; save as Markdown, Word, PDF or HTML.", category: "office", icon: "NotebookText", accept: ".md,.markdown,.txt", multiple: false, runs: "browser", status: "ready" },
  { slug: "unicode-to-krutidev", name: "Unicode to Kruti Dev", description: "Convert Unicode Hindi text to Kruti Dev 010 for government and typing-test documents.", category: "office", icon: "Type", accept: "", multiple: false, runs: "browser", status: "ready" },
  { slug: "krutidev-to-unicode", name: "Kruti Dev to Unicode", description: "Convert Kruti Dev 010 text into Unicode Hindi that works everywhere.", category: "office", icon: "Type", accept: "", multiple: false, runs: "browser", status: "ready" },
  // Organize
  { slug: "merge-pdf", name: "Merge PDF", description: "Combine PDFs in the order you want.", category: "organize", icon: "Combine", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "split-pdf", name: "Split PDF", description: "Split by ranges, every few pages, or pull out selected pages.", category: "organize", icon: "Scissors", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "organize-pdf", name: "Organize PDF", description: "Reorder, rotate, delete and add pages, across several files.", category: "organize", icon: "LayoutGrid", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "rotate-pdf", name: "Rotate PDF", description: "Rotate every page, or only some, in one or many PDFs.", category: "organize", icon: "RotateCw", accept: PDF, multiple: true, runs: "browser", status: "ready", chainable: true },
  { slug: "alternate-mix", name: "Alternate & Mix", description: "Interleave pages of two or more PDFs: one page from each in turn.", category: "organize", icon: "Shuffle", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "pages-per-sheet", name: "Pages per sheet", description: "Put 2, 4, 6, 9 or 16 pages on one sheet to save paper.", category: "organize", icon: "Grid2x2", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "flip-pdf", name: "Flip PDF", description: "Mirror pages left to right, top to bottom, or both.", category: "organize", icon: "FlipHorizontal2", accept: PDF, multiple: true, runs: "browser", status: "ready", chainable: true },
  { slug: "split-in-half", name: "Split in half", description: "Cut every page down the middle, for book scans with two pages per sheet.", category: "organize", icon: "Columns2", accept: PDF, multiple: true, runs: "browser", status: "ready", chainable: true },
  { slug: "split-by-size", name: "Split by size", description: "Break a large PDF into parts that each stay under a size limit.", category: "organize", icon: "Scale", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "split-by-bookmarks", name: "Split by bookmarks", description: "Turn each chapter or bookmarked section into its own PDF.", category: "organize", icon: "Bookmark", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "split-by-text", name: "Split by text", description: "Start a new file at every page containing a phrase you choose.", category: "organize", icon: "TextSearch", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "split-by-separator", name: "Split by separator pages", description: "Split a batch scan at blank sheets or QR-code cover pages, naming files from the code.", category: "organize", icon: "Split", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "pdf-to-zip", name: "PDF to ZIP", description: "Bundle several PDFs into one compressed ZIP file.", category: "organize", icon: "FileArchive", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "delete-pdf-pages", name: "Delete pages", description: "Remove the pages you don't need from a PDF, by number or range.", category: "organize", icon: "FileX2", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "extract-pdf-pages", name: "Extract pages", description: "Pull chosen pages out into a new PDF, or one file per page.", category: "organize", icon: "FileOutput", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "add-blank-pages", name: "Add blank pages", description: "Insert blank pages at the start, the end, or after any page.", category: "organize", icon: "FilePlus2", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "reverse-pdf", name: "Reverse PDF", description: "Flip the page order so the last page comes first.", category: "organize", icon: "ArrowDownUp", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "booklet-pdf", name: "Booklet maker", description: "Arrange pages so a double-sided print folds into a booklet.", category: "organize", icon: "BookCopy", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "poster-pdf", name: "Poster maker", description: "Enlarge a page across several sheets that tape together into a poster.", category: "organize", icon: "Grid3x3", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  // Optimize
  { slug: "compress-pdf", name: "Compress PDF", description: "Shrink file size while text stays sharp and selectable.", category: "optimize", icon: "Minimize2", accept: PDF, multiple: true, runs: "browser", status: "ready", chainable: true },
  { slug: "repair-pdf", name: "Repair PDF", description: "Recover pages from damaged or truncated PDFs.", category: "optimize", icon: "Wrench", accept: PDF, multiple: true, runs: "browser", status: "ready", chainable: true },
  { slug: "ocr-pdf", name: "OCR PDF", description: "Make scanned PDFs searchable and selectable, in English or Hindi.", category: "optimize", icon: "ScanText", accept: PDF, multiple: false, runs: "browser", status: "ready", chainable: true },
  { slug: "gst-filing-prep", name: "GST filing prep", description: "Compress and split a PDF to fit portal upload limits, for SCN replies and appeals.", category: "optimize", icon: "Receipt", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "compress-pdf-to-size", name: "Compress PDF to size", description: "Bring a PDF under an exact size like 100 KB, 200 KB or 1 MB for upload forms.", category: "optimize", icon: "Target", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "remove-blank-pages", name: "Remove blank pages", description: "Find and delete empty pages, including blank sides of scans.", category: "optimize", icon: "FileMinus2", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "deskew-pdf", name: "Straighten PDF", description: "Fix crooked scans: tilted pages are measured and turned upright.", category: "optimize", icon: "Ruler", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "trim-pdf-margins", name: "Trim margins", description: "Crop the white margins off every page automatically.", category: "optimize", icon: "Shrink", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "resize-pdf-pages", name: "Resize pages", description: "Change the page size to A4, Letter, Legal, A3 or A5, scaled to fit.", category: "optimize", icon: "Proportions", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "grayscale-pdf", name: "Grayscale PDF", description: "Turn a colour PDF into black and white to save ink.", category: "optimize", icon: "Palette", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "web-optimize-pdf", name: "Web optimize PDF", description: "Linearize a PDF so the first page shows in a browser before the rest downloads.", category: "optimize", icon: "Zap", accept: PDF, multiple: true, runs: "server", status: "ready" },
  { slug: "enhance-scan", name: "Improve scan quality", description: "Clean up phone and scanner pages: white paper, darker text, black and white.", category: "optimize", icon: "WandSparkles", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "hindi-ocr", name: "Hindi OCR", description: "Make scanned Hindi PDFs searchable and copyable, with Devanagari text recognition.", category: "optimize", icon: "Languages", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  // Convert to PDF
  { slug: "jpg-to-pdf", name: "JPG to PDF", description: "Turn JPG, PNG, WEBP, HEIC and TIFF images into a PDF.", category: "convert-to", icon: "ImagePlus", accept: ANY_IMAGE, multiple: true, runs: "browser", status: "ready" },
  { slug: "scan-to-pdf", name: "Scan to PDF", description: "Use your camera to scan paper into a clean PDF.", category: "convert-to", icon: "Camera", accept: IMAGES, multiple: true, runs: "browser", status: "ready" },
  { slug: "word-to-pdf", name: "Word to PDF", description: "Convert DOC and DOCX documents to PDF.", category: "convert-to", icon: "FileText", accept: ".doc,.docx,.odt,.rtf", multiple: true, runs: "server", status: "ready" },
  { slug: "powerpoint-to-pdf", name: "PowerPoint to PDF", description: "Convert PPT and PPTX slideshows to PDF.", category: "convert-to", icon: "Presentation", accept: ".ppt,.pptx,.odp", multiple: true, runs: "server", status: "ready" },
  { slug: "excel-to-pdf", name: "Excel to PDF", description: "Convert XLS and XLSX spreadsheets to PDF.", category: "convert-to", icon: "FileSpreadsheet", accept: ".xls,.xlsx,.ods,.csv", multiple: true, runs: "server", status: "ready" },
  { slug: "html-to-pdf", name: "HTML to PDF", description: "Turn a web page into a PDF from its address.", category: "convert-to", icon: "Globe", accept: "", multiple: false, runs: "server", status: "ready" },
  { slug: "markdown-to-pdf", name: "Markdown to PDF", description: "Turn Markdown into a clean PDF with headings, tables and code blocks.", category: "convert-to", icon: "FileCode2", accept: ".md,.markdown,.txt,text/markdown", multiple: true, runs: "server", status: "ready" },
  { slug: "csv-to-pdf", name: "CSV to PDF", description: "Turn a CSV spreadsheet into a neat, printable table.", category: "convert-to", icon: "Table", accept: ".csv,.tsv,text/csv", multiple: true, runs: "server", status: "ready" },
  { slug: "cdr-converter", name: "CDR Converter", description: "Convert CorelDRAW .cdr files to PDF, PNG, JPG or SVG.", category: "convert-to", icon: "PenTool", accept: ".cdr", multiple: true, runs: "server", status: "ready" },
  { slug: "id-card-to-pdf", name: "ID card to PDF", description: "Put the front and back of an Aadhaar, PAN or other ID card on one A4 page.", category: "convert-to", icon: "IdCard", accept: ANY_IMAGE, multiple: true, runs: "browser", status: "ready" },
  { slug: "heic-to-pdf", name: "HEIC to PDF", description: "Turn iPhone HEIC photos into a PDF, one photo per page.", category: "convert-to", icon: "Smartphone", accept: HEIC, multiple: true, runs: "browser", status: "ready" },
  { slug: "email-to-pdf", name: "Email to PDF", description: "Turn .eml and Outlook .msg emails into PDFs with headers, body and attachments.", category: "convert-to", icon: "Mail", accept: ".eml,.msg,message/rfc822,application/vnd.ms-outlook", multiple: true, runs: "server", status: "ready" },
  { slug: "ebook-to-pdf", name: "eBook to PDF", description: "Convert EPUB books, text and HTML files into typeset PDFs.", category: "convert-to", icon: "BookOpen", accept: ".epub,.txt,.html,.htm,.xhtml", multiple: true, runs: "server", status: "ready" },
  // Convert from PDF
  { slug: "pdf-to-jpg", name: "PDF to JPG", description: "Turn pages into images, or pull out the photos inside.", category: "convert-from", icon: "Image", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "pdf-to-png", name: "PDF to PNG", description: "Turn PDF pages into sharp PNG images.", category: "convert-from", icon: "FileImage", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "pdf-to-tiff", name: "PDF to TIFF", description: "Turn a PDF into a multi-page TIFF for fax, archives and document systems.", category: "convert-from", icon: "Images", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "pdf-to-svg", name: "PDF to SVG", description: "Turn PDF pages into editable SVG vectors with real shapes and text.", category: "convert-from", icon: "Spline", accept: PDF, multiple: false, runs: "server", status: "ready" },
  { slug: "pdf-to-json", name: "PDF to JSON", description: "Export a PDF's text, form data, fonts, bookmarks and hidden scripts as JSON.", category: "convert-from", icon: "Braces", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "pdf-to-word", name: "PDF to Word", description: "Editable DOCX with headings, lists and tables.", category: "convert-from", icon: "FileText", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "pdf-to-powerpoint", name: "PDF to PowerPoint", description: "One slide per page, with the page text in the notes.", category: "convert-from", icon: "Presentation", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "pdf-to-excel", name: "PDF to Excel", description: "Pull tables and columns into a spreadsheet.", category: "convert-from", icon: "FileSpreadsheet", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "pdf-to-markdown", name: "PDF to Markdown", description: "Headings, lists and tables as clean Markdown.", category: "convert-from", icon: "FileCode", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "pdf-to-pdfa", name: "PDF to PDF/A", description: "Archive-grade PDF/A-1b, 2b or 3b for courts, tax portals and long-term storage.", category: "convert-from", icon: "Archive", accept: PDF, multiple: true, runs: "server", status: "ready" },
  { slug: "pdf-to-html", name: "PDF to HTML", description: "A clean web page with the headings, lists and tables of your PDF.", category: "convert-from", icon: "Code", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "pdf-to-epub", name: "PDF to EPUB", description: "Make an eBook that reflows on any e-reader.", category: "convert-from", icon: "BookText", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "pdf-to-csv", name: "PDF to CSV", description: "Pull tables and columns out of a PDF into CSV.", category: "convert-from", icon: "Sheet", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "extract-text", name: "Extract text", description: "All the text of a PDF as a plain .txt file.", category: "convert-from", icon: "FileType", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "extract-images", name: "Extract images", description: "Pull the photos and graphics out of a PDF at original quality.", category: "convert-from", icon: "Images", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "bank-statement-to-excel", name: "Bank statement to Excel", description: "Turn a bank statement PDF into a clean sheet of dated transactions with debit, credit and balance.", category: "convert-from", icon: "Landmark", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  // Edit
  { slug: "edit-pdf", name: "Edit PDF", description: "Change existing text, add text, images, shapes and drawings.", category: "edit", icon: "PenLine", accept: PDF, multiple: false, runs: "browser", href: "/editor", status: "ready" },
  { slug: "sign-pdf", name: "Sign PDF", description: "Draw, type or upload your signature.", category: "edit", icon: "Signature", accept: PDF, multiple: false, runs: "browser", href: "/editor", status: "ready" },
  { slug: "annotate-pdf", name: "Annotate PDF", description: "Highlight, underline, comment, draw and add shapes on a PDF.", category: "edit", icon: "Highlighter", accept: PDF, multiple: false, runs: "browser", status: "ready", href: "/editor" },
  { slug: "overlay-pdf", name: "PDF overlay", description: "Put a letterhead or background PDF under (or over) the pages of another PDF.", category: "edit", icon: "Layers2", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "watermark-pdf", name: "Watermark", description: "Stamp text or an image over your pages.", category: "edit", icon: "Stamp", accept: PDF, multiple: true, runs: "browser", status: "ready", chainable: true },
  { slug: "page-numbers", name: "Page numbers", description: "Number pages in the position and style you choose.", category: "edit", icon: "ListOrdered", accept: PDF, multiple: true, runs: "browser", status: "ready", chainable: true },
  { slug: "remove-watermark", name: "Remove watermark", description: "Find watermarks, stamps and repeated logos in a PDF and delete them for real, not cover them.", category: "edit", icon: "Eraser", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "crop-pdf", name: "Crop PDF", description: "Trim margins or keep just the area you select.", category: "edit", icon: "Crop", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "pdf-forms", name: "PDF Forms", description: "Find the fields in a form, fill them in, and flatten.", category: "edit", icon: "ClipboardList", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "bates-numbering", name: "Bates numbering", description: "Stamp sequential Bates numbers across documents, continuing between files.", category: "edit", icon: "Hash", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "header-footer", name: "Headers & footers", description: "Add header and footer text with page numbers, dates and file names.", category: "edit", icon: "PanelTop", accept: PDF, multiple: true, runs: "browser", status: "ready", chainable: true },
  { slug: "flatten-pdf", name: "Flatten PDF", description: "Lock form answers and annotations into the page, and remove scripts.", category: "edit", icon: "Layers", accept: PDF, multiple: true, runs: "browser", status: "ready", chainable: true },
  { slug: "edit-metadata", name: "Edit metadata", description: "Read and change the title, author, subject, keywords and dates of a PDF.", category: "edit", icon: "FileCog", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "invert-colours", name: "Invert colours", description: "Dark mode, sepia, grayscale or high contrast versions of a PDF.", category: "edit", icon: "Contrast", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "text-to-handwriting", name: "Text to handwriting", description: "Type or paste text and get realistic handwritten pages.", category: "edit", icon: "PenTool", accept: "", multiple: false, runs: "browser", status: "ready" },
  { slug: "pdf-to-handwriting", name: "PDF to handwriting", description: "Turn the text of a PDF into handwritten notes.", category: "edit", icon: "NotebookPen", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "gst-invoice", name: "GST invoice", description: "Create a GST tax invoice with CGST, SGST or IGST, HSN codes and amount in words.", category: "edit", icon: "ReceiptIndianRupee", accept: "", multiple: false, runs: "browser", status: "ready" },
  { slug: "quotation-maker", name: "Quotation maker", description: "Create a price quotation with GST, HSN codes and a validity date.", category: "edit", icon: "FileSignature", accept: "", multiple: false, runs: "browser", status: "ready" },
  { slug: "proforma-invoice", name: "Proforma invoice", description: "Create a proforma invoice with GST for advance payments and order confirmation.", category: "edit", icon: "FileClock", accept: "", multiple: false, runs: "browser", status: "ready" },
  { slug: "delivery-challan", name: "Delivery challan", description: "Create a GST delivery challan with consignee, transport and vehicle details.", category: "edit", icon: "Truck", accept: "", multiple: false, runs: "browser", status: "ready" },
  { slug: "rent-receipt", name: "Rent receipt", description: "Make monthly rent receipts for HRA claims, with landlord PAN and revenue stamp box.", category: "edit", icon: "House", accept: "", multiple: false, runs: "browser", status: "ready" },
  { slug: "salary-slip", name: "Salary slip", description: "Create a salary slip with earnings, deductions and net pay in words.", category: "edit", icon: "Banknote", accept: "", multiple: false, runs: "browser", status: "ready" },
  { slug: "stamp-pdf", name: "Stamp PDF", description: "Stamp Paid, Approved, Received, Confidential or your own text on a PDF.", category: "edit", icon: "BadgeCheck", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "qr-code-pdf", name: "QR code on PDF", description: "Print a QR code for a link, a UPI ID or a verification page on your PDF.", category: "edit", icon: "QrCode", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "pdf-bookmarks", name: "Bookmarks editor", description: "Add, edit, nest and remove the bookmarks (table of contents) of a PDF.", category: "edit", icon: "ListTree", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "pdf-attachments", name: "PDF attachments", description: "Extract the files embedded in a PDF, attach new ones, or remove them all.", category: "edit", icon: "Paperclip", accept: "*/*", multiple: true, runs: "browser", status: "ready" },
  { slug: "remove-annotations", name: "Remove annotations", description: "Delete comments, highlights, stamps and drawings added on top of a PDF.", category: "edit", icon: "MessageSquareOff", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  // Security
  { slug: "protect-pdf", name: "Protect PDF", description: "Add a password with AES-256 encryption.", category: "security", icon: "Lock", accept: PDF, multiple: true, runs: "browser", status: "ready", chainable: true },
  { slug: "unlock-pdf", name: "Unlock PDF", description: "Remove the password from a PDF you can open.", category: "security", icon: "Unlock", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "redact-pdf", name: "Redact PDF", description: "Find words and remove them from the file for good.", category: "security", icon: "EyeOff", accept: PDF, multiple: true, runs: "browser", status: "ready", chainable: true },
  { slug: "remove-restrictions", name: "Remove restrictions", description: "Remove printing, copying and editing restrictions from a PDF you can open.", category: "security", icon: "LockOpen", accept: PDF, multiple: true, runs: "browser", status: "ready", chainable: true },
  { slug: "auto-redact-pii", name: "Auto-redact PII", description: "Find and permanently remove Aadhaar, PAN, card numbers, emails and phone numbers.", category: "security", icon: "ShieldOff", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "privacy-scanner", name: "Privacy scanner", description: "Find personal data and hidden information in a PDF before you share it.", category: "security", icon: "ScanSearch", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "file-fingerprint", name: "File fingerprint", description: "SHA-256, SHA-1 and MD5 hashes to prove a file hasn't changed.", category: "security", icon: "Fingerprint", accept: "*/*", multiple: true, runs: "browser", status: "ready" },
  { slug: "sanitize-pdf", name: "Sanitize PDF", description: "Strip JavaScript, risky actions, links, hidden metadata and attachments from a PDF.", category: "security", icon: "ShieldCheck", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "sign-pdf-certificate", name: "Digital signature (certificate)", description: "Sign a PDF with your .pfx or .p12 digital signature certificate (DSC), on your device.", category: "security", icon: "FileKey", accept: "application/pdf,.pdf,.pfx,.p12,application/x-pkcs12", multiple: true, runs: "browser", status: "ready" },
  { slug: "verify-pdf-signature", name: "Verify PDF signature", description: "Check who signed a PDF, when, and whether it changed after signing.", category: "security", icon: "FileCheck", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  // Intelligence
  { slug: "compare-pdf", name: "Compare PDF", description: "See every change between two versions, side by side.", category: "intelligence", icon: "GitCompare", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "summarize-pdf", name: "AI Summarizer", description: "Key points of a long document in seconds.", category: "intelligence", icon: "Sparkles", accept: PDF, multiple: false, runs: "ai", status: "ready" },
  { slug: "translate-pdf", name: "Translate PDF", description: "Translate a whole document into another language.", category: "intelligence", icon: "Languages", accept: PDF, multiple: false, runs: "ai", status: "ready" },
  { slug: "chat-with-pdf", name: "Chat with PDF", description: "Ask questions about one PDF or compare up to ten, with answers that cite the file and page.", category: "intelligence", icon: "MessagesSquare", accept: PDF, multiple: false, runs: "ai", status: "ready" },
  { slug: "pdf-to-audio", name: "PDF to Audio", description: "Listen to any PDF read aloud, with the sentence highlighted as it's read.", category: "intelligence", icon: "Headphones", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "quiz-generator", name: "AI quiz generator", description: "Turn notes or a chapter into multiple-choice, true/false or short-answer questions.", category: "intelligence", icon: "ListChecks", accept: ".pdf,.docx,.txt,application/pdf", multiple: false, runs: "ai", status: "ready" },
  { slug: "flashcard-maker", name: "AI flashcard maker", description: "Make study flashcards from a PDF, ready to import into Anki or Quizlet.", category: "intelligence", icon: "SquareStack", accept: ".pdf,.docx,.txt,application/pdf", multiple: false, runs: "ai", status: "ready" },
  { slug: "ai-data-extraction", name: "AI invoice & table extraction", description: "Pull invoice fields, line items or tables from PDFs into Excel.", category: "intelligence", icon: "TableProperties", accept: PDF, multiple: true, runs: "ai", status: "ready" },
  { slug: "pdf-to-presentation-ai", name: "AI PDF to PowerPoint", description: "Turn a report or chapter into a presentation with slides and speaker notes.", category: "intelligence", icon: "MonitorPlay", accept: ".pdf,.docx,.txt,application/pdf", multiple: false, runs: "ai", status: "ready" },
  { slug: "ats-resume-checker", name: "ATS resume checker", description: "Score your resume against a job description and see the missing keywords.", category: "intelligence", icon: "UserCheck", accept: ".pdf,.docx,.txt,application/pdf", multiple: false, runs: "ai", status: "ready" },
  // Images
  { slug: "image-editor", name: "Image editor", description: "Crop, straighten, adjust light and colour, add filters and text, then resize and save.", category: "image", icon: "SlidersHorizontal", accept: ANY_IMAGE, multiple: false, runs: "browser", status: "ready" },
  { slug: "compress-image", name: "Compress image", description: "Make JPG, PNG and WEBP files smaller, or fit them under a size like 50 KB.", category: "image", icon: "ImageDown", accept: ANY_IMAGE, multiple: true, runs: "browser", status: "ready" },
  { slug: "resize-image", name: "Resize image", description: "By percentage, by pixels, by print size in cm, or to a file size in KB.", category: "image", icon: "Scaling", accept: ANY_IMAGE, multiple: true, runs: "browser", status: "ready" },
  { slug: "crop-image", name: "Crop image", description: "Cut to any shape: square, 16:9, passport photo or free.", category: "image", icon: "Crop", accept: ANY_IMAGE, multiple: false, runs: "browser", status: "ready" },
  { slug: "convert-image", name: "Convert image", description: "Change images to JPG, PNG or WEBP, including HEIC, GIF, BMP and SVG.", category: "image", icon: "ArrowLeftRight", accept: ANY_IMAGE, multiple: true, runs: "browser", status: "ready" },
  { slug: "remove-watermark-image", name: "Remove watermark from image", description: "Paint over a watermark, logo or date stamp and it's filled in from its surroundings.", category: "image", icon: "Brush", accept: ANY_IMAGE, multiple: false, runs: "browser", status: "ready" },
  { slug: "jpg-to-svg", name: "JPG to SVG", description: "Turn JPG and PNG images into editable vectors for CorelDRAW, Illustrator and Figma.", category: "image", icon: "PenTool", accept: "image/png,image/jpeg,image/webp,image/bmp,image/gif", multiple: true, runs: "browser", status: "ready" },
  { slug: "rotate-image", name: "Rotate image", description: "Turn or mirror many images at once.", category: "image", icon: "FlipHorizontal2", accept: ANY_IMAGE, multiple: true, runs: "browser", status: "ready" },
  { slug: "thumbmark-maker", name: "Thumbmark maker", description: "Photograph your thumbprint and get a clean transparent PNG for forms.", category: "image", icon: "Fingerprint", accept: ANY_IMAGE, multiple: false, runs: "browser", status: "ready" },
  { slug: "remove-background", name: "Remove background", description: "Erase a plain background from a photo, logo or signature: transparent PNG, white or any colour.", category: "image", icon: "ImageOff", accept: ANY_IMAGE, multiple: true, runs: "browser", status: "ready" },
  { slug: "passport-photo-maker", name: "Passport photo maker", description: "Crop to passport size, whiten the background and print several on one sheet.", category: "image", icon: "SquareUser", accept: ANY_IMAGE, multiple: false, runs: "browser", status: "ready" },
  { slug: "exam-photo-resizer", name: "Exam photo & signature resizer", description: "Photo and signature in the exact pixels and KB for SSC, UPSC, IBPS, SBI, RRB, NEET, JEE, PAN and passport forms.", category: "image", icon: "GraduationCap", accept: ANY_IMAGE, multiple: true, runs: "browser", status: "ready" },
  { slug: "heic-to-jpg", name: "HEIC to JPG", description: "Convert iPhone HEIC photos to JPG in any browser.", category: "image", icon: "Smartphone", accept: HEIC, multiple: true, runs: "browser", status: "ready" },
  { slug: "webp-to-jpg", name: "WEBP to JPG", description: "Convert WEBP images to JPG that open everywhere.", category: "image", icon: "FileImage", accept: "image/webp,.webp", multiple: true, runs: "browser", status: "ready" },
  { slug: "png-to-jpg", name: "PNG to JPG", description: "Convert PNG images to smaller JPG files.", category: "image", icon: "FileImage", accept: "image/png,.png", multiple: true, runs: "browser", status: "ready" },
  { slug: "jpg-to-png", name: "JPG to PNG", description: "Convert JPG images to lossless PNG.", category: "image", icon: "FileImage", accept: "image/jpeg,.jpg,.jpeg", multiple: true, runs: "browser", status: "ready" },
  { slug: "tiff-to-jpg", name: "TIFF to JPG", description: "Convert TIFF scans and photos to JPG.", category: "image", icon: "FileImage", accept: ".tif,.tiff,image/tiff", multiple: true, runs: "browser", status: "ready" },
  { slug: "image-to-text", name: "Image to text", description: "Copy the text out of photos, screenshots and scans, in English or Hindi.", category: "image", icon: "ScanLine", accept: ANY_IMAGE, multiple: true, runs: "browser", status: "ready" },
  { slug: "watermark-image", name: "Watermark image", description: "Add a text or logo watermark to many photos at once.", category: "image", icon: "Copyright", accept: ANY_IMAGE, multiple: true, runs: "browser", status: "ready" },
  { slug: "blur-image", name: "Blur image", description: "Blur, pixelate or black out faces, numbers and details in a photo.", category: "image", icon: "Droplets", accept: ANY_IMAGE, multiple: false, runs: "browser", status: "ready" },
  { slug: "photo-collage", name: "Photo collage maker", description: "Arrange photos in a grid collage for social media or print.", category: "image", icon: "LayoutDashboard", accept: ANY_IMAGE, multiple: true, runs: "browser", status: "ready" },
  { slug: "batch-rename", name: "Batch rename files", description: "Rename many files at once with numbers, dates and find-and-replace.", category: "image", icon: "TextCursor", accept: "*/*", multiple: true, runs: "browser", status: "ready" },
  { slug: "qr-code-generator", name: "QR code generator", description: "Make QR codes for links, UPI payments, Wi-Fi and contacts, as PNG and SVG.", category: "image", icon: "ScanQrCode", accept: "", multiple: false, runs: "browser", status: "ready" },
];

/** How many tools people can use today. Every page and the app show this one number. */
export const TOOL_COUNT = TOOLS.filter((t) => t.status === "ready").length;

export const toolBySlug = (slug: string) => TOOLS.find((t) => t.slug === slug);

export const RUNS_LABEL: Record<Runs, string> = {
  browser: "Runs in your browser. Files never leave your device.",
  server: "Converted on our server. Files are deleted right after.",
  ai: "Text is sent to our AI provider to process. Files are not stored.",
};
