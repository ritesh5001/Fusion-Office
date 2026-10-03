/**
 * Topical clusters: one landing page per group of tools that people search
 * for as a group. Every registry category belongs to exactly one cluster
 * (that's the breadcrumb parent of its tools); a cluster may also feature
 * closely related tools from other categories.
 */
import type { Category } from "@/lib/tools/registry";

export type ClusterId = "pdf-tools" | "pdf-converter" | "office-tools" | "image-tools" | "ai-pdf-tools";

export interface ClusterSection {
  /** Tools of this registry category are listed in the section. */
  category?: Category;
  /** Or an explicit list (tools from other clusters worth featuring here). */
  slugs?: string[];
  heading: string;
  blurb: string;
}

export interface Cluster {
  id: ClusterId;
  path: string;
  /** Short name, used in breadcrumbs and navigation. */
  name: string;
  title: string;
  description: string;
  h1: string;
  intro: string[];
  sections: ClusterSection[];
  faq: [string, string][];
  guides: string[];
  /** Descriptive anchor text used when other pages link here. */
  anchor: string;
}

export const CLUSTERS: Cluster[] = [
  {
    id: "pdf-tools",
    path: "/pdf-tools",
    name: "PDF Tools",
    anchor: "Browse all PDF tools",
    title: "Free PDF Tools Online – Edit, Compress, Merge & Split PDFs",
    description:
      "Free online PDF tools that work in your browser: edit, compress, merge, split, rotate, sign, protect, unlock and redact PDF files. No sign-up and no watermarks.",
    h1: "Free online PDF tools",
    intro: [
      "Everything you need to fix, shrink, reorganize and secure PDF files, in one place. Pick a tool, add your PDF and download the result: there is no account to create and nothing is added to your pages.",
      "Almost all of these PDF tools run entirely inside your browser, so the file is never uploaded. That makes them fast, and safe for contracts, statements and other private documents.",
    ],
    sections: [
      {
        category: "edit",
        heading: "Edit and sign PDFs",
        blurb: "Change the text that is already in a PDF, add text, images and signatures, fill in forms, and stamp watermarks, page numbers or headers.",
      },
      {
        category: "optimize",
        heading: "Compress and repair PDFs",
        blurb: "Make PDFs small enough for email and upload portals, recover damaged files, and turn scans into searchable text.",
      },
      {
        category: "organize",
        heading: "Merge, split and organize PDFs",
        blurb: "Combine several PDFs into one, split a large file into parts, and reorder, rotate or delete pages.",
      },
      {
        category: "security",
        heading: "Protect, unlock and redact PDFs",
        blurb: "Add or remove passwords, permanently black out sensitive text, and check a PDF for personal data before you share it.",
      },
    ],
    faq: [
      [
        "Are these PDF tools really free?",
        "Yes. Every PDF tool on Fusion Office is free to use without an account, there is no daily task limit, and no watermark is added to your files.",
      ],
      [
        "Do my PDFs get uploaded?",
        "Not for the tools on this page: they process the PDF inside your browser. Only a few conversions (such as Word to PDF) and the AI tools need our server, and each of those tools says so before you use it.",
      ],
      [
        "Which PDF tool should I use to make a file smaller?",
        "Use Compress PDF first. If the file still has to fit a strict limit, such as a 5 MB upload portal, Split by size breaks it into parts that each stay under the limit.",
      ],
    ],
    guides: ["how-to-compress-a-pdf", "how-to-merge-pdf-files", "how-to-split-a-pdf", "how-to-edit-a-pdf", "how-to-password-protect-a-pdf", "how-to-redact-a-pdf"],
  },
  {
    id: "pdf-converter",
    path: "/pdf-converter",
    name: "PDF Converter",
    anchor: "Explore every PDF converter",
    title: "Free PDF Converter Online – Convert PDF to Word, JPG, Excel & More",
    description:
      "Convert PDF to Word, Excel, PowerPoint, JPG, Markdown, HTML, EPUB and CSV, or turn Word, Excel, PowerPoint, images, web pages and eBooks into PDF. Free, no sign-up.",
    h1: "Free online PDF converter",
    intro: [
      "Convert PDFs into files you can edit, and turn almost any document or image into a PDF. Each converter is its own tool with the settings that matter for that format, such as page size for images or tables for spreadsheets.",
      "Conversions from PDF run in your browser. Conversions to PDF from Office formats, web pages and eBooks use our server, which deletes your file as soon as the PDF is ready.",
    ],
    sections: [
      {
        category: "convert-from",
        heading: "Convert from PDF",
        blurb: "Get an editable Word document, a spreadsheet of the tables, slides, images or plain text out of a PDF.",
      },
      {
        category: "convert-to",
        heading: "Convert to PDF",
        blurb: "Turn Word, Excel and PowerPoint files, photos, web pages, Markdown, CSV and eBooks into PDFs that look the same everywhere.",
      },
    ],
    faq: [
      [
        "Can I convert a scanned PDF to Word?",
        "A scanned PDF is a picture of text, so there is nothing to convert yet. Run OCR PDF first to add a text layer, then use PDF to Word.",
      ],
      [
        "Will the converted file keep my formatting?",
        "PDF to Word keeps headings, paragraphs, lists and tables. Exact positioning of complex layouts can shift, because a Word document reflows text while a PDF fixes every line in place.",
      ],
      [
        "Which conversions upload my file?",
        "Word, Excel, PowerPoint, HTML, Markdown, CSV and eBook to PDF are converted on our server and deleted right after. Every conversion from PDF happens on your device.",
      ],
    ],
    guides: ["how-to-convert-pdf-to-word", "how-to-convert-jpg-to-pdf", "how-to-make-a-scanned-pdf-searchable"],
  },
  {
    id: "office-tools",
    path: "/office-tools",
    name: "Office Tools",
    anchor: "See all online office tools",
    title: "Free Online Office Tools – Edit Word, Excel & PowerPoint Files",
    description:
      "Open, edit and save Word (.docx), Excel (.xlsx, .csv) and PowerPoint (.pptx) files in your browser, and convert them to or from PDF. Free online office tools, no install.",
    h1: "Online office tools for Word, Excel and PowerPoint",
    intro: [
      "Open a Word document, spreadsheet or presentation in your browser and edit it without installing an office suite. Your work is saved as a draft on this device, and you can download it again as .docx, .xlsx, .pptx or PDF.",
      "The editors are built for everyday documents: letters, reports, budgets, invoices and slide decks. Older formats such as .doc, .xls and .ppt are converted to the modern format when you open them.",
    ],
    sections: [
      {
        category: "office",
        heading: "Word, Excel and PowerPoint editors",
        blurb: "Full editors for documents, spreadsheets and presentations, with templates to start from.",
      },
      {
        slugs: ["word-to-pdf", "excel-to-pdf", "powerpoint-to-pdf", "csv-to-pdf", "pdf-to-word", "pdf-to-excel", "pdf-to-powerpoint"],
        heading: "Convert Office files and PDFs",
        blurb: "Turn Office files into PDFs to share them, or get an editable Office file back from a PDF.",
      },
    ],
    faq: [
      [
        "Do I need Microsoft Office to use these tools?",
        "No. The editors run in your browser and read and write the same .docx, .xlsx and .pptx files that Microsoft Office, Google Docs and LibreOffice use.",
      ],
      [
        "Where are my documents saved?",
        "Drafts are kept in your browser on this device and appear under Recent when you return. Download the file to keep a copy elsewhere.",
      ],
    ],
    guides: ["how-to-convert-pdf-to-word"],
  },
  {
    id: "image-tools",
    path: "/image-tools",
    name: "Image Tools",
    anchor: "Browse all image tools",
    title: "Free Image Tools Online – Compress, Resize, Crop & Convert Images",
    description:
      "Compress images to a target size like 50 KB, resize by pixels or centimetres, crop, rotate, convert HEIC, PNG, JPG and WEBP, and remove watermarks. Free and private, in your browser.",
    h1: "Free online image tools",
    intro: [
      "Get photos ready for forms, websites and messages: shrink them under an upload limit, resize them to exact pixels or a passport-photo size, crop, rotate and change the format.",
      "Images are processed in your browser and never uploaded, and you can work on many images at once with most tools.",
    ],
    sections: [
      {
        category: "image",
        heading: "Edit, compress and convert images",
        blurb: "Every image tool, from a full editor to one-click compression and format conversion.",
      },
      {
        slugs: ["jpg-to-pdf", "pdf-to-jpg", "scan-to-pdf"],
        heading: "Images and PDFs",
        blurb: "Put photos into a PDF, scan paper with your camera, or turn PDF pages back into images.",
      },
    ],
    faq: [
      [
        "How do I get an image under 50 KB or 100 KB?",
        "Open Compress image, choose “File size” and enter the limit. The tool lowers quality and, if needed, dimensions until the file is that size or smaller.",
      ],
      [
        "Can I open iPhone HEIC photos?",
        "Yes, where your browser can decode HEIC (Safari does). Convert image turns them into JPG, PNG or WEBP.",
      ],
    ],
    guides: ["how-to-reduce-image-file-size", "how-to-convert-jpg-to-pdf"],
  },
  {
    id: "ai-pdf-tools",
    path: "/ai-pdf-tools",
    name: "AI PDF Tools",
    anchor: "Explore the AI PDF tools",
    title: "AI PDF Tools – Summarize, Translate, Compare & Chat with PDFs",
    description:
      "Summarize long PDFs, translate whole documents, ask questions with page references, compare two versions and listen to any PDF read aloud. Free AI PDF tools, no sign-up.",
    h1: "AI tools for reading and understanding PDFs",
    intro: [
      "Get through long documents faster. Summarize a report, translate a contract into your language, or ask a question and get an answer that points to the page it came from.",
      "The text is read from the PDF on your device. For the AI tools only that text is sent to our AI provider to produce the answer, and nothing is stored. Compare PDF and PDF to Audio don't use AI and work entirely in your browser.",
    ],
    sections: [
      {
        category: "intelligence",
        heading: "Understand, compare and listen",
        blurb: "Tools that read the document for you, check what changed between versions, or read it aloud.",
      },
    ],
    faq: [
      [
        "Can the AI answer questions about a scanned PDF?",
        "Only if the PDF has selectable text. Run OCR PDF on a scan first so there is text to read.",
      ],
      [
        "Is my document used to train AI?",
        "No. Fusion Office sends the text only to generate your answer, summary or translation, and does not store it.",
      ],
    ],
    guides: ["how-to-make-a-scanned-pdf-searchable"],
  },
];

/** The cluster that is the breadcrumb parent of each registry category. */
export const CATEGORY_CLUSTER: Record<Category, ClusterId> = {
  office: "office-tools",
  organize: "pdf-tools",
  optimize: "pdf-tools",
  edit: "pdf-tools",
  security: "pdf-tools",
  "convert-to": "pdf-converter",
  "convert-from": "pdf-converter",
  intelligence: "ai-pdf-tools",
  image: "image-tools",
};

export const clusterById = (id: ClusterId) => CLUSTERS.find((c) => c.id === id)!;
export const clusterOf = (category: Category) => clusterById(CATEGORY_CLUSTER[category]);
/** Where a category's tools are listed: its section on its cluster page. */
export const categoryHref = (category: Category) => `${clusterOf(category).path}#cat-${category}`;
