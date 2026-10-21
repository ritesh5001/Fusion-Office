import type { Guide } from "../guides";

/** Scheduled guides 91–100 (27–30 November 2026). */
export const BATCH_10: Guide[] = [
  {
    slug: "crop-photo-square-profile-picture",
    title: "How to Crop a Photo to a Square for a Profile Picture",
    description: "Crop any photo to a perfect square for WhatsApp, Instagram, LinkedIn or a website profile, with your face centred, then resize it. Free, in your browser.",
    h1: "How to crop a photo to a square for a profile picture",
    summary:
      "Open [Crop image](/tools/crop-image), pick the Square ratio, drag the frame so your face sits in the middle with a little space around it, and save. Most apps then show it in a circle, so keep your face away from the corners. If the app wants a specific size, [Resize image](/tools/resize-image) has a Square 1080 preset.",
    published: "2026-11-27",
    time: "09:00",
    updated: "2026-11-27",
    cluster: "image-tools",
    tools: ["crop-image", "resize-image", "image-editor", "compress-image"],
    sections: [
      {
        heading: "Crop step by step",
        blocks: [
          {
            steps: [
              "Open [Crop image](/tools/crop-image) and choose the photo.",
              "Pick Square as the ratio.",
              "Drag and resize the frame so your face is centred, with your shoulders just in view.",
              "Straighten the photo if it's tilted, then save.",
            ],
          },
          { note: "The photo is cropped on your device; it isn't uploaded." },
        ],
      },
      {
        heading: "Make it look good in a circle",
        blocks: [
          {
            list: [
              "Leave space around your head: WhatsApp, Instagram, LinkedIn and others crop profile photos to a circle.",
              "A plain or blurred background keeps attention on your face.",
              "Brighten a dim photo and add a little warmth in the [Image editor](/tools/image-editor).",
            ],
          },
        ],
      },
      {
        heading: "Size and file",
        blocks: [
          { p: "1080 × 1080 pixels suits every major app; [Resize image](/tools/resize-image) has a Square 1080 preset. For a website or email signature, a smaller file loads faster: [Compress image](/tools/compress-image) brings it down to a few dozen KB." },
        ],
      },
    ],
    faq: [
      ["What size should a profile picture be?", "1080 × 1080 pixels works everywhere. Apps scale it down for display."],
      ["Why does my photo look cut off after uploading?", "Apps show profile photos in a circle. Crop with more space around your face."],
    ],
  },
  {
    slug: "powerpoint-to-pdf",
    title: "How to Convert PowerPoint to PDF (PPT and PPTX)",
    description: "Turn PowerPoint slides into a PDF with one slide per page for sharing, printing or uploading, and make handouts with several slides per sheet. Free online.",
    h1: "How to convert PowerPoint to PDF",
    summary:
      "Open [PowerPoint to PDF](/tools/powerpoint-to-pdf), choose your .pptx, .ppt or .odp files and press Convert to PDF. Each slide becomes one page at slide size, which anyone can open without PowerPoint. For printed handouts, put several slides on each sheet with [Pages per sheet](/tools/pages-per-sheet).",
    published: "2026-11-27",
    time: "13:00",
    updated: "2026-11-27",
    cluster: "pdf-converter",
    tools: ["powerpoint-to-pdf", "pages-per-sheet", "compress-pdf", "powerpoint-editor"],
    sections: [
      {
        heading: "Convert step by step",
        blocks: [
          {
            steps: [
              "Open [PowerPoint to PDF](/tools/powerpoint-to-pdf) and choose one or more presentations.",
              "Press Convert to PDF.",
              "Download the PDF, or a ZIP for several files.",
            ],
          },
          { p: "Presentations are converted on our server, which runs office software, and deleted as soon as the PDF is ready." },
        ],
      },
      {
        heading: "What changes in the PDF",
        blocks: [
          {
            list: [
              "Animations and transitions aren't kept: each slide appears in its final state.",
              "Embedded videos and audio don't play in a PDF.",
              "Fonts that aren't embedded in the presentation may be replaced with similar ones; embed fonts in PowerPoint's save options for an exact match.",
            ],
          },
        ],
      },
      {
        heading: "After converting",
        blocks: [
          {
            list: [
              "Handouts: [Pages per sheet](/tools/pages-per-sheet) with 4 or 6 slides per A4 page.",
              "Too big to email: [Compress PDF](/tools/compress-pdf) shrinks photo-heavy decks a lot.",
              "No PowerPoint to make last-minute changes? The [PowerPoint editor](/tools/powerpoint-editor) opens .pptx files in the browser.",
            ],
          },
        ],
      },
    ],
    faq: [
      ["Will my speaker notes be included?", "No. The PDF shows the slides only."],
      ["Can I convert several presentations at once?", "Yes. Choose them together; they download as a ZIP."],
    ],
  },
  {
    slug: "crop-pdf-margins",
    title: "How to Crop PDF Margins or Keep Just Part of a Page",
    description: "Trim wide white margins so PDFs read better on phones and tablets, or crop every page to an area you draw. All pages or just some. Free, in your browser.",
    h1: "How to crop PDF margins",
    summary:
      "Open [Crop PDF](/tools/crop-pdf), choose the file, drag the crop box on the page preview (or pick a quick margin preset), choose which pages to apply it to, and save. Wide margins disappear, so text fills more of a phone or tablet screen. Cropping hides the area outside the box rather than deleting it.",
    published: "2026-11-27",
    time: "18:00",
    updated: "2026-11-27",
    cluster: "pdf-tools",
    tools: ["crop-pdf", "split-in-half", "redact-pdf"],
    sections: [
      {
        heading: "Crop step by step",
        blocks: [
          {
            steps: [
              "Open [Crop PDF](/tools/crop-pdf) and choose the PDF.",
              "Drag the crop box on the preview, or pick a quick margin preset.",
              "Choose whether the crop applies to all pages or only some.",
              "Save and download the cropped PDF.",
            ],
          },
          { note: "Cropping runs in your browser, and text stays selectable." },
        ],
      },
      {
        heading: "Good uses",
        blocks: [
          {
            list: [
              "Academic papers and books with wide margins, for comfortable reading on a tablet.",
              "Cutting a ticket, receipt or ID card out of a full-page scan.",
              "Removing a strip of the facing page from book scans; for two-page spreads, see [How to split a scanned book PDF in half](/guides/split-scanned-book-pdf-in-half).",
            ],
          },
        ],
      },
      {
        heading: "Cropping isn't removing",
        blocks: [
          { p: "The area outside the crop box is hidden, not deleted, so someone with a PDF editor could restore it. To remove sensitive content permanently, use [Redact PDF](/tools/redact-pdf) instead." },
        ],
      },
    ],
    faq: [
      ["Does cropping reduce the file size?", "Not much, because the hidden area stays in the file."],
      ["Can I crop odd and even pages differently?", "Apply the crop to a selection of pages, then run it again with a different box on the other pages."],
    ],
  },
  {
    slug: "dark-mode-pdf",
    title: "How to Invert PDF Colours for Dark-Mode Reading",
    description: "Make a dark-mode, sepia, grayscale or high-contrast copy of any PDF for easier reading at night or on e-readers, or to print without colour ink. Free.",
    h1: "How to invert PDF colours for dark-mode reading",
    summary:
      "Open [Invert colours](/tools/invert-colours), choose the PDF, pick Dark mode (or Sepia, Grayscale or High contrast), and press Change colours. You get a copy that's easier on the eyes at night. The pages become images in the new copy, so run [OCR PDF](/tools/ocr-pdf) on it if you need to select or search text.",
    published: "2026-11-28",
    time: "10:00",
    updated: "2026-11-28",
    cluster: "pdf-tools",
    tools: ["invert-colours", "ocr-pdf", "compress-pdf", "pages-per-sheet"],
    sections: [
      {
        heading: "Change the colours step by step",
        blocks: [
          {
            steps: [
              "Open [Invert colours](/tools/invert-colours) and choose the PDF.",
              "Pick a style: Dark mode, Sepia, Grayscale or High contrast.",
              "Press Change colours and download the new copy.",
            ],
          },
          { note: "The conversion runs in your browser. Your original PDF isn't changed." },
        ],
      },
      {
        heading: "Which style to pick",
        blocks: [
          {
            list: [
              "Dark mode: light text on a dark background for reading in bed or on OLED screens.",
              "Sepia: warm, paper-like tones that are gentler than bright white.",
              "Grayscale: removes colour, which also saves colour ink when printing.",
              "High contrast: sharper black and white for faint scans or low vision.",
            ],
          },
        ],
      },
      {
        heading: "Things to know",
        blocks: [
          {
            list: [
              "The new copy's pages are images, so text isn't selectable until you run [OCR PDF](/tools/ocr-pdf).",
              "Image-based pages can make the file bigger; [Compress PDF](/tools/compress-pdf) helps.",
              "Many PDF readers have their own night mode that changes only the display. This tool makes a file that looks the same everywhere, including in print.",
            ],
          },
          { p: "For cheap printed notes, combine Grayscale with [Pages per sheet](/tools/pages-per-sheet)." },
        ],
      },
    ],
    faq: [
      ["Will photos look strange in dark mode?", "Inverting turns photos into negatives. Use Sepia or Grayscale for documents with many photos."],
      ["Can I switch back to normal colours?", "Keep your original PDF; the tool always makes a new copy."],
    ],
  },
  {
    slug: "save-web-page-as-pdf",
    title: "How to Save a Web Page as a Clean PDF",
    description: "Save an article, receipt or booking page as a PDF from its link, in A4 or Letter, portrait or landscape. Free, plus how to use your browser's own Print to PDF.",
    h1: "How to save a web page as a PDF",
    summary:
      "Paste the page's link into [HTML to PDF](/tools/html-to-pdf), pick A4 or Letter (landscape for wide pages) and press Convert to PDF. A real browser engine renders the page, so it looks like the live site. For pages behind a login, such as a bank receipt, use your browser's Print → Save as PDF instead.",
    published: "2026-11-28",
    time: "17:00",
    updated: "2026-11-28",
    cluster: "pdf-converter",
    tools: ["html-to-pdf", "compress-pdf", "merge-pdf", "crop-pdf"],
    sections: [
      {
        heading: "Convert a public page",
        blocks: [
          {
            steps: [
              "Copy the full address of the page, starting with https://.",
              "Open [HTML to PDF](/tools/html-to-pdf) and paste it.",
              "Pick A4 or Letter, and landscape if the page is wide.",
              "Press Convert to PDF and download.",
            ],
          },
          { p: "Our server fetches the page to render it and deletes the PDF right after. Only public pages work: anything behind a login or paywall can't be reached." },
        ],
      },
      {
        heading: "Pages behind a login",
        blocks: [
          {
            steps: [
              "Open the page in your browser while signed in.",
              "Press Ctrl+P (Cmd+P on a Mac), or choose Print from the menu.",
              "Choose Save as PDF as the printer, and turn on Background graphics if colours matter.",
              "Save.",
            ],
          },
          { p: "This works for bank receipts, booking confirmations and order pages, because your own browser already has access to them." },
        ],
      },
      {
        heading: "Tidy the result",
        blocks: [
          {
            list: [
              "Trim menus and side columns with [Crop PDF](/tools/crop-pdf).",
              "Combine several saved pages, such as a multi-part article, with [Merge PDF](/tools/merge-pdf).",
              "Shrink image-heavy pages with [Compress PDF](/tools/compress-pdf).",
            ],
          },
        ],
      },
    ],
    faq: [
      ["Why does the PDF show a cookie banner?", "The page is captured as a first-time visitor sees it. Use your browser's Print to PDF after dismissing the banner if it gets in the way."],
      ["Are links clickable in the PDF?", "Links usually stay clickable when a page is converted."],
    ],
  },
  {
    slug: "add-header-footer-to-pdf",
    title: "How to Add a Header and Footer to Every PDF Page",
    description: "Put a title, company name, date, file name or page number at the top and bottom of every PDF page, aligned left, centre or right. Free, in your browser.",
    h1: "How to add a header and footer to every PDF page",
    summary:
      "Open [Header and footer](/tools/header-footer), choose the PDF, and type into the left, centre and right slots of the header and footer. Insert automatic page numbers, the page count, the date or the file name, adjust size, margin and colour, add a separator line if you like, and press Add headers & footers.",
    published: "2026-11-29",
    time: "09:00",
    updated: "2026-11-29",
    cluster: "pdf-tools",
    tools: ["header-footer", "page-numbers", "watermark-pdf", "bates-numbering"],
    sections: [
      {
        heading: "Add them step by step",
        blocks: [
          {
            steps: [
              "Open [Header and footer](/tools/header-footer) and choose the PDF.",
              "Type text into any of the six slots: left, centre and right, top and bottom.",
              "Insert automatic fields where needed: page number, total pages, date or file name.",
              "Adjust size, margin and colour, and turn on the separator line if you want one.",
              "Press Add headers & footers and download.",
            ],
          },
          { note: "The document is processed in your browser." },
        ],
      },
      {
        heading: "Common layouts",
        blocks: [
          {
            list: [
              "Reports: company name top left, document title top right, “Page 3 of 12” bottom centre.",
              "Meeting minutes: meeting name and date in the header, “Confidential” in the footer.",
              "Assignments: your name and roll number top right, course code top left.",
            ],
          },
        ],
      },
      {
        heading: "Related tools",
        blocks: [
          { p: "For page numbers alone, [Add page numbers](/tools/page-numbers) has more number formats; see [How to add page numbers to a PDF](/guides/add-page-numbers-to-pdf). For a stamp across the page, use [Watermark PDF](/tools/watermark-pdf), and for legal productions, [Bates numbering](/tools/bates-numbering)." },
        ],
      },
    ],
    faq: [
      ["Will the header cover existing text?", "Increase the margin, or choose slots where the page is blank. Most documents have room at the very top and bottom."],
      ["Can I skip the cover page?", "If the cover shouldn't have a header, split it off with Split PDF, add headers to the rest, and merge them back."],
    ],
  },
  {
    slug: "markdown-to-pdf",
    title: "How to Convert Markdown to PDF With Headings, Tables and Code",
    description: "Turn README files, notes and documentation written in Markdown into clean PDFs with headings, lists, tables and code blocks. Free online converter.",
    h1: "How to convert Markdown to PDF",
    summary:
      "Open [Markdown to PDF](/tools/markdown-to-pdf), choose one or more .md, .markdown or .txt files, turn on Landscape if you have wide tables, and press Convert to PDF. Headings, lists, tables, quotes and code blocks are typeset for reading and printing.",
    published: "2026-11-29",
    time: "13:00",
    updated: "2026-11-29",
    cluster: "pdf-converter",
    tools: ["markdown-to-pdf", "pdf-to-markdown", "merge-pdf", "html-to-pdf"],
    sections: [
      {
        heading: "Convert step by step",
        blocks: [
          {
            steps: [
              "Open [Markdown to PDF](/tools/markdown-to-pdf) and choose your Markdown files.",
              "Turn on Landscape if tables are wide.",
              "Press Convert to PDF and download.",
            ],
          },
          { p: "Files are converted on our server and deleted as soon as the PDF is ready." },
        ],
      },
      {
        heading: "What's supported",
        blocks: [
          {
            list: [
              "Headings, bold and italic text, links and quotes.",
              "Bulleted and numbered lists.",
              "Tables.",
              "Code blocks, set in a monospace font.",
            ],
          },
          { p: "Images referenced by a path on your computer can't be included, because only the Markdown file is sent. Use images with full web addresses, or add them to the PDF afterwards." },
        ],
      },
      {
        heading: "Uses",
        blocks: [
          {
            list: [
              "Share project documentation with people who don't use Markdown.",
              "Print notes from Obsidian or a code editor.",
              "Combine several converted notes into one document with [Merge PDF](/tools/merge-pdf).",
            ],
          },
          { p: "Going the other way? See [How to convert a PDF to Markdown](/guides/pdf-to-markdown)." },
        ],
      },
    ],
    faq: [
      ["Can I convert a GitHub README?", "Yes. Download the README.md and convert it; relative image paths won't be included."],
      ["Can I convert several notes at once?", "Yes. Choose them together; each becomes its own PDF."],
    ],
  },
  {
    slug: "flatten-pdf",
    title: "How to Flatten a PDF So Nobody Can Change the Form Fields",
    description: "Merge filled form fields, comments, stamps and drawings into the page so they can't be edited, and remove scripts before sharing. Free PDF flattener.",
    h1: "How to flatten a PDF",
    summary:
      "Open [Flatten PDF](/tools/flatten-pdf), choose the file, pick what to flatten (form fields, comments and drawings) and whether to remove scripts, and press Flatten PDF. Answers, stamps and annotations become part of the page: they look the same and print reliably, but can no longer be changed. Keep the original if you might edit it again.",
    published: "2026-11-29",
    time: "18:00",
    updated: "2026-11-29",
    cluster: "pdf-tools",
    tools: ["flatten-pdf", "pdf-forms", "sign-pdf", "protect-pdf"],
    sections: [
      {
        heading: "Flatten step by step",
        blocks: [
          {
            steps: [
              "Open [Flatten PDF](/tools/flatten-pdf) and choose the PDF.",
              "Choose what to flatten: form fields, comments and drawings.",
              "Choose whether to remove scripts.",
              "Press Flatten PDF and download.",
            ],
          },
          { note: "Flattening runs in your browser. Links keep working afterwards." },
        ],
      },
      {
        heading: "When to flatten",
        blocks: [
          {
            list: [
              "Sending a filled form, so the recipient can't alter your answers.",
              "Making sure stamps, comments and markups print exactly as they appear on screen.",
              "Sharing a document from an unknown source, by removing embedded scripts.",
              "Uploading to portals that reject or mangle fillable forms.",
            ],
          },
        ],
      },
      {
        heading: "Things to know",
        blocks: [
          { p: "Flattening can't be undone in the new file. Keep the editable original. Flattening stops casual edits but isn't a security measure: to stop people opening or changing the file, add a password and permissions with [Protect PDF](/tools/protect-pdf). To fill in a form first, see [How to fill out a PDF form and save it](/guides/fill-pdf-form-and-save)." },
        ],
      },
    ],
    faq: [
      ["Does flattening change how the PDF looks?", "No. Fields and annotations look the same; they just become part of the page."],
      ["Can I flatten a signed PDF?", "Yes, if the signature was added as an image or annotation. Certificate-based digital signatures should not be flattened, as that breaks their validation."],
    ],
  },
  {
    slug: "csv-to-pdf-table",
    title: "How to Turn a CSV File Into a Printable PDF Table",
    description: "Convert CSV or TSV exports from banks, shops and databases into neat PDF tables, with the header row repeated on every page. Portrait or landscape. Free.",
    h1: "How to turn a CSV file into a printable PDF table",
    summary:
      "Open [CSV to PDF](/tools/csv-to-pdf), choose your .csv or .tsv file, keep “First row is a header” on so it repeats on every page, turn on Landscape for many columns, and press Convert to PDF. You get a readable, printable table without opening a spreadsheet program.",
    published: "2026-11-30",
    time: "10:00",
    updated: "2026-11-30",
    cluster: "pdf-converter",
    tools: ["csv-to-pdf", "excel-editor", "excel-to-pdf", "pdf-to-csv"],
    sections: [
      {
        heading: "Convert step by step",
        blocks: [
          {
            steps: [
              "Open [CSV to PDF](/tools/csv-to-pdf) and choose one or more .csv or .tsv files.",
              "Keep “First row is a header” on, so column names appear at the top of every page.",
              "Turn on Landscape if the table has many columns.",
              "Press Convert to PDF and download.",
            ],
          },
          { p: "Files are converted on our server and deleted as soon as the PDF is ready." },
        ],
      },
      {
        heading: "Tidy the data first",
        blocks: [
          {
            list: [
              "Delete columns you don't need: the fewer columns, the larger and more readable the text.",
              "Sort rows in the order you want them printed.",
              "The [Excel editor](/tools/excel-editor) opens CSV files in the browser for quick clean-up; save as CSV again before converting.",
            ],
          },
          { p: "For formatted spreadsheets with colours and totals, use [Excel to PDF](/tools/excel-to-pdf) instead; see [How to convert Excel to PDF and fit every column](/guides/excel-to-pdf-fit-columns)." },
        ],
      },
    ],
    faq: [
      ["My CSV uses semicolons. Will it work?", "Comma- and tab-separated files are supported. Open a semicolon file in the Excel editor and save it as CSV first."],
      ["Can I go from PDF back to CSV?", "Yes, with PDF to CSV."],
    ],
  },
  {
    slug: "pdf-to-epub",
    title: "How to Convert a PDF to EPUB for Kindle and E-Readers",
    description: "Turn a PDF into a reflowable EPUB e-book that fits any screen on Kindle, Kobo, Apple Books and phone readers. Add an author name. Free, in your browser.",
    h1: "How to convert a PDF to EPUB for e-readers",
    summary:
      "Open [PDF to EPUB](/tools/pdf-to-epub), choose the PDF, optionally add the author's name, and press Convert to EPUB. The text reflows to fit any screen and font size, with headings kept, so papers and reports are comfortable to read on a Kindle, Kobo, Apple Books or a phone.",
    published: "2026-11-30",
    time: "17:00",
    updated: "2026-11-30",
    cluster: "pdf-converter",
    tools: ["pdf-to-epub", "ocr-pdf", "ebook-to-pdf", "invert-colours"],
    sections: [
      {
        heading: "Convert step by step",
        blocks: [
          {
            steps: [
              "Open [PDF to EPUB](/tools/pdf-to-epub) and choose the PDF.",
              "Optionally type the author's name.",
              "Press Convert to EPUB and download.",
            ],
          },
          { note: "The conversion runs in your browser, so the PDF isn't uploaded." },
        ],
      },
      {
        heading: "Reading it on your device",
        blocks: [
          {
            list: [
              "Kindle: send the EPUB with Amazon's Send to Kindle (app, website or email); it's converted for your Kindle automatically.",
              "Kobo and other e-readers: copy it over USB or add it through the device's app.",
              "iPhone and iPad: open it in Apple Books.",
              "Android: open it in any EPUB reader app.",
            ],
          },
        ],
      },
      {
        heading: "What converts well",
        blocks: [
          {
            list: [
              "Text-heavy PDFs such as articles, reports and novels reflow nicely.",
              "Complex layouts with columns, sidebars and tables are simplified into one flow.",
              "Scanned PDFs need [OCR PDF](/tools/ocr-pdf) first, as they have no text to reflow.",
            ],
          },
          { p: "For night reading without converting, a dark-mode copy from [Invert colours](/tools/invert-colours) may be enough. To turn an EPUB back into a PDF, see [How to convert an EPUB e-book to PDF](/guides/epub-to-pdf)." },
        ],
      },
    ],
    faq: [
      ["Why convert a PDF to EPUB?", "PDF pages have a fixed size, so on small screens you zoom and scroll. EPUB text reflows to fit the screen and lets you change the font size."],
      ["Will images be kept?", "The focus is reflowable text with its headings; complex layouts and some images may be simplified."],
    ],
  },
];
