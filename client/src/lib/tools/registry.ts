/**
 * The tool catalogue. One entry per tool; pages, the hub, navigation and
 * workflows all read from here.
 */
export type Category = "organize" | "optimize" | "convert-to" | "convert-from" | "edit" | "security" | "intelligence";
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
  { id: "organize", label: "Organize" },
  { id: "optimize", label: "Optimize" },
  { id: "convert-to", label: "Convert to PDF" },
  { id: "convert-from", label: "Convert from PDF" },
  { id: "edit", label: "Edit" },
  { id: "security", label: "Security" },
  { id: "intelligence", label: "Intelligence" },
];

const PDF = "application/pdf,.pdf";
const IMAGES = "image/png,image/jpeg,image/webp";

export const TOOLS: ToolDef[] = [
  // Organize
  { slug: "merge-pdf", name: "Merge PDF", description: "Combine PDFs in the order you want.", category: "organize", icon: "Combine", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "split-pdf", name: "Split PDF", description: "Split by ranges, every few pages, or pull out selected pages.", category: "organize", icon: "Scissors", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "organize-pdf", name: "Organize PDF", description: "Reorder, rotate, delete and add pages, across several files.", category: "organize", icon: "LayoutGrid", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "rotate-pdf", name: "Rotate PDF", description: "Rotate every page, or only some, in one or many PDFs.", category: "organize", icon: "RotateCw", accept: PDF, multiple: true, runs: "browser", status: "ready", chainable: true },
  // Optimize
  { slug: "compress-pdf", name: "Compress PDF", description: "Shrink file size while text stays sharp and selectable.", category: "optimize", icon: "Minimize2", accept: PDF, multiple: true, runs: "browser", status: "ready", chainable: true },
  { slug: "repair-pdf", name: "Repair PDF", description: "Recover pages from damaged or truncated PDFs.", category: "optimize", icon: "Wrench", accept: PDF, multiple: true, runs: "browser", status: "ready", chainable: true },
  { slug: "ocr-pdf", name: "OCR PDF", description: "Make scanned PDFs searchable and selectable.", category: "optimize", icon: "ScanText", accept: PDF, multiple: false, runs: "browser", status: "ready", chainable: true },
  // Convert to PDF
  { slug: "jpg-to-pdf", name: "JPG to PDF", description: "Turn JPG, PNG and WEBP images into a PDF.", category: "convert-to", icon: "ImagePlus", accept: IMAGES, multiple: true, runs: "browser", status: "ready" },
  { slug: "scan-to-pdf", name: "Scan to PDF", description: "Use your camera to scan paper into a clean PDF.", category: "convert-to", icon: "Camera", accept: IMAGES, multiple: true, runs: "browser", status: "ready" },
  { slug: "word-to-pdf", name: "Word to PDF", description: "Convert DOC and DOCX documents to PDF.", category: "convert-to", icon: "FileText", accept: ".doc,.docx,.odt,.rtf", multiple: true, runs: "server", status: "ready" },
  { slug: "powerpoint-to-pdf", name: "PowerPoint to PDF", description: "Convert PPT and PPTX slideshows to PDF.", category: "convert-to", icon: "Presentation", accept: ".ppt,.pptx,.odp", multiple: true, runs: "server", status: "ready" },
  { slug: "excel-to-pdf", name: "Excel to PDF", description: "Convert XLS and XLSX spreadsheets to PDF.", category: "convert-to", icon: "FileSpreadsheet", accept: ".xls,.xlsx,.ods,.csv", multiple: true, runs: "server", status: "ready" },
  { slug: "html-to-pdf", name: "HTML to PDF", description: "Turn a web page into a PDF from its address.", category: "convert-to", icon: "Globe", accept: "", multiple: false, runs: "server", status: "ready" },
  // Convert from PDF
  { slug: "pdf-to-jpg", name: "PDF to JPG", description: "Turn pages into images, or pull out the photos inside.", category: "convert-from", icon: "Image", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "pdf-to-word", name: "PDF to Word", description: "Editable DOCX with headings, lists and tables.", category: "convert-from", icon: "FileText", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "pdf-to-powerpoint", name: "PDF to PowerPoint", description: "One slide per page, with the page text in the notes.", category: "convert-from", icon: "Presentation", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "pdf-to-excel", name: "PDF to Excel", description: "Pull tables and columns into a spreadsheet.", category: "convert-from", icon: "FileSpreadsheet", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "pdf-to-markdown", name: "PDF to Markdown", description: "Headings, lists and tables as clean Markdown.", category: "convert-from", icon: "FileCode", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "pdf-to-pdfa", name: "PDF to PDF/A", description: "Archive-grade PDF for long-term storage.", category: "convert-from", icon: "Archive", accept: PDF, multiple: false, runs: "server", status: "soon" },
  // Edit
  { slug: "edit-pdf", name: "Edit PDF", description: "Change existing text, add text, images, shapes and drawings.", category: "edit", icon: "PenLine", accept: PDF, multiple: false, runs: "browser", href: "/editor", status: "ready" },
  { slug: "sign-pdf", name: "Sign PDF", description: "Draw, type or upload your signature.", category: "edit", icon: "Signature", accept: PDF, multiple: false, runs: "browser", href: "/editor", status: "ready" },
  { slug: "watermark-pdf", name: "Watermark", description: "Stamp text or an image over your pages.", category: "edit", icon: "Stamp", accept: PDF, multiple: true, runs: "browser", status: "ready", chainable: true },
  { slug: "page-numbers", name: "Page numbers", description: "Number pages in the position and style you choose.", category: "edit", icon: "ListOrdered", accept: PDF, multiple: true, runs: "browser", status: "ready", chainable: true },
  { slug: "crop-pdf", name: "Crop PDF", description: "Trim margins or keep just the area you select.", category: "edit", icon: "Crop", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "pdf-forms", name: "PDF Forms", description: "Find the fields in a form, fill them in, and flatten.", category: "edit", icon: "ClipboardList", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  // Security
  { slug: "protect-pdf", name: "Protect PDF", description: "Add a password with AES-256 encryption.", category: "security", icon: "Lock", accept: PDF, multiple: true, runs: "browser", status: "ready", chainable: true },
  { slug: "unlock-pdf", name: "Unlock PDF", description: "Remove the password from a PDF you can open.", category: "security", icon: "Unlock", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "redact-pdf", name: "Redact PDF", description: "Find words and remove them from the file for good.", category: "security", icon: "EyeOff", accept: PDF, multiple: true, runs: "browser", status: "ready", chainable: true },
  // Intelligence
  { slug: "compare-pdf", name: "Compare PDF", description: "See every change between two versions, side by side.", category: "intelligence", icon: "GitCompare", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "summarize-pdf", name: "AI Summarizer", description: "Key points of a long document in seconds.", category: "intelligence", icon: "Sparkles", accept: PDF, multiple: false, runs: "ai", status: "ready" },
  { slug: "translate-pdf", name: "Translate PDF", description: "Translate a document and keep its layout.", category: "intelligence", icon: "Languages", accept: PDF, multiple: false, runs: "ai", status: "ready" },
];

export const toolBySlug = (slug: string) => TOOLS.find((t) => t.slug === slug);

export const RUNS_LABEL: Record<Runs, string> = {
  browser: "Runs in your browser. Files never leave your device.",
  server: "Converted on our server. Files are deleted right after.",
  ai: "Text is sent to our AI provider to process. Files are not stored.",
};
