import type { Guide } from "../guides";

/** Scheduled guides 51–60 (11–14 November 2026). */
export const BATCH_06: Guide[] = [
  {
    slug: "photo-size-pixels-cm-kb",
    title: "Photo Size in Pixels, cm and KB: What Online Forms Actually Mean",
    description: "Forms give photo sizes in pixels, centimetres or KB, sometimes all three. What each one measures, how they relate, and how to meet them all at once.",
    h1: "Photo size in pixels, cm and KB: what online forms actually mean",
    summary:
      "Pixels are the image's dimensions, centimetres are its print size (which needs a DPI to turn into pixels), and KB is how much storage the file takes. They're separate rules: a photo can be the right pixel size and still too many KB. [Resize image](/tools/resize-image) sets the dimensions and caps the KB in one go.",
    published: "2026-11-11",
    time: "09:00",
    updated: "2026-11-11",
    cluster: "image-tools",
    tools: ["resize-image", "compress-image", "crop-image"],
    sections: [
      {
        heading: "The three measurements",
        blocks: [
          {
            list: [
              "Pixels (for example 200 × 230): how many dots wide and tall the image is. This is what the portal actually checks for dimensions.",
              "Centimetres (for example 3.5 × 4.5 cm): how big the photo would print. It only becomes a pixel size once you choose a DPI: pixels = cm ÷ 2.54 × DPI.",
              "KB (for example 20–50 KB): the file size on disk. It depends on the pixels and on how strongly the JPG is compressed.",
            ],
          },
        ],
      },
      {
        heading: "How they affect each other",
        blocks: [
          {
            list: [
              "More pixels usually means more KB. Shrinking dimensions is the gentlest way to cut file size.",
              "Stronger JPG compression lowers KB without changing pixels, but too much makes blocks and smudges.",
              "Changing the DPI value stored in a file doesn't change its KB; changing the pixel count does.",
            ],
          },
          { p: "So when a form says “3.5 × 4.5 cm, 20–50 KB”, you first get the right shape and pixel count, then compress until the file lands in the KB range. The full cm-to-pixel arithmetic is in [How to resize a photo to 3.5 × 4.5 cm](/guides/resize-photo-3-5-x-4-5-cm)." },
        ],
      },
      {
        heading: "Meet all three at once",
        blocks: [
          {
            steps: [
              "Crop the photo to the right shape with [Crop image](/tools/crop-image).",
              "Open [Resize image](/tools/resize-image) and enter the size in Pixels, or in Print size with the DPI the form gives.",
              "Turn on Limit the file size and enter the maximum KB.",
              "Save as JPG and check the file is above the form's minimum KB.",
            ],
          },
          { p: "If only the KB is wrong, [Compress image](/tools/compress-image) changes the file size without touching the dimensions; see [How to compress a photo to 20, 50 or 100 KB](/guides/compress-photo-to-50kb)." },
        ],
      },
    ],
    faq: [
      ["The form only gives KB. What size in pixels should I use?", "Around 300–600 pixels on the long side suits most form photos and keeps small KB targets easy to hit without blurring."],
      ["Why is my 200 × 230 photo still too big?", "It's saved at very high quality or as PNG. Save it as JPG with a KB limit."],
    ],
  },
  {
    slug: "free-adobe-acrobat-alternative",
    title: "Free Adobe Acrobat Alternatives for Editing PDFs",
    description: "Adobe Acrobat Reader is free for viewing and signing, but editing text needs a paid plan. Free ways to edit, convert, compress and sign PDFs without Acrobat Pro.",
    h1: "Free Adobe Acrobat alternatives for editing PDFs",
    summary:
      "Adobe Acrobat Reader is free for reading, commenting, filling and signing PDFs, but changing a PDF's existing text or converting it to Word needs a paid Acrobat plan. The [PDF editor](/tools/edit-pdf) here edits existing text in its original font for free, and tools like [PDF to Word](/tools/pdf-to-word) and [Compress PDF](/tools/compress-pdf) cover the other common Acrobat jobs, in your browser and without an account.",
    published: "2026-11-11",
    time: "13:00",
    updated: "2026-11-11",
    cluster: "pdf-tools",
    tools: ["edit-pdf", "pdf-to-word", "compress-pdf", "sign-pdf"],
    sections: [
      {
        heading: "What Acrobat Reader does for free",
        blocks: [
          {
            list: [
              "Opens and prints PDFs, and lets you highlight and comment.",
              "Fills in forms and adds a simple signature.",
              "Editing existing text and images, converting to Word or Excel and combining files need Acrobat Standard or Pro. Adobe's online tools offer some tasks free, with limits and a sign-in for many of them.",
            ],
          },
        ],
      },
      {
        heading: "Free equivalents for common Acrobat Pro tasks",
        blocks: [
          {
            list: [
              "Edit existing text, add images, shapes and comments: [PDF editor](/tools/edit-pdf).",
              "PDF to Word, Excel or PowerPoint: [PDF to Word](/tools/pdf-to-word), [PDF to Excel](/tools/pdf-to-excel), [PDF to PowerPoint](/tools/pdf-to-powerpoint).",
              "Combine and organise: [Merge PDF](/tools/merge-pdf) and [Organize PDF](/tools/organize-pdf).",
              "Reduce file size: [Compress PDF](/tools/compress-pdf).",
              "Sign, protect and redact: [Sign PDF](/tools/sign-pdf), [Protect PDF](/tools/protect-pdf), [Redact PDF](/tools/redact-pdf).",
              "Make scans searchable: [OCR PDF](/tools/ocr-pdf).",
            ],
          },
          { p: "These run in a browser on Windows, Mac, Linux, Chromebook and phones, with no install. LibreOffice Draw, a free desktop program, can also open and edit PDFs if you prefer working offline." },
        ],
      },
      {
        heading: "When Acrobat is still worth paying for",
        blocks: [
          { p: "Acrobat Pro offers certificate-based digital signatures, PDF/A and print-production checks, accessibility tagging, advanced form building and tight Microsoft Office integration. If your work depends on those, it's the right tool. For editing, converting and tidying everyday documents, the free tools above do the job." },
        ],
      },
    ],
    faq: [
      ["Can I edit a PDF's text for free?", "Yes. Open it in the PDF editor, choose Edit text and click a line; the change keeps the original font."],
      ["Do I need an account?", "No. All of the tools above work without signing up."],
    ],
  },
  {
    slug: "delete-pages-from-pdf",
    title: "How to Delete Pages From a PDF (Free, No Upload)",
    description: "Remove blank, duplicate or unwanted pages from a PDF by clicking them, or keep only the pages you need. Free, and the file stays in your browser.",
    h1: "How to delete pages from a PDF",
    summary:
      "Open [Organize PDF](/tools/organize-pdf), choose the file, and press the delete button on each page you don't want; then save the new PDF. If it's easier to say which pages to keep, use [Split PDF](/tools/split-pdf) with Extract pages and list them, for example 1-3, 7.",
    published: "2026-11-11",
    time: "18:00",
    updated: "2026-11-11",
    cluster: "pdf-tools",
    tools: ["organize-pdf", "split-pdf", "edit-pdf"],
    sections: [
      {
        heading: "Delete pages by clicking them",
        blocks: [
          {
            steps: [
              "Open [Organize PDF](/tools/organize-pdf) and choose your PDF. Every page appears as a thumbnail.",
              "Press the delete button on each page to remove. Undo puts back a page you removed by mistake.",
              "Drag pages to reorder them while you're there, if needed.",
              "Save the result as a new PDF.",
            ],
          },
          { note: "Your original file isn't changed: you get a new PDF without those pages. Nothing is uploaded." },
        ],
      },
      {
        heading: "Keep only certain pages instead",
        blocks: [
          {
            steps: [
              "Open [Split PDF](/tools/split-pdf) and choose Extract pages.",
              "Type the pages to keep, such as 1-3, 7, 10-12.",
              "Turn on “Put them in one PDF” and press Split PDF.",
            ],
          },
          { p: "This is quicker for long documents where you need just a few pages." },
        ],
      },
      {
        heading: "Deleting pages while editing",
        blocks: [
          { p: "If you're already editing the document in the [PDF editor](/tools/edit-pdf), the page sidebar can delete, add, rotate and duplicate pages too, without leaving the editor." },
        ],
      },
    ],
    faq: [
      ["Can I delete pages from a password-protected PDF?", "Unlock it first with Unlock PDF using its password, then delete the pages."],
      ["Does deleting pages reduce the file size?", "Yes, by roughly the size of the removed pages. For a bigger reduction, compress the result."],
    ],
  },
  {
    slug: "pdf-to-handwritten-notes",
    title: "How to Turn a PDF Into Handwritten Notes",
    description: "Convert the text of a PDF into realistic handwritten pages on lined, squared or plain paper, as a downloadable PDF. Free, and the file stays on your device.",
    h1: "How to turn a PDF into handwritten notes",
    summary:
      "Open [PDF to handwriting](/tools/pdf-to-handwriting), choose a PDF with selectable text, pick a handwriting style, paper and ink, and press Write it. The text is written out again as handwritten-looking pages, paragraph by paragraph, and downloaded as a PDF.",
    published: "2026-11-12",
    time: "10:00",
    updated: "2026-11-12",
    cluster: "pdf-tools",
    tools: ["pdf-to-handwriting", "text-to-handwriting", "ocr-pdf", "split-pdf"],
    sections: [
      {
        heading: "Convert step by step",
        blocks: [
          {
            steps: [
              "Open [PDF to handwriting](/tools/pdf-to-handwriting) and choose the PDF.",
              "Pick a handwriting style, the paper (lined, squared or plain) and the ink colour.",
              "Press Write it and download the handwritten PDF.",
            ],
          },
          { p: "To convert only part of a long document, extract those pages first with [Split PDF](/tools/split-pdf)." },
        ],
      },
      {
        heading: "What carries over",
        blocks: [
          {
            list: [
              "Paragraphs are kept, so the notes follow the original's structure.",
              "Images, tables and page layout aren't reproduced: only the text is written out.",
              "Scanned PDFs have no text to read; run [OCR PDF](/tools/ocr-pdf) first.",
            ],
          },
          { p: "If you'd rather paste or edit the text first, [Text to handwriting](/tools/text-to-handwriting) takes typed text directly; see [Text to handwriting](/guides/text-to-handwriting-assignments) for tips on making pages look natural." },
        ],
      },
      {
        heading: "Use it fairly",
        blocks: [
          { note: "Generated handwriting is great for personal study notes and printouts that are easier on the eye. If a teacher or exam requires your own handwriting, a generated page doesn't count." },
        ],
      },
    ],
    faq: [
      ["Can I choose the ink colour?", "Yes: blue, black or red, on lined, squared or plain paper."],
      ["Is my PDF uploaded?", "No. The conversion runs in your browser."],
    ],
  },
  {
    slug: "pdf-to-jpg-every-page",
    title: "How to Convert a PDF to JPG Images, One per Page",
    description: "Save every page of a PDF as a JPG or PNG at screen, standard or print quality, or pull out the original photos inside it. Free, in your browser.",
    h1: "How to convert a PDF to JPG images, one per page",
    summary:
      "Open [PDF to JPG](/tools/pdf-to-jpg), choose the PDF, keep Page to image selected, pick JPG and a quality (Screen, Standard or Print), and press Convert to images. Each page becomes one image; several download together as a ZIP. To get the photos embedded in the PDF instead, choose Extract images.",
    published: "2026-11-12",
    time: "17:00",
    updated: "2026-11-12",
    cluster: "pdf-converter",
    tools: ["pdf-to-jpg", "extract-images", "compress-image", "jpg-to-pdf"],
    sections: [
      {
        heading: "Convert step by step",
        blocks: [
          {
            steps: [
              "Open [PDF to JPG](/tools/pdf-to-jpg) and choose the PDF.",
              "Keep Page to image.",
              "Choose JPG (smaller files) or PNG (sharper text and lines).",
              "Pick a quality: Screen (96 DPI), Standard (150 DPI) or Print (300 DPI), and which pages to convert.",
              "Press Convert to images and download the images or ZIP.",
            ],
          },
        ],
      },
      {
        heading: "Which quality to choose",
        blocks: [
          {
            list: [
              "Screen: WhatsApp, email previews and social posts. Smallest files.",
              "Standard: slides, documents and most uploads.",
              "Print: printing the page as a picture, or zooming into fine detail. Largest files.",
            ],
          },
          { p: "If an upload form wants the image under a KB limit, shrink it afterwards with [Compress image](/tools/compress-image)." },
        ],
      },
      {
        heading: "Pages versus embedded images",
        blocks: [
          { p: "Page to image photographs the whole page, text and all. Extract images pulls out the pictures stored inside the PDF at their original resolution, without the surrounding text, which is better for reusing product photos from a catalogue. [Extract images](/tools/extract-images) also does this on its own." },
          { p: "To go the other way and turn images into a PDF, use [JPG to PDF](/tools/jpg-to-pdf)." },
        ],
      },
    ],
    faq: [
      ["Will the text in the JPG be selectable?", "No. A JPG is a picture of the page. Keep the PDF if you need selectable text."],
      ["Can I convert just one page?", "Yes. Enter that page number in the pages option."],
    ],
  },
  {
    slug: "merge-documents-for-ca",
    title: "How to Merge Statements, Invoices and Receipts Into One PDF for a CA",
    description: "Put bank statements, invoices, receipts and tax forms into one ordered, numbered PDF your accountant can work through, and keep it small and protected.",
    h1: "How to merge bank statements, invoices and receipts into one PDF for your CA",
    summary:
      "Unlock any password-protected statements, then combine everything in a sensible order with [Merge PDF](/tools/merge-pdf): statements by month, then invoices, then receipts. Add page numbers, compress the result, and protect it with a password before you email it. Your CA gets one tidy file instead of thirty attachments.",
    published: "2026-11-13",
    time: "09:00",
    updated: "2026-11-13",
    cluster: "pdf-tools",
    tools: ["merge-pdf", "unlock-pdf", "jpg-to-pdf", "page-numbers", "compress-pdf", "protect-pdf"],
    sections: [
      {
        heading: "Get everything into PDF",
        blocks: [
          {
            list: [
              "Remove passwords from bank and card statements with [Unlock PDF](/tools/unlock-pdf), since Merge PDF needs unlocked files. Formats are covered in [Bank statement PDF password](/guides/bank-statement-pdf-password).",
              "Turn photos of bills and receipts into PDFs with [JPG to PDF](/tools/jpg-to-pdf), several to a file.",
              "Download Form 16, AIS and other tax PDFs from their portals.",
            ],
          },
        ],
      },
      {
        heading: "Merge and finish",
        blocks: [
          {
            steps: [
              "Open [Merge PDF](/tools/merge-pdf) and add all the files.",
              "Order them: bank statements by month, credit card statements, sales invoices, purchase bills, receipts, tax forms.",
              "Press Merge PDF and download.",
              "Add page numbers with [Add page numbers](/tools/page-numbers) so you can say “see page 37”.",
              "Shrink it for email with [Compress PDF](/tools/compress-pdf).",
              "Add a password with [Protect PDF](/tools/protect-pdf), and send the password by phone or a separate message.",
            ],
          },
          { note: "Merging, numbering, compressing and protecting all run in your browser: your financial documents aren't uploaded." },
        ],
      },
      {
        heading: "Tips your CA will appreciate",
        blocks: [
          {
            list: [
              "One file per financial year, or per quarter if it gets very large.",
              "A first page listing what's inside, typed in the Word editor and converted to PDF.",
              "No duplicates: remove repeated pages with [Organize PDF](/tools/organize-pdf).",
            ],
          },
        ],
      },
    ],
    faq: [
      ["Is there a limit on how many files I can merge?", "No fixed limit: it depends on your device's memory, since merging happens in your browser."],
      ["Should I send Excel files too?", "If your CA prefers spreadsheets, convert statements with PDF to Excel and send those alongside the PDF."],
    ],
  },
  {
    slug: "credit-card-statement-password",
    title: "Credit Card Statement PDF Password: How to Find It and Unlock It",
    description: "Card issuers lock e-statements with a password built from your details. Where to find the format, what it's usually made of, and how to remove it from your copy.",
    h1: "Credit card statement PDF password: how to find it and unlock the file",
    summary:
      "Credit card e-statements are protected with a password the issuer builds from your details, most often part of your name and your date of birth, sometimes with digits of the card or mobile number. The exact rule is written in the statement email. Once you have it, [Unlock PDF](/tools/unlock-pdf) saves a copy that opens without a password.",
    published: "2026-11-13",
    time: "13:00",
    updated: "2026-11-13",
    cluster: "pdf-tools",
    tools: ["unlock-pdf", "pdf-to-excel", "protect-pdf"],
    sections: [
      {
        heading: "Find the password format",
        blocks: [
          {
            list: [
              "Read the statement email to the end: issuers describe the format there, often with an example.",
              "Check the issuer's app or website FAQ for e-statements.",
              "Ask customer care if neither says.",
            ],
          },
          { p: "Formats change from time to time, so the newest email is the one to trust." },
        ],
      },
      {
        heading: "What it's usually made of",
        blocks: [
          {
            list: [
              "The first four letters of your name as printed on the card, in capitals or lowercase as the email says.",
              "Your date of birth, as DDMM, DDMMYY or DDMMYYYY.",
              "Sometimes the last four digits of the card number or registered mobile number.",
            ],
          },
          { p: "If a name-based password fails, use the name exactly as printed on the card (with initials if they're there), and check the letter case." },
        ],
      },
      {
        heading: "Unlock and analyse the statement",
        blocks: [
          {
            steps: [
              "Open [Unlock PDF](/tools/unlock-pdf) and choose the statement.",
              "Enter the password and press Unlock PDF.",
              "Download the copy without a password.",
            ],
          },
          { p: "To sort spending by merchant or month, convert the unlocked statement with [PDF to Excel](/tools/pdf-to-excel). Before sending it to anyone, add your own password with [Protect PDF](/tools/protect-pdf). The same approach works for bank statements: see [Bank statement PDF password](/guides/bank-statement-pdf-password)." },
          { note: "Unlocking runs in your browser, so your statement isn't uploaded. It needs the correct password; it can't guess one." },
        ],
      },
    ],
    faq: [
      ["I've forgotten my date of birth format. Which should I try?", "The email states it. If it doesn't, try DDMM first, then DDMMYY and DDMMYYYY."],
      ["Can I stop the bank from locking statements?", "Most issuers don't let you turn the password off. Keep an unlocked copy for yourself instead."],
    ],
  },
  {
    slug: "webp-to-jpg-or-png",
    title: "How to Convert WEBP Images to JPG or PNG",
    description: "Saved an image as WEBP and a form, app or printer won't take it? Convert WEBP to JPG or PNG in seconds, one or many at a time, free and in your browser.",
    h1: "How to convert WEBP images to JPG or PNG",
    summary:
      "Open [Convert image](/tools/convert-image), add the WEBP files, choose JPG (for photos) or PNG (for graphics and transparency), and press Convert. When saving as JPG, pick a fill colour for any transparent areas, usually white. Everything happens in your browser.",
    published: "2026-11-13",
    time: "18:00",
    updated: "2026-11-13",
    cluster: "image-tools",
    tools: ["convert-image", "compress-image", "resize-image"],
    sections: [
      {
        heading: "Why you end up with WEBP files",
        blocks: [
          { p: "Most websites now serve images as WEBP because it's smaller than JPG or PNG. When you save an image from a browser you often get a .webp file, which older software, some printers, and many government and exam forms don't accept." },
        ],
      },
      {
        heading: "Convert step by step",
        blocks: [
          {
            steps: [
              "Open [Convert image](/tools/convert-image) and choose one or more WEBP files.",
              "Pick JPG or PNG.",
              "For JPG, set the quality, and choose a fill colour for transparent areas (white is usual).",
              "Press Convert and download the images.",
            ],
          },
        ],
      },
      {
        heading: "JPG or PNG?",
        blocks: [
          {
            list: [
              "JPG: photos, and anything going into a form. Smaller files.",
              "PNG: logos, icons, screenshots and anything with a transparent background. Sharper edges, larger files.",
            ],
          },
          { p: "If a form has a KB limit, finish with [Compress image](/tools/compress-image) or [Resize image](/tools/resize-image)." },
        ],
      },
    ],
    faq: [
      ["Does converting WEBP to JPG lose quality?", "Very little at a normal quality setting, though JPG files are usually larger than the WEBP."],
      ["Can I convert many WEBP files at once?", "Yes. Add them all together and download the converted images in one go."],
    ],
  },
  {
    slug: "pdf-to-markdown",
    title: "How to Convert a PDF to Markdown for ChatGPT, Notion or Obsidian",
    description: "Turn a PDF into clean Markdown with headings, lists and tables, ready to paste into ChatGPT, Notion, Obsidian or a GitHub wiki. Free and private.",
    h1: "How to convert a PDF to Markdown for ChatGPT, Notion or Obsidian",
    summary:
      "Open [PDF to Markdown](/tools/pdf-to-markdown), choose the PDF, and press Convert to Markdown. You get the document's text with headings, lists and tables in Markdown, ready to copy into ChatGPT, Notion, Obsidian or a GitHub README. The conversion runs in your browser, so the document isn't uploaded.",
    published: "2026-11-14",
    time: "10:00",
    updated: "2026-11-14",
    cluster: "pdf-converter",
    tools: ["pdf-to-markdown", "extract-text", "ocr-pdf", "markdown-to-pdf"],
    sections: [
      {
        heading: "Convert step by step",
        blocks: [
          {
            steps: [
              "Open [PDF to Markdown](/tools/pdf-to-markdown) and choose the PDF.",
              "Turn on page separators (---) if you want to see where each page ended.",
              "Press Convert to Markdown.",
              "Copy the text from the preview, or download the .md file.",
            ],
          },
        ],
      },
      {
        heading: "Why Markdown",
        blocks: [
          {
            list: [
              "AI assistants understand structure better from Markdown than from plain copied text: headings and tables survive.",
              "Notion, Obsidian, GitHub and most wikis paste Markdown as formatted content.",
              "It's plain text, so it's small, searchable and easy to edit.",
            ],
          },
          { p: "For plain text with no structure, [Extract text](/tools/extract-text) is simpler." },
        ],
      },
      {
        heading: "Limits",
        blocks: [
          {
            list: [
              "Scanned PDFs need [OCR PDF](/tools/ocr-pdf) first.",
              "Complex multi-column layouts are simplified into a single reading order.",
              "Images aren't included; only the text and its structure.",
            ],
          },
          { p: "To turn Markdown back into a printable document, use [Markdown to PDF](/tools/markdown-to-pdf)." },
        ],
      },
    ],
    faq: [
      ["Is it safe to convert confidential PDFs?", "The conversion runs on your device, so the PDF isn't uploaded. What you then paste into an AI chat is up to you."],
      ["Does it keep tables?", "Yes, tables come out as Markdown tables where the PDF's columns can be detected."],
    ],
  },
  {
    slug: "rearrange-pdf-pages",
    title: "How to Rearrange Pages in a PDF by Dragging Them",
    description: "Drag PDF pages into a new order, rotate or remove them, and add pages from other PDFs, all on one screen. Free, and the file stays in your browser.",
    h1: "How to rearrange pages in a PDF",
    summary:
      "Open [Organize PDF](/tools/organize-pdf), choose the file, and drag the page thumbnails into the order you want. You can rotate or delete pages and add pages from another PDF on the same screen, then save the result as a new PDF.",
    published: "2026-11-14",
    time: "17:00",
    updated: "2026-11-14",
    cluster: "pdf-tools",
    tools: ["organize-pdf", "alternate-mix", "merge-pdf", "rotate-pdf"],
    sections: [
      {
        heading: "Rearrange step by step",
        blocks: [
          {
            steps: [
              "Open [Organize PDF](/tools/organize-pdf) and choose the PDF. Each page shows as a thumbnail.",
              "Drag thumbnails to move pages; drop them where they belong.",
              "Use the buttons on a page to rotate it or delete it, or reverse the whole order in one click.",
              "Use Add pages to bring in pages from another PDF, and Undo if you change your mind.",
              "Save the new PDF.",
            ],
          },
          { note: "Pages are copied as they are, so text stays selectable and images keep their quality." },
        ],
      },
      {
        heading: "Special cases",
        blocks: [
          {
            list: [
              "Scanned fronts and backs as two files: [Alternate & Mix](/tools/alternate-mix) interleaves them automatically.",
              "Whole files in a new order: [Merge PDF](/tools/merge-pdf) arranges files rather than pages.",
              "Many pages turned the wrong way: [Rotate PDF](/tools/rotate-pdf) rotates a list of pages in one go.",
            ],
          },
          { p: "To remove pages rather than move them, see [How to delete pages from a PDF](/guides/delete-pages-from-pdf)." },
        ],
      },
    ],
    faq: [
      ["Can I rearrange pages on my phone?", "Yes. Organize PDF works in mobile browsers, though a bigger screen makes long documents easier."],
      ["Does it change my original file?", "No. You download a new PDF with the new order."],
    ],
  },
];
