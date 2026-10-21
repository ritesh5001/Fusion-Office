import type { Guide } from "../guides";

/** Scheduled guides 71–80 (19–22 November 2026). */
export const BATCH_08: Guide[] = [
  {
    slug: "split-scanned-book-pdf-in-half",
    title: "How to Split a Scanned Book PDF in Half (Two Pages per Scan)",
    description: "Turn a PDF of two-page book spreads into single pages by cutting every page down the middle, including right-to-left books. Free, in your browser.",
    h1: "How to split a scanned book PDF in half",
    summary:
      "Open [Split PDF in half](/tools/split-in-half), choose the scanned PDF, pick Down the middle, and press Split pages in half. Each spread becomes two pages in reading order. For Arabic, Urdu or Hebrew books, turn on Right half first. Trim leftover margins afterwards with [Crop PDF](/tools/crop-pdf).",
    published: "2026-11-19",
    time: "09:00",
    updated: "2026-11-19",
    cluster: "pdf-tools",
    tools: ["split-in-half", "crop-pdf", "organize-pdf", "ocr-pdf"],
    sections: [
      {
        heading: "Split step by step",
        blocks: [
          {
            steps: [
              "Open [Split PDF in half](/tools/split-in-half) and choose the scanned PDF.",
              "Choose to cut down the middle (book spreads) or across the middle (two pages stacked).",
              "For right-to-left books, turn on Right half first.",
              "Press Split pages in half and download.",
            ],
          },
          { note: "The PDF is processed in your browser, and any existing text in it stays selectable." },
        ],
      },
      {
        heading: "Clean up the result",
        blocks: [
          {
            list: [
              "The cover and back cover are often single pages in the scan. After splitting they become a page plus a blank half; remove the blanks with [Organize PDF](/tools/organize-pdf).",
              "If the book wasn't centred on the scanner, some pages keep a strip of the facing page; trim it with [Crop PDF](/tools/crop-pdf), applied to odd or even pages.",
              "To search or copy the text, run [OCR PDF](/tools/ocr-pdf) on the split file.",
            ],
          },
        ],
      },
      {
        heading: "Why split at all",
        blocks: [
          { p: "Two-page spreads are awkward on phones and e-readers: the text is tiny and you have to zoom and pan. Single pages fill the screen, print properly on A4, and convert better to other formats." },
        ],
      },
    ],
    faq: [
      ["Will splitting lower the quality?", "No. Each half shows the original image; nothing is re-compressed."],
      ["Can I split A3 scans into A4 pages?", "Yes. An A3 page cut down the middle gives two A4-sized pages."],
    ],
  },
  {
    slug: "summarize-pdf-with-ai",
    title: "How to Summarize a Long PDF (Research Paper or Chapter) With AI",
    description: "Get the key points of a long PDF in a short, medium or detailed summary, then check them against the document. Free AI summarizer, no sign-up.",
    h1: "How to summarize a long PDF with AI",
    summary:
      "Open [Summarize PDF](/tools/summarize-pdf), choose a PDF with selectable text, pick Short, Medium or Long, and press Summarize. You get the main points in seconds, which you can copy or download. AI summaries can miss nuance, so check important details in the document, or ask follow-up questions with [Chat with PDF](/tools/chat-with-pdf).",
    published: "2026-11-19",
    time: "13:00",
    updated: "2026-11-19",
    cluster: "ai-pdf-tools",
    tools: ["summarize-pdf", "chat-with-pdf", "split-pdf", "ocr-pdf"],
    sections: [
      {
        heading: "Summarize step by step",
        blocks: [
          {
            steps: [
              "Open [Summarize PDF](/tools/summarize-pdf) and choose the PDF.",
              "Pick the length: Short for the gist, Medium for main arguments, Long for section-by-section detail.",
              "Press Summarize.",
              "Copy the summary or download it.",
            ],
          },
          { note: "The text is read from the PDF on your device; only that text is sent to our AI provider, and nothing is stored." },
        ],
      },
      {
        heading: "Better summaries of long documents",
        blocks: [
          {
            list: [
              "For a textbook or report with many chapters, extract one chapter with [Split PDF](/tools/split-pdf) and summarize it alone: you get more detail per section.",
              "For research papers, a Medium summary covers the question, method, results and conclusion.",
              "Scanned PDFs need [OCR PDF](/tools/ocr-pdf) first.",
            ],
          },
        ],
      },
      {
        heading: "Use summaries carefully",
        blocks: [
          { p: "A summary helps you decide what to read and revise faster; it doesn't replace reading for exams, citations or decisions. AI can misstate numbers or miss caveats. To check a point, ask [Chat with PDF](/tools/chat-with-pdf), which answers with the page numbers it used." },
        ],
      },
    ],
    faq: [
      ["Is my document stored?", "No. Only the text is sent to the AI provider to write the summary, and nothing is kept afterwards."],
      ["How long can the PDF be?", "Long documents work, but summaries of a chapter or section at a time are more detailed and easier to check."],
    ],
  },
  {
    slug: "word-to-pdf-keep-formatting",
    title: "How to Convert Word to PDF Without Losing Formatting",
    description: "Convert DOC and DOCX files to PDF so fonts, tables, images and page breaks stay exactly where you put them, and fix the usual causes of shifted layouts.",
    h1: "How to convert Word to PDF without losing formatting",
    summary:
      "Open [Word to PDF](/tools/word-to-pdf), choose one or more .docx, .doc, .odt or .rtf files and press Convert to PDF. The layout, tables, images, headers and footers carry over. If the result looks different from Word, the usual cause is a font that isn't embedded in the document; embed fonts in Word or use common ones.",
    published: "2026-11-19",
    time: "18:00",
    updated: "2026-11-19",
    cluster: "pdf-converter",
    tools: ["word-to-pdf", "word-editor", "compress-pdf", "merge-pdf"],
    sections: [
      {
        heading: "Convert step by step",
        blocks: [
          {
            steps: [
              "Open [Word to PDF](/tools/word-to-pdf) and choose your documents.",
              "Press Convert to PDF.",
              "Download the PDF, or a ZIP if you converted several.",
              "Open the PDF and check page breaks, tables and images.",
            ],
          },
          { p: "Word documents are converted on our server, which runs office software, and the file is deleted as soon as the PDF is ready." },
        ],
      },
      {
        heading: "Why layouts shift, and how to stop it",
        blocks: [
          {
            list: [
              "Missing fonts: if the document uses a font that isn't embedded, a similar font is used and lines can wrap differently. In Word, turn on File → Options → Save → Embed fonts in the file before converting, or stick to common fonts such as Arial, Calibri or Times New Roman.",
              "Manual spacing: pages pushed down with many empty lines move when fonts change. Use page breaks instead.",
              "Floating images and text boxes: anchor them to paragraphs, or place images in line with text.",
            ],
          },
        ],
      },
      {
        heading: "After converting",
        blocks: [
          { p: "Combine the PDF with others using [Merge PDF](/tools/merge-pdf), or shrink an image-heavy one with [Compress PDF](/tools/compress-pdf). If you don't have Word, the [Word editor](/tools/word-editor) opens .docx files in the browser and downloads them as PDF too." },
        ],
      },
    ],
    faq: [
      ["Will hyperlinks still work in the PDF?", "Yes, links in the Word document remain clickable in the PDF."],
      ["Can I convert several Word files at once?", "Yes. Choose them all; they download together as a ZIP."],
    ],
  },
  {
    slug: "fill-pdf-form-on-phone",
    title: "How to Fill a Government PDF Form on Your Phone",
    description: "Fill a PDF form on your phone without printing it: type into real form fields, or add text to a flat form, then sign and send it. No app to install.",
    h1: "How to fill a government PDF form on your phone",
    summary:
      "Open [PDF Forms](/tools/pdf-forms) in your phone's browser and choose the form. If it has real fields, they're listed as a simple form you can type into; turn on Flatten and download. If nothing is listed, the form is flat: type on it with Add text in the [PDF editor](/tools/edit-pdf), which works on phones but is easier on a larger screen.",
    published: "2026-11-20",
    time: "10:00",
    updated: "2026-11-20",
    cluster: "pdf-tools",
    tools: ["pdf-forms", "edit-pdf", "sign-pdf", "scan-to-pdf"],
    sections: [
      {
        heading: "Forms with fillable fields",
        blocks: [
          {
            steps: [
              "Download the form to your phone and open [PDF Forms](/tools/pdf-forms).",
              "Choose the form. Every field (text boxes, checkboxes, options) appears in a list.",
              "Fill them in. Your phone's keyboard and autofill work as usual.",
              "Turn on Flatten if the answers should be locked, and download.",
            ],
          },
        ],
      },
      {
        heading: "Flat forms with no fields",
        blocks: [
          {
            steps: [
              "Open the form in the [PDF editor](/tools/edit-pdf).",
              "Choose Add text and tap where each answer goes; zoom in for accuracy.",
              "Set a small size (around 10 pt) and tick boxes by typing an X.",
              "Add your signature with [Sign PDF](/tools/sign-pdf) if needed, then download.",
            ],
          },
          { p: "Long flat forms are fiddly on a small screen. If you have a printer, printing, filling by hand and scanning with [Scan to PDF](/tools/scan-to-pdf) may be quicker." },
        ],
      },
      {
        heading: "Before you send it",
        blocks: [
          {
            list: [
              "Open the downloaded PDF and zoom in to check every answer sits in its box.",
              "Check whether the office needs a wet signature, photo or attested copies; some forms must still be submitted on paper.",
              "Name the file clearly and keep a copy.",
            ],
          },
          { note: "Filling and signing happen in your browser. The form and your answers stay on your phone." },
        ],
      },
    ],
    faq: [
      ["How do I know if a form is fillable?", "Open it in PDF Forms. If fields are listed, it's fillable; if not, it's flat."],
      ["Can I save a half-filled form and finish later?", "Download it without flattening; you can open it again in PDF Forms and continue."],
    ],
  },
  {
    slug: "interleave-odd-even-pages",
    title: "How to Put Odd and Even Pages in Order After Double-Sided Scanning",
    description: "Scanned all the fronts, then all the backs? Interleave the two PDFs into one document in the right order, even when the backs came out in reverse. Free.",
    h1: "How to put odd and even pages in order after double-sided scanning",
    summary:
      "Open [Alternate & Mix](/tools/alternate-mix), add the PDF of front sides first and the PDF of back sides second, turn on Reverse the second file if the backs were scanned last page first, and press Mix pages. You get one document with pages 1, 2, 3, 4… in order.",
    published: "2026-11-20",
    time: "17:00",
    updated: "2026-11-20",
    cluster: "pdf-tools",
    tools: ["alternate-mix", "organize-pdf", "split-pdf", "rotate-pdf"],
    sections: [
      {
        heading: "Why this happens",
        blocks: [
          { p: "Scanners without duplex scan one side at a time. You feed the stack once for the fronts (pages 1, 3, 5…), flip it, and feed it again for the backs. Flipping the stack usually reverses the order, so the backs come out as 10, 8, 6…" },
        ],
      },
      {
        heading: "Interleave step by step",
        blocks: [
          {
            steps: [
              "Open [Alternate & Mix](/tools/alternate-mix).",
              "Add the fronts PDF first, then the backs PDF.",
              "If the backs file starts with the last page, turn on Reverse the second file.",
              "Press Mix pages and download.",
              "Check the result: page 2 should follow page 1.",
            ],
          },
          { p: "If both sides are in one PDF (all fronts, then all backs), split it in the middle first with [Split PDF](/tools/split-pdf) using page ranges." },
        ],
      },
      {
        heading: "Fixing the leftovers",
        blocks: [
          {
            list: [
              "Back sides scanned upside down: rotate them with [Rotate PDF](/tools/rotate-pdf), listing the even pages.",
              "Blank backs: delete them in [Organize PDF](/tools/organize-pdf).",
            ],
          },
        ],
      },
    ],
    faq: [
      ["What if I have three files to mix?", "Alternate & Mix takes one page from each file in turn, so it works with any number of files."],
      ["Does mixing reduce quality?", "No. Pages are copied as they are."],
    ],
  },
  {
    slug: "chat-with-pdf-revise",
    title: "How to Chat With a PDF to Revise for Exams",
    description: "Ask questions about your notes, textbook chapters and papers in plain words, get answers with page numbers, and quiz yourself. Free, no sign-up.",
    h1: "How to chat with a PDF to revise for exams",
    summary:
      "Open [Chat with PDF](/tools/chat-with-pdf), choose your notes or a chapter, and ask questions in your own words, such as “Explain the causes of the 1857 revolt” or “Give me 5 practice questions on this chapter”. Each answer cites the pages it came from, so you can check it against your material.",
    published: "2026-11-21",
    time: "09:00",
    updated: "2026-11-21",
    cluster: "ai-pdf-tools",
    tools: ["chat-with-pdf", "summarize-pdf", "split-pdf", "ocr-pdf"],
    sections: [
      {
        heading: "Start a revision chat",
        blocks: [
          {
            steps: [
              "Open [Chat with PDF](/tools/chat-with-pdf) and choose a PDF with selectable text.",
              "Pick a suggested question, or type your own.",
              "Read the answer and open the cited pages to check it.",
              "Ask follow-up questions; the chat remembers the conversation.",
            ],
          },
          { note: "The text is read from the PDF on your device; only that text is sent to our AI provider to answer, and nothing is stored." },
        ],
      },
      {
        heading: "Questions that work well",
        blocks: [
          {
            list: [
              "“Explain [topic] simply, then in exam-answer style.”",
              "“List the key definitions in this chapter.”",
              "“Give me 10 multiple-choice questions with answers.”",
              "“What are the differences between X and Y?”",
              "“Which pages cover [topic]?”",
            ],
          },
          { p: "For a whole book, extract one chapter at a time with [Split PDF](/tools/split-pdf): answers stay focused. For a quick overview first, use [Summarize PDF](/tools/summarize-pdf)." },
        ],
      },
      {
        heading: "Use it as a study partner, not a source",
        blocks: [
          { p: "AI answers can be wrong or oversimplified. Always check facts, dates and formulas on the cited pages, and practise writing answers yourself. Scanned notes need [OCR PDF](/tools/ocr-pdf) before the chat can read them, and handwritten notes may not be recognised well." },
        ],
      },
    ],
    faq: [
      ["Can I upload handwritten notes?", "Only if the text can be recognised. Run OCR PDF first; clear printed text works much better than handwriting."],
      ["Does it remember my previous chats?", "Within a session it keeps the conversation's context; nothing is stored afterwards."],
    ],
  },
  {
    slug: "excel-to-pdf-fit-columns",
    title: "How to Convert Excel to PDF and Fit Every Column on the Page",
    description: "Stop Excel sheets splitting across pages when converted to PDF: set the print area, landscape and fit-to-width in Excel, then convert. Free online converter.",
    h1: "How to convert Excel to PDF and fit every column on the page",
    summary:
      "[Excel to PDF](/tools/excel-to-pdf) uses the print area and page setup saved in your workbook, so wide sheets split across pages the way Excel would print them. To keep every column on one page, set the sheet to Landscape and Fit All Columns on One Page in Excel's page setup, save, then convert.",
    published: "2026-11-21",
    time: "13:00",
    updated: "2026-11-21",
    cluster: "pdf-converter",
    tools: ["excel-to-pdf", "csv-to-pdf", "excel-editor", "merge-pdf"],
    sections: [
      {
        heading: "Set up the sheet in Excel",
        blocks: [
          {
            steps: [
              "Select the cells to print and choose Page Layout → Print Area → Set Print Area.",
              "Set Orientation to Landscape for wide tables.",
              "Under Page Layout → Scale to Fit, set Width to 1 page and Height to Automatic (or choose Fit All Columns on One Page in the print settings).",
              "Optionally repeat the header row on each page: Page Layout → Print Titles → Rows to repeat at top.",
              "Save the workbook.",
            ],
          },
        ],
      },
      {
        heading: "Convert",
        blocks: [
          {
            steps: [
              "Open [Excel to PDF](/tools/excel-to-pdf) and choose the .xlsx, .xls, .ods or .csv file.",
              "Press Convert to PDF.",
              "Download and check that every column is on the page.",
            ],
          },
          { p: "Every sheet in the workbook is converted. The file is converted on our server and deleted as soon as the PDF is ready." },
        ],
      },
      {
        heading: "Simple tables without Excel",
        blocks: [
          { p: "For a plain table, [CSV to PDF](/tools/csv-to-pdf) with Landscape on gives a clean, printable table with the header row repeated on every page, without any page setup. Very wide sheets with dozens of columns may still be too small to read on one page; split them into two tables instead." },
        ],
      },
    ],
    faq: [
      ["Why is my PDF blank or missing sheets?", "Check the print area: an old print area may cover only part of the sheet. Clear it in Page Layout → Print Area → Clear Print Area."],
      ["Can I convert just one sheet?", "Save a copy of the workbook with only that sheet, or convert the whole file and delete the other pages afterwards."],
    ],
  },
  {
    slug: "add-page-numbers-to-pdf",
    title: "How to Add Page Numbers to a PDF (Page 1 of N, Any Position)",
    description: "Number PDF pages as 1, Page 1 or Page 1 of N, in any corner or centre, starting from any number and skipping cover pages. Free, in your browser.",
    h1: "How to add page numbers to a PDF",
    summary:
      "Open [Add page numbers](/tools/page-numbers), choose the PDF, pick a format such as “Page 1 of N” and a position, set the first number and which pages to number, and press Add page numbers. You can start at any number and skip pages such as a cover, so the numbering matches a printed document.",
    published: "2026-11-21",
    time: "18:00",
    updated: "2026-11-21",
    cluster: "pdf-tools",
    tools: ["page-numbers", "header-footer", "bates-numbering", "merge-pdf"],
    sections: [
      {
        heading: "Add numbers step by step",
        blocks: [
          {
            steps: [
              "Open [Add page numbers](/tools/page-numbers) and choose the PDF.",
              "Pick a format: 1, Page 1, Page 1 of N, 1 / N and more.",
              "Pick one of nine positions; bottom centre and bottom right are the most common.",
              "Set the first number, the size, margin and colour, and the pages to number.",
              "Press Add page numbers and download.",
            ],
          },
          { note: "Numbering runs in your browser, so the document isn't uploaded." },
        ],
      },
      {
        heading: "Common setups",
        blocks: [
          {
            list: [
              "Thesis or report with a cover page: number from page 2, starting at 1.",
              "Merged documents: merge first with [Merge PDF](/tools/merge-pdf), then number the whole file.",
              "Submissions and court bundles: “Page X of Y” shows nothing is missing.",
            ],
          },
        ],
      },
      {
        heading: "Other kinds of numbering",
        blocks: [
          { p: "For a title, company name or date alongside the number on every page, use [Header and footer](/tools/header-footer). For legal productions that need unique IDs like ABC-000123 across several files, see [How to add Bates numbers](/guides/bates-numbering-pdf)." },
        ],
      },
    ],
    faq: [
      ["Can I skip the first two pages?", "Yes. Choose which pages to number, and set the starting number to 1 if the third page should be page 1."],
      ["Will the numbers cover existing text?", "Pick a position and margin where the page is blank; a larger margin moves numbers further from the edge."],
    ],
  },
  {
    slug: "print-multiple-pages-per-sheet",
    title: "How to Print 2, 4 or 6 PDF Pages on One Sheet to Save Paper",
    description: "Put 2, 4, 6, 9 or 16 PDF pages on each sheet, like a printer's pages-per-sheet setting, saved as a PDF you can print anywhere. Ideal for slides and notes.",
    h1: "How to print 2, 4 or 6 PDF pages on one sheet",
    summary:
      "Open [Pages per sheet](/tools/pages-per-sheet), choose the PDF, pick 2, 4, 6, 9 or 16 pages per sheet, choose A4 or Letter, the reading order and borders, and press Combine pages. You get a new PDF with several pages on each sheet, ready to print anywhere, even on printers without a pages-per-sheet option.",
    published: "2026-11-22",
    time: "10:00",
    updated: "2026-11-22",
    cluster: "pdf-tools",
    tools: ["pages-per-sheet", "invert-colours", "page-numbers"],
    sections: [
      {
        heading: "Combine step by step",
        blocks: [
          {
            steps: [
              "Open [Pages per sheet](/tools/pages-per-sheet) and choose the PDF.",
              "Pick how many pages per sheet: 2, 4, 6, 9 or 16.",
              "Choose the sheet size (A4, Letter or original), the order (across then down, or down then across) and whether to draw borders.",
              "Press Combine pages, download and print.",
            ],
          },
        ],
      },
      {
        heading: "What to choose",
        blocks: [
          {
            list: [
              "Lecture slides: 4 or 6 per sheet stays readable; 9 is for quick reference.",
              "Text documents: 2 per sheet is comfortable to read; 4 needs good eyesight.",
              "Turn on borders for slides, so each one is clearly separated.",
            ],
          },
          { p: "To save ink as well as paper, make a grayscale copy first with [Invert colours](/tools/invert-colours) and its Grayscale style. If the original pages have no numbers, add them first with [Add page numbers](/tools/page-numbers) so you can find your place." },
        ],
      },
    ],
    faq: [
      ["Why not use my printer's setting?", "That works for printing once. A combined PDF can be shared, printed anywhere and at a print shop, and looks the same every time."],
      ["Is the text still sharp?", "Yes. Pages are scaled down as vectors, so text stays crisp, just smaller."],
    ],
  },
  {
    slug: "split-pdf-by-text",
    title: "How to Split a PDF Wherever a Phrase Appears (Invoices, Payslips)",
    description: "Split a big PDF of invoices, payslips or statements into one file per document, starting a new file every time a page contains a phrase like “Invoice No.”.",
    h1: "How to split a PDF wherever a phrase appears",
    summary:
      "Open [Split by text](/tools/split-by-text), choose the PDF, type a phrase that appears on the first page of each document (such as “Invoice No.” or “Pay Slip for”), and press Split by text. Every page containing the phrase starts a new file, and they all download together as a ZIP.",
    published: "2026-11-22",
    time: "17:00",
    updated: "2026-11-22",
    cluster: "pdf-tools",
    tools: ["split-by-text", "split-pdf", "split-by-bookmarks", "ocr-pdf"],
    sections: [
      {
        heading: "Split step by step",
        blocks: [
          {
            steps: [
              "Open [Split by text](/tools/split-by-text) and choose the PDF.",
              "Type the phrase that appears only on each document's first page.",
              "Press Split by text and download the ZIP.",
              "Open a few files to check each starts in the right place.",
            ],
          },
          { note: "The PDF is split in your browser, so invoices and payslips aren't uploaded." },
        ],
      },
      {
        heading: "Choosing the phrase",
        blocks: [
          {
            list: [
              "Pick text that appears once per document, on its first page: “Invoice No.”, “Tax Invoice”, “Pay Slip for the month of”, “Statement of Account”.",
              "Avoid text that repeats on every page, such as a company name in the header.",
              "Pages before the first match are kept as their own file, which is handy for a cover sheet.",
            ],
          },
        ],
      },
      {
        heading: "Other ways to split",
        blocks: [
          {
            list: [
              "Fixed page counts or ranges: [Split PDF](/tools/split-pdf).",
              "PDFs with bookmarks: [Split by bookmarks](/tools/split-by-bookmarks), one file per chapter.",
              "Scanned batches: run [OCR PDF](/tools/ocr-pdf) first so the phrase can be found.",
            ],
          },
        ],
      },
    ],
    faq: [
      ["Is the phrase case-sensitive?", "Type it as it appears in the documents to be safe, then check the first few files."],
      ["Can I name the files after the invoice number?", "Files are numbered in order. Rename the important ones after downloading."],
    ],
  },
];
