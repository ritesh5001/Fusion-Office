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
const ANY_IMAGE = "image/*,.heic,.heif,.avif,.tif,.tiff";
const HEIC = ".heic,.heif,image/heic,image/heif";

export const TOOLS: ToolDef[] = [
  // Viewer (full-screen app): open and read any document, no sign-in
  { slug: "document-viewer", name: "Document viewer", description: "Open and read PDF, Word, Excel, PowerPoint, image and text files. No sign-in, nothing uploaded.", category: "office", icon: "Eye", accept: "application/pdf,.pdf,.docx,.doc,.odt,.rtf,.xlsx,.xls,.ods,.csv,.tsv,.pptx,.ppt,.odp,.md,.markdown,.txt,.json,.xml,image/*,.heic,.heif,.avif", multiple: false, runs: "browser", href: "/viewer", status: "ready" },
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
  { slug: "delete-pdf-pages", name: "Delete pages", description: "Remove the pages you don't need from a PDF, by number or range.", category: "organize", icon: "FileX2", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "extract-pdf-pages", name: "Extract pages", description: "Pull chosen pages out into a new PDF, or one file per page.", category: "organize", icon: "FileOutput", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "add-blank-pages", name: "Add blank pages", description: "Insert blank pages at the start, the end, or after any page.", category: "organize", icon: "FilePlus2", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "reverse-pdf", name: "Reverse PDF", description: "Flip the page order so the last page comes first.", category: "organize", icon: "ArrowDownUp", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "booklet-pdf", name: "Booklet maker", description: "Arrange pages so a double-sided print folds into a booklet.", category: "organize", icon: "BookCopy", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "poster-pdf", name: "Poster maker", description: "Enlarge a page across several sheets that tape together into a poster.", category: "organize", icon: "Grid3x3", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  // Optimize
  { slug: "compress-pdf", name: "Compress PDF", description: "Shrink file size while text stays sharp and selectable.", category: "optimize", icon: "Minimize2", accept: PDF, multiple: true, runs: "browser", status: "ready", chainable: true },
  { slug: "repair-pdf", name: "Repair PDF", description: "Recover pages from damaged or truncated PDFs.", category: "optimize", icon: "Wrench", accept: PDF, multiple: true, runs: "browser", status: "ready", chainable: true },
  { slug: "ocr-pdf", name: "OCR PDF", description: "Make scanned PDFs searchable and selectable.", category: "optimize", icon: "ScanText", accept: PDF, multiple: false, runs: "browser", status: "ready", chainable: true },
  { slug: "gst-filing-prep", name: "GST filing prep", description: "Compress and split a PDF to fit portal upload limits, for SCN replies and appeals.", category: "optimize", icon: "Receipt", accept: PDF, multiple: false, runs: "browser", status: "ready" },
  { slug: "compress-pdf-to-size", name: "Compress PDF to size", description: "Bring a PDF under an exact size like 100 KB, 200 KB or 1 MB for upload forms.", category: "optimize", icon: "Target", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "remove-blank-pages", name: "Remove blank pages", description: "Find and delete empty pages, including blank sides of scans.", category: "optimize", icon: "FileMinus2", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "deskew-pdf", name: "Straighten PDF", description: "Fix crooked scans: tilted pages are measured and turned upright.", category: "optimize", icon: "Ruler", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "trim-pdf-margins", name: "Trim margins", description: "Crop the white margins off every page automatically.", category: "optimize", icon: "Shrink", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "resize-pdf-pages", name: "Resize pages", description: "Change the page size to A4, Letter, Legal, A3 or A5, scaled to fit.", category: "optimize", icon: "Proportions", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "grayscale-pdf", name: "Grayscale PDF", description: "Turn a colour PDF into black and white to save ink.", category: "optimize", icon: "Palette", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  // Convert to PDF
  { slug: "jpg-to-pdf", name: "JPG to PDF", description: "Turn JPG, PNG and WEBP images into a PDF.", category: "convert-to", icon: "ImagePlus", accept: IMAGES, multiple: true, runs: "browser", status: "ready" },
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
  { slug: "bank-statement-to-excel", name: "Bank statement to Excel", description: "Turn a bank statement PDF into a clean sheet of dated transactions with debit, credit and balance.", category: "convert-from", icon: "Landmark", accept: PDF, multiple: true, runs: "browser", status: "ready" },
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
  // Intelligence
  { slug: "compare-pdf", name: "Compare PDF", description: "See every change between two versions, side by side.", category: "intelligence", icon: "GitCompare", accept: PDF, multiple: true, runs: "browser", status: "ready" },
  { slug: "summarize-pdf", name: "AI Summarizer", description: "Key points of a long document in seconds.", category: "intelligence", icon: "Sparkles", accept: PDF, multiple: false, runs: "ai", status: "ready" },
  { slug: "translate-pdf", name: "Translate PDF", description: "Translate a whole document into another language.", category: "intelligence", icon: "Languages", accept: PDF, multiple: false, runs: "ai", status: "ready" },
  { slug: "chat-with-pdf", name: "Chat with PDF", description: "Ask questions about a PDF and get answers with the pages they come from.", category: "intelligence", icon: "MessagesSquare", accept: PDF, multiple: false, runs: "ai", status: "ready" },
  { slug: "pdf-to-audio", name: "PDF to Audio", description: "Listen to any PDF read aloud, with the sentence highlighted as it's read.", category: "intelligence", icon: "Headphones", accept: PDF, multiple: false, runs: "browser", status: "ready" },
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
];

/** How many tools people can use today. Every page and the app show this one number. */
export const TOOL_COUNT = TOOLS.filter((t) => t.status === "ready").length;

export const toolBySlug = (slug: string) => TOOLS.find((t) => t.slug === slug);

export const RUNS_LABEL: Record<Runs, string> = {
  browser: "Runs in your browser. Files never leave your device.",
  server: "Converted on our server. Files are deleted right after.",
  ai: "Text is sent to our AI provider to process. Files are not stored.",
};
