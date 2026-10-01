/**
 * The tool catalogue. One entry per tool; pages, the hub, navigation and
 * workflows all read from here.
 */
export type Category = "office" | "organize" | "optimize" | "convert-to" | "convert-from" | "edit" | "security" | "intelligence" | "image";
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
const ANY_IMAGE = "image/*,.heic,.heif,.avif";

export const TOOLS: ToolDef[] = [
  // Office editors (full-screen apps)
  { slug: "word-editor", name: "Word editor", description: "Open and edit .docx files: fonts, headings, lists, tables, images. Save as Word or PDF.", category: "office", icon: "FileText", accept: ".docx,.doc,.odt,.rtf", multiple: false, runs: "browser", href: "/write", status: "ready" },
  { slug: "excel-editor", name: "Excel editor", description: "Open and edit .xlsx and CSV: formulas, formatting, sorting, several sheets.", category: "office", icon: "FileSpreadsheet", accept: ".xlsx,.xls,.ods,.csv", multiple: false, runs: "browser", href: "/sheets", status: "ready" },
  { slug: "powerpoint-editor", name: "PowerPoint editor", description: "Open and edit .pptx: text, shapes, pictures, tables, notes. Present or save.", category: "office", icon: "Presentation", accept: ".pptx,.ppt,.odp", multiple: false, runs: "browser", href: "/slides", status: "ready" },
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
  { slug: "pdf-to-zip", name: "PDF to ZIP", description: "Bundle several PDFs into one compressed ZIP file.", category: "organize", icon: "FileArchive", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  // Optimize
  { slug: "compress-pdf", name: "Compress PDF", description: "Shrink file size while text stays sharp and selectable.", category: "optimize", icon: "Minimize2", accept: PDF, multiple: true, runs: "browser", status: "ready", chainable: true },
  { slug: "repair-pdf", name: "Repair PDF", description: "Recover pages from damaged or truncated PDFs.", category: "optimize", icon: "Wrench", accept: PDF, multiple: true, runs: "browser", status: "ready", chainable: true },
  { slug: "ocr-pdf", name: "OCR PDF", description: "Make scanned PDFs searchable and selectable.", category: "optimize", icon: "ScanText", accept: PDF, multiple: false, runs: "browser", status: "ready", chainable: true },
  { slug: "gst-filing-prep", name: "GST filing prep", description: "Compress and split a PDF to fit portal upload limits, for SCN replies and appeals.", category: "optimize", icon: "Receipt", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  // Convert to PDF
  { slug: "jpg-to-pdf", name: "JPG to PDF", description: "Turn JPG, PNG and WEBP images into a PDF.", category: "convert-to", icon: "ImagePlus", accept: IMAGES, multiple: true, runs: "browser", status: "ready" },
  { slug: "scan-to-pdf", name: "Scan to PDF", description: "Use your camera to scan paper into a clean PDF.", category: "convert-to", icon: "Camera", accept: IMAGES, multiple: true, runs: "browser", status: "ready" },
  { slug: "word-to-pdf", name: "Word to PDF", description: "Convert DOC and DOCX documents to PDF.", category: "convert-to", icon: "FileText", accept: ".doc,.docx,.odt,.rtf", multiple: true, runs: "server", status: "ready" },
  { slug: "powerpoint-to-pdf", name: "PowerPoint to PDF", description: "Convert PPT and PPTX slideshows to PDF.", category: "convert-to", icon: "Presentation", accept: ".ppt,.pptx,.odp", multiple: true, runs: "server", status: "ready" },
  { slug: "excel-to-pdf", name: "Excel to PDF", description: "Convert XLS and XLSX spreadsheets to PDF.", category: "convert-to", icon: "FileSpreadsheet", accept: ".xls,.xlsx,.ods,.csv", multiple: true, runs: "server", status: "ready" },
  { slug: "html-to-pdf", name: "HTML to PDF", description: "Turn a web page into a PDF from its address.", category: "convert-to", icon: "Globe", accept: "", multiple: false, runs: "server", status: "ready" },
  { slug: "markdown-to-pdf", name: "Markdown to PDF", description: "Turn Markdown into a clean PDF with headings, tables and code blocks.", category: "convert-to", icon: "FileCode2", accept: ".md,.markdown,.txt,text/markdown", multiple: true, runs: "server", status: "ready" },
  { slug: "csv-to-pdf", name: "CSV to PDF", description: "Turn a CSV spreadsheet into a neat, printable table.", category: "convert-to", icon: "Table", accept: ".csv,.tsv,text/csv", multiple: true, runs: "server", status: "ready" },
  { slug: "ebook-to-pdf", name: "eBook to PDF", description: "Convert EPUB books, text and HTML files into typeset PDFs.", category: "convert-to", icon: "BookOpen", accept: ".epub,.txt,.html,.htm,.xhtml", multiple: true, runs: "server", status: "ready" },
  // Convert from PDF
  { slug: "pdf-to-jpg", name: "PDF to JPG", description: "Turn pages into images, or pull out the photos inside.", category: "convert-from", icon: "Image", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "pdf-to-word", name: "PDF to Word", description: "Editable DOCX with headings, lists and tables.", category: "convert-from", icon: "FileText", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "pdf-to-powerpoint", name: "PDF to PowerPoint", description: "One slide per page, with the page text in the notes.", category: "convert-from", icon: "Presentation", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "pdf-to-excel", name: "PDF to Excel", description: "Pull tables and columns into a spreadsheet.", category: "convert-from", icon: "FileSpreadsheet", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "pdf-to-markdown", name: "PDF to Markdown", description: "Headings, lists and tables as clean Markdown.", category: "convert-from", icon: "FileCode", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "pdf-to-pdfa", name: "PDF to PDF/A", description: "Archive-grade PDF for long-term storage.", category: "convert-from", icon: "Archive", accept: PDF, multiple: false, runs: "server", status: "soon" },
  { slug: "pdf-to-html", name: "PDF to HTML", description: "A clean web page with the headings, lists and tables of your PDF.", category: "convert-from", icon: "Code", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "pdf-to-epub", name: "PDF to EPUB", description: "Make an eBook that reflows on any e-reader.", category: "convert-from", icon: "BookText", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "pdf-to-csv", name: "PDF to CSV", description: "Pull tables and columns out of a PDF into CSV.", category: "convert-from", icon: "Sheet", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "extract-text", name: "Extract text", description: "All the text of a PDF as a plain .txt file.", category: "convert-from", icon: "FileType", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "extract-images", name: "Extract images", description: "Pull the photos and graphics out of a PDF at original quality.", category: "convert-from", icon: "Images", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  // Edit
  { slug: "edit-pdf", name: "Edit PDF", description: "Change existing text, add text, images, shapes and drawings.", category: "edit", icon: "PenLine", accept: PDF, multiple: false, runs: "browser", href: "/editor", status: "ready" },
  { slug: "sign-pdf", name: "Sign PDF", description: "Draw, type or upload your signature.", category: "edit", icon: "Signature", accept: PDF, multiple: false, runs: "browser", href: "/editor", status: "ready" },
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
  // Security
  { slug: "protect-pdf", name: "Protect PDF", description: "Add a password with AES-256 encryption.", category: "security", icon: "Lock", accept: PDF, multiple: true, runs: "browser", status: "ready", chainable: true },
  { slug: "unlock-pdf", name: "Unlock PDF", description: "Remove the password from a PDF you can open.", category: "security", icon: "Unlock", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "redact-pdf", name: "Redact PDF", description: "Find words and remove them from the file for good.", category: "security", icon: "EyeOff", accept: PDF, multiple: true, runs: "browser", status: "ready", chainable: true },
  { slug: "remove-restrictions", name: "Remove restrictions", description: "Remove printing, copying and editing restrictions from a PDF you can open.", category: "security", icon: "LockOpen", accept: PDF, multiple: true, runs: "browser", status: "ready", chainable: true },
  { slug: "auto-redact-pii", name: "Auto-redact PII", description: "Find and permanently remove Aadhaar, PAN, card numbers, emails and phone numbers.", category: "security", icon: "ShieldOff", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "privacy-scanner", name: "Privacy scanner", description: "Find personal data and hidden information in a PDF before you share it.", category: "security", icon: "ScanSearch", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "file-fingerprint", name: "File fingerprint", description: "SHA-256, SHA-1 and MD5 hashes to prove a file hasn't changed.", category: "security", icon: "Fingerprint", accept: "*/*", multiple: true, runs: "browser", status: "ready" },
  // Intelligence
  { slug: "compare-pdf", name: "Compare PDF", description: "See every change between two versions, side by side.", category: "intelligence", icon: "GitCompare", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "summarize-pdf", name: "AI Summarizer", description: "Key points of a long document in seconds.", category: "intelligence", icon: "Sparkles", accept: PDF, multiple: false, runs: "ai", status: "ready" },
  { slug: "translate-pdf", name: "Translate PDF", description: "Translate a whole document into another language.", category: "intelligence", icon: "Languages", accept: PDF, multiple: false, runs: "ai", status: "ready" },
  // Images
  { slug: "image-editor", name: "Image editor", description: "Crop, straighten, adjust light and colour, add filters and text, then resize and save.", category: "image", icon: "SlidersHorizontal", accept: ANY_IMAGE, multiple: false, runs: "browser", status: "ready" },
  { slug: "compress-image", name: "Compress image", description: "Make JPG, PNG and WEBP files smaller, or fit them under a size like 50 KB.", category: "image", icon: "ImageDown", accept: ANY_IMAGE, multiple: true, runs: "browser", status: "ready" },
  { slug: "resize-image", name: "Resize image", description: "By percentage, by pixels, by print size in cm, or to a file size in KB.", category: "image", icon: "Scaling", accept: ANY_IMAGE, multiple: true, runs: "browser", status: "ready" },
  { slug: "crop-image", name: "Crop image", description: "Cut to any shape: square, 16:9, passport photo or free.", category: "image", icon: "Crop", accept: ANY_IMAGE, multiple: false, runs: "browser", status: "ready" },
  { slug: "convert-image", name: "Convert image", description: "Change images to JPG, PNG or WEBP, including HEIC, GIF, BMP and SVG.", category: "image", icon: "ArrowLeftRight", accept: ANY_IMAGE, multiple: true, runs: "browser", status: "ready" },
  { slug: "remove-watermark-image", name: "Remove watermark from image", description: "Paint over a watermark, logo or date stamp and it's filled in from its surroundings.", category: "image", icon: "Brush", accept: ANY_IMAGE, multiple: false, runs: "browser", status: "ready" },
  { slug: "rotate-image", name: "Rotate image", description: "Turn or mirror many images at once.", category: "image", icon: "FlipHorizontal2", accept: ANY_IMAGE, multiple: true, runs: "browser", status: "ready" },
  { slug: "thumbmark-maker", name: "Thumbmark maker", description: "Photograph your thumbprint and get a clean transparent PNG for forms.", category: "image", icon: "Fingerprint", accept: ANY_IMAGE, multiple: false, runs: "browser", status: "ready" },
];

export const toolBySlug = (slug: string) => TOOLS.find((t) => t.slug === slug);

export const RUNS_LABEL: Record<Runs, string> = {
  browser: "Runs in your browser. Files never leave your device.",
  server: "Converted on our server. Files are deleted right after.",
  ai: "Text is sent to our AI provider to process. Files are not stored.",
};
