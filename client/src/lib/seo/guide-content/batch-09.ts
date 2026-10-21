import type { Guide } from "../guides";

/** Scheduled guides 81–90 (23–26 November 2026). */
export const BATCH_09: Guide[] = [
  {
    slug: "fill-pdf-form-and-save",
    title: "How to Fill Out a PDF Form and Save It (Fillable or Not)",
    description: "Fill in a PDF form and save your answers: type into fillable fields, add text to flat forms, sign it, and lock the answers so they can't be changed.",
    h1: "How to fill out a PDF form and save it",
    summary:
      "Open [PDF Forms](/tools/pdf-forms) and choose the form. If it's fillable, every field appears in a list you can complete; download it as is to keep it editable, or with Flatten on to lock the answers. If no fields are found, the form is flat: type on it with Add text in the [PDF editor](/tools/edit-pdf) instead.",
    published: "2026-11-23",
    time: "09:00",
    updated: "2026-11-23",
    cluster: "pdf-tools",
    tools: ["pdf-forms", "edit-pdf", "sign-pdf", "flatten-pdf"],
    sections: [
      {
        heading: "Fillable forms",
        blocks: [
          {
            steps: [
              "Open [PDF Forms](/tools/pdf-forms) and choose the PDF.",
              "Fill in the fields listed on the left: text boxes, checkboxes, radio buttons and dropdowns.",
              "Decide on Flatten: off keeps the fields editable, on turns the answers into ordinary page content.",
              "Download the completed form.",
            ],
          },
          { p: "Some PDF readers don't save typed answers back into the file. Downloading a filled copy makes sure your answers are kept." },
        ],
      },
      {
        heading: "Flat forms",
        blocks: [
          {
            steps: [
              "Open the form in the [PDF editor](/tools/edit-pdf).",
              "Choose Add text, click in each blank, and type. Match the size to the form's text.",
              "Tick boxes by typing an X, or draw a small check with the pen.",
              "Add your signature with [Sign PDF](/tools/sign-pdf) and download.",
            ],
          },
        ],
      },
      {
        heading: "Lock it before sending",
        blocks: [
          { p: "A filled but unflattened form can be changed by whoever receives it. To send a final copy, flatten it in PDF Forms, or run it through [Flatten PDF](/tools/flatten-pdf), which also merges comments and drawings into the page. Keep an unflattened copy for yourself in case you need to change an answer." },
          { p: "On a phone? See [How to fill a government PDF form on your phone](/guides/fill-pdf-form-on-phone)." },
        ],
      },
    ],
    faq: [
      ["Why can't I type in my PDF form?", "It's a flat form without fields, or a scan. Use Add text in the PDF editor to type on top of it."],
      ["Is my form uploaded?", "No. Filling and flattening happen in your browser."],
    ],
  },
  {
    slug: "repair-corrupted-pdf",
    title: "How to Repair a Corrupted PDF That Won't Open",
    description: "Fix a PDF that says it's damaged, won't open or was cut off while downloading. Rebuild its structure and recover the pages that are still readable. Free.",
    h1: "How to repair a corrupted PDF that won't open",
    summary:
      "Open [Repair PDF](/tools/repair-pdf), choose the damaged file and press Repair PDF. It rebuilds the file's structure from whatever can still be read and saves a clean copy. Damaged tables of contents and cut-off downloads are usually fixable; pages whose content is missing from the file can't be recreated.",
    published: "2026-11-23",
    time: "13:00",
    updated: "2026-11-23",
    cluster: "pdf-tools",
    tools: ["repair-pdf", "unlock-pdf", "organize-pdf", "compress-pdf"],
    sections: [
      {
        heading: "Repair step by step",
        blocks: [
          {
            steps: [
              "Open [Repair PDF](/tools/repair-pdf) and choose the PDF.",
              "Press Repair PDF.",
              "Download the rebuilt file and check that the pages you need are there.",
            ],
          },
          { note: "Repair runs in your browser, so the file isn't uploaded." },
        ],
      },
      {
        heading: "Why PDFs break",
        blocks: [
          {
            list: [
              "Interrupted downloads or email attachments that were cut short.",
              "A program crashing while saving.",
              "Copying to a failing USB drive or SD card.",
              "Broken cross-reference tables: the PDF's index of where everything is. The pages are fine, but readers can't find them. This is the most repairable case.",
            ],
          },
        ],
      },
      {
        heading: "If repair doesn't help",
        blocks: [
          {
            list: [
              "Download the file again or ask the sender to resend it: a truncated file is missing data no tool can invent.",
              "Try opening it in a different reader; some are more forgiving.",
              "If the PDF is password-protected, the password is needed to read and repair it; unlock it first with [Unlock PDF](/tools/unlock-pdf).",
              "If only a few pages are bad, remove them in [Organize PDF](/tools/organize-pdf) after repairing.",
            ],
          },
        ],
      },
    ],
    faq: [
      ["Can it recover text from a PDF that shows blank pages?", "If the page content is in the file, rebuilding the structure usually brings it back. If the content is missing, it can't be recovered."],
      ["Does repair change my pages?", "No. It rewrites the file's structure; readable pages keep their content."],
    ],
  },
  {
    slug: "compare-two-pdfs",
    title: "How to Compare Two PDFs and Find the Differences",
    description: "See exactly what changed between two versions of a contract, drawing or report: added and removed text, or highlighted changes on every page. Free and private.",
    h1: "How to compare two PDFs and find the differences",
    summary:
      "Open [Compare PDF](/tools/compare-pdf), choose the original and the new version, and press Compare. Text changes lists added and removed words; Visual highlights changed areas on each page in red, which also works on scans and drawings. Both files stay in your browser.",
    published: "2026-11-23",
    time: "18:00",
    updated: "2026-11-23",
    cluster: "ai-pdf-tools",
    tools: ["compare-pdf", "file-fingerprint", "ocr-pdf"],
    sections: [
      {
        heading: "Compare step by step",
        blocks: [
          {
            steps: [
              "Open [Compare PDF](/tools/compare-pdf) and choose the original PDF and the new version.",
              "Press Compare.",
              "Use Text changes to read additions and deletions, or Visual to see changed areas on each page.",
            ],
          },
          { note: "The comparison runs entirely in your browser, with no AI and no upload, which matters for contracts." },
        ],
      },
      {
        heading: "Which mode to use",
        blocks: [
          {
            list: [
              "Text changes: contracts, policies, reports. Shows exactly which words were added or removed, even if the layout moved.",
              "Visual: drawings, brochures, forms and scans. Shows where anything on the page changed, including images and lines.",
            ],
          },
        ],
      },
      {
        heading: "Tips",
        blocks: [
          {
            list: [
              "Text comparison needs selectable text; for scans, use Visual, or run [OCR PDF](/tools/ocr-pdf) on both first.",
              "If you only need to know whether two files are identical, comparing their SHA-256 hashes with [File fingerprint](/tools/file-fingerprint) is instant.",
              "When reviewing a contract the other side returned, compare it with the version you sent, not an older draft.",
            ],
          },
        ],
      },
    ],
    faq: [
      ["Can I compare a PDF with a Word document?", "Convert the Word file to PDF first, then compare the two PDFs."],
      ["Does it catch formatting changes?", "Visual mode shows any change in how the page looks; Text changes focuses on the words."],
    ],
  },
  {
    slug: "remove-pdf-restrictions",
    title: "How to Print or Copy From a Restricted PDF",
    description: "Some PDFs open fine but block printing, copying or editing. Remove those permission restrictions from documents you're allowed to use. Free, in your browser.",
    h1: "How to print or copy from a restricted PDF",
    summary:
      "If a PDF opens without a password but won't let you print, copy text or edit, it has permission restrictions. Open [Remove restrictions](/tools/remove-restrictions), choose the file and press Remove restrictions: you get a copy that prints and copies normally. If the PDF needs a password just to open, use [Unlock PDF](/tools/unlock-pdf) with that password instead.",
    published: "2026-11-24",
    time: "10:00",
    updated: "2026-11-24",
    cluster: "pdf-tools",
    tools: ["remove-restrictions", "unlock-pdf", "protect-pdf"],
    sections: [
      {
        heading: "Two kinds of PDF protection",
        blocks: [
          {
            list: [
              "Open password: you can't see the document at all without it. Removing it needs the password, with [Unlock PDF](/tools/unlock-pdf).",
              "Permissions (sometimes called an owner password): the document opens, but printing, copying or editing is switched off. That's what Remove restrictions clears.",
            ],
          },
        ],
      },
      {
        heading: "Remove restrictions step by step",
        blocks: [
          {
            steps: [
              "Open [Remove restrictions](/tools/remove-restrictions) and choose the PDF.",
              "Press Remove restrictions.",
              "Download the copy and print or copy as usual.",
            ],
          },
          { note: "The content and layout stay unchanged, and the file is processed in your browser." },
        ],
      },
      {
        heading: "Use it responsibly",
        blocks: [
          { p: "Restrictions are often switched on by default by the software that made the PDF, which is why your own bank or university forms sometimes can't be printed. Use this on documents you have the right to print or quote. For copyrighted books and paid content, the restriction reflects the publisher's terms." },
          { p: "To add your own restrictions to a PDF you send, [Protect PDF](/tools/protect-pdf) lets you set a password and choose whether printing, copying and editing are allowed." },
        ],
      },
    ],
    faq: [
      ["Why is the Print option greyed out in my PDF?", "The PDF has a permission that blocks printing. Remove restrictions saves a copy without it."],
      ["Does this crack passwords?", "No. It only clears permissions on PDFs that already open. PDFs that need a password to open still need that password."],
    ],
  },
  {
    slug: "remove-hidden-data-from-pdf",
    title: "How to Remove Hidden Personal Data From a PDF Before Sharing",
    description: "PDFs can carry author names, software details, comments, attachments and personal numbers you can't see. Find and remove them before you share the file.",
    h1: "How to remove hidden personal data from a PDF before sharing",
    summary:
      "Run the PDF through the [Privacy scanner](/tools/privacy-scanner): it lists personal numbers, hidden properties, comments, attachments and scripts, and can make a cleaned copy. To edit or clear just the title, author and other properties, use [Edit metadata](/tools/edit-metadata). Both work on your device.",
    published: "2026-11-24",
    time: "17:00",
    updated: "2026-11-24",
    cluster: "pdf-tools",
    tools: ["privacy-scanner", "edit-metadata", "auto-redact-pii", "flatten-pdf"],
    sections: [
      {
        heading: "What a PDF can hide",
        blocks: [
          {
            list: [
              "Properties: author name, the software used, and creation and edit dates.",
              "Comments and annotations, including resolved or hidden ones.",
              "Attached files, such as a spreadsheet embedded in a report.",
              "Scripts that run when the file is opened.",
              "Personal numbers in the text: Aadhaar, PAN, card numbers, emails and phone numbers.",
            ],
          },
        ],
      },
      {
        heading: "Scan and clean step by step",
        blocks: [
          {
            steps: [
              "Open the [Privacy scanner](/tools/privacy-scanner) and choose the PDF.",
              "Turn on “Also make a cleaned copy” if you want one.",
              "Press Scan for private data and read the report.",
              "Download the cleaned copy, with findings redacted and properties removed.",
            ],
          },
          { p: "If you just want a proper title instead of “Microsoft Word - final_v3”, or to clear the author name, [Edit metadata](/tools/edit-metadata) changes each property individually." },
        ],
      },
      {
        heading: "Going further",
        blocks: [
          {
            list: [
              "To remove specific personal numbers, see [How to automatically redact phone numbers, emails and PAN](/guides/auto-redact-pdf-personal-data).",
              "To merge comments and form fields into the page and remove scripts, use [Flatten PDF](/tools/flatten-pdf).",
              "Check the result by opening the document properties in your PDF reader.",
            ],
          },
        ],
      },
    ],
    faq: [
      ["Does the scanner upload my document?", "No. The scan and the cleaned copy are made in your browser."],
      ["Will cleaning change how the PDF looks?", "Removing properties doesn't. Redacted findings are blacked out, so check the cleaned copy before sending it."],
    ],
  },
  {
    slug: "pdf-to-powerpoint-slides",
    title: "How to Convert a PDF to PowerPoint Slides",
    description: "Turn each page of a PDF into a PowerPoint slide, with the page text in the speaker notes, so you can present it or add your own slides around it. Free.",
    h1: "How to convert a PDF to PowerPoint slides",
    summary:
      "Open [PDF to PowerPoint](/tools/pdf-to-powerpoint), choose the PDF and press Convert to PowerPoint. Each page becomes a slide showing the page as a crisp image, with the page's text copied into the speaker notes. Open the .pptx in PowerPoint, Google Slides, Keynote or the [PowerPoint editor](/tools/powerpoint-editor).",
    published: "2026-11-25",
    time: "09:00",
    updated: "2026-11-25",
    cluster: "pdf-converter",
    tools: ["pdf-to-powerpoint", "powerpoint-editor", "pdf-to-word", "pdf-to-jpg"],
    sections: [
      {
        heading: "Convert step by step",
        blocks: [
          {
            steps: [
              "Open [PDF to PowerPoint](/tools/pdf-to-powerpoint) and choose the PDF.",
              "Press Convert to PowerPoint.",
              "Download the .pptx and open it in your presentation app.",
            ],
          },
          { note: "The conversion runs in your browser, so the PDF isn't uploaded." },
        ],
      },
      {
        heading: "What you get",
        blocks: [
          {
            list: [
              "One slide per page, looking exactly like the PDF page.",
              "The page text in each slide's notes, so you can copy it or read from it while presenting.",
              "Slide text isn't editable in place, because each page is an image on its slide.",
            ],
          },
        ],
      },
      {
        heading: "When you need editable text",
        blocks: [
          { p: "To rebuild a slide's wording, copy it from the notes into a new text box, or get the whole document as editable text with [PDF to Word](/tools/pdf-to-word). For just a picture of one page to drop into an existing deck, [PDF to JPG](/tools/pdf-to-jpg) is quicker." },
        ],
      },
    ],
    faq: [
      ["Can I add my own slides around the PDF pages?", "Yes. The result is a normal .pptx; insert, reorder and delete slides as usual."],
      ["Does it work with Google Slides?", "Yes. Upload the .pptx to Google Drive and open it with Google Slides."],
    ],
  },
  {
    slug: "split-pdf-by-bookmarks",
    title: "How to Split a PDF Into Chapters Using Its Bookmarks",
    description: "Turn each bookmarked chapter or section of a PDF into its own file, named after the bookmark, for e-books, manuals and bundled court or tender files.",
    h1: "How to split a PDF into chapters using its bookmarks",
    summary:
      "Open [Split by bookmarks](/tools/split-by-bookmarks), choose a PDF that has bookmarks, check the list of sections it will create, and press Split by bookmarks. Each top-level bookmark becomes its own PDF, named after the bookmark, and they download together as a ZIP.",
    published: "2026-11-25",
    time: "13:00",
    updated: "2026-11-25",
    cluster: "pdf-tools",
    tools: ["split-by-bookmarks", "split-pdf", "split-by-text"],
    sections: [
      {
        heading: "Split step by step",
        blocks: [
          {
            steps: [
              "Open [Split by bookmarks](/tools/split-by-bookmarks) and choose the PDF.",
              "Check the list of sections that will become files.",
              "Press Split by bookmarks and download the ZIP.",
            ],
          },
          { note: "The split happens in your browser; the document isn't uploaded." },
        ],
      },
      {
        heading: "Does my PDF have bookmarks?",
        blocks: [
          { p: "Bookmarks are the clickable outline in a PDF reader's sidebar. PDFs exported from Word with headings, most e-books and many manuals and court bundles have them. Scans and PDFs made by printing to PDF usually don't." },
        ],
      },
      {
        heading: "No bookmarks? Other ways to split",
        blocks: [
          {
            list: [
              "By page ranges, such as 1-12, 13-40: [Split PDF](/tools/split-pdf).",
              "Wherever a heading or phrase appears, such as “Chapter”: [Split by text](/tools/split-by-text); see [How to split a PDF wherever a phrase appears](/guides/split-pdf-by-text).",
            ],
          },
        ],
      },
    ],
    faq: [
      ["Does it split sub-chapters too?", "It splits at top-level bookmarks, so each main chapter becomes one file including its sub-sections."],
      ["Are the file names taken from the bookmarks?", "Yes. Each file is named after its bookmark."],
    ],
  },
  {
    slug: "file-sha256-hash",
    title: "How to Get a File's SHA-256 Hash to Prove It Hasn't Changed",
    description: "Calculate a file's SHA-256, SHA-1 or MD5 fingerprint to prove a document is unchanged or check a download against its published checksum. Free, on your device.",
    h1: "How to get a file's SHA-256 hash to prove it hasn't changed",
    summary:
      "Open [File fingerprint](/tools/file-fingerprint), choose the file, and press Generate fingerprints. You get its SHA-256, SHA-1 and MD5 hashes: short codes that change completely if even one byte of the file changes. Record the SHA-256 of an important document, and check it again later to prove the file is identical.",
    published: "2026-11-25",
    time: "18:00",
    updated: "2026-11-25",
    cluster: "pdf-tools",
    tools: ["file-fingerprint", "compare-pdf", "protect-pdf"],
    sections: [
      {
        heading: "Get the hash step by step",
        blocks: [
          {
            steps: [
              "Open [File fingerprint](/tools/file-fingerprint) and choose one or more files of any type.",
              "Press Generate fingerprints.",
              "Copy the SHA-256 value, or compare it with one you were given.",
            ],
          },
          { note: "The hash is calculated on your device, so the file never leaves it." },
        ],
      },
      {
        heading: "What hashes are good for",
        blocks: [
          {
            list: [
              "Proving a signed contract, evidence file or submission hasn't been altered since a given date: note its SHA-256 at the time, along with the date.",
              "Checking a software download against the checksum the publisher lists.",
              "Confirming two files are exactly identical without opening them.",
            ],
          },
          { p: "SHA-256 is the one to use for proof. MD5 and SHA-1 are older and only suitable for spotting accidental changes." },
        ],
      },
      {
        heading: "What a hash can't tell you",
        blocks: [
          { p: "A different hash says the files differ, not how. To see what changed between two PDF versions, use [Compare PDF](/tools/compare-pdf). And a hash doesn't hide anything; to keep a file private, encrypt it with [Protect PDF](/tools/protect-pdf)." },
        ],
      },
    ],
    faq: [
      ["Will renaming a file change its hash?", "No. The hash depends only on the file's contents, not its name."],
      ["Will opening and re-saving a PDF change its hash?", "Usually yes, because the program rewrites the file even if it looks the same."],
    ],
  },
  {
    slug: "stamp-paid-copy-draft-on-pdf",
    title: "How to Stamp “PAID”, “COPY” or “DRAFT” on a PDF",
    description: "Add a PAID, COPY, DRAFT or CONFIDENTIAL stamp to invoices and documents, in red and in any corner or across the page, on all pages or just some. Free.",
    h1: "How to stamp “PAID”, “COPY” or “DRAFT” on a PDF",
    summary:
      "Open [Watermark PDF](/tools/watermark-pdf), choose the file, pick Text and type PAID, COPY or DRAFT. Choose a bold size and red colour, set the transparency, pick 45° across the page or a corner position, and press Add watermark. To stamp only certain pages, select them before applying.",
    published: "2026-11-26",
    time: "10:00",
    updated: "2026-11-26",
    cluster: "pdf-tools",
    tools: ["watermark-pdf", "header-footer", "remove-watermark"],
    sections: [
      {
        heading: "Stamp step by step",
        blocks: [
          {
            steps: [
              "Open [Watermark PDF](/tools/watermark-pdf) and choose one or more PDFs.",
              "Pick Text and type the stamp: PAID, COPY, DRAFT, DUPLICATE or CONFIDENTIAL.",
              "Choose the font size and colour (red or green for PAID, grey for DRAFT).",
              "Set transparency and rotation: 45° across the page for DRAFT, 0° in the top right corner for PAID.",
              "Choose all pages or just some, press Add watermark and download.",
            ],
          },
          { note: "Stamping runs in your browser. Several PDFs can be stamped at once." },
        ],
      },
      {
        heading: "Stamp ideas",
        blocks: [
          {
            list: [
              "Invoices: “PAID – 26/11/2026” in the top right corner.",
              "Duplicate invoices: “DUPLICATE FOR TRANSPORTER” or “COPY”.",
              "Work in progress: a large, faint DRAFT diagonally across every page.",
              "Shared reports: CONFIDENTIAL tiled lightly across the page.",
            ],
          },
          { p: "You can also stamp an image, such as a scanned company seal, by choosing Image instead of Text. For a line of text at the top or bottom of every page, [Header and footer](/tools/header-footer) is tidier." },
        ],
      },
      {
        heading: "Removing a stamp later",
        blocks: [
          { p: "Keep the unstamped original. If you only have the stamped file and need to remove your own DRAFT mark, see [How to remove a watermark from a PDF](/guides/remove-watermark-from-pdf)." },
        ],
      },
    ],
    faq: [
      ["Can I stamp only the first page?", "Yes. Choose the pages to apply it to before pressing Add watermark."],
      ["Will the stamp hide the text underneath?", "Set transparency so the text stays readable through it."],
    ],
  },
  {
    slug: "epub-to-pdf",
    title: "How to Convert an EPUB Ebook to PDF",
    description: "Convert EPUB e-books, plain text and HTML files into PDFs that print well and open on any device. Free online EPUB to PDF converter, no sign-up.",
    h1: "How to convert an EPUB e-book to PDF",
    summary:
      "Open [EPUB to PDF](/tools/ebook-to-pdf), choose one or more .epub, .txt or .html files and press Convert to PDF. Chapters, headings and images from the e-book are laid out as fixed pages, ready to print or read on devices that don't open EPUB. DRM-protected e-books can't be converted.",
    published: "2026-11-26",
    time: "17:00",
    updated: "2026-11-26",
    cluster: "pdf-converter",
    tools: ["ebook-to-pdf", "pdf-to-epub", "pages-per-sheet", "compress-pdf"],
    sections: [
      {
        heading: "Convert step by step",
        blocks: [
          {
            steps: [
              "Open [EPUB to PDF](/tools/ebook-to-pdf) and choose the file.",
              "Press Convert to PDF.",
              "Download the PDF.",
            ],
          },
          { p: "E-books are converted on our server and the file is deleted as soon as the PDF is ready." },
        ],
      },
      {
        heading: "EPUB versus PDF",
        blocks: [
          { p: "EPUB text reflows to fit any screen and font size, which is ideal on phones and e-readers. PDF has fixed pages, which is better for printing, annotating, citing page numbers and devices or apps that only read PDF. Convert to PDF when you need those; keep the EPUB for comfortable reading." },
        ],
      },
      {
        heading: "Limits and tips",
        blocks: [
          {
            list: [
              "DRM-protected e-books bought from stores can't be converted.",
              "To print a long book cheaply, put 2 pages on each sheet with [Pages per sheet](/tools/pages-per-sheet).",
              "Image-heavy books can make large PDFs; shrink them with [Compress PDF](/tools/compress-pdf).",
              "To go the other way, [PDF to EPUB](/tools/pdf-to-epub) makes a reflowable e-book from a PDF.",
            ],
          },
        ],
      },
    ],
    faq: [
      ["Can I convert a Kindle book?", "Not one with DRM. Only DRM-free EPUB, text and HTML files can be converted."],
      ["Will the PDF keep the e-book's images?", "Yes, images in the EPUB are included in the PDF."],
    ],
  },
];
