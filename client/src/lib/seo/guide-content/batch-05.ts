import type { Guide } from "../guides";

/** Scheduled guides 41–50 (7–10 November 2026). */
export const BATCH_05: Guide[] = [
  {
    slug: "add-name-and-date-to-photo",
    title: "How to Add Your Name and Date to a Photo for Exam Forms",
    description: "Some forms, like UPSC's, want your name and the date the photo was taken printed on it. How to add a neat name-and-date strip to your photo for free.",
    h1: "How to add your name and date to a photo for exam forms",
    summary:
      "Crop the photo so there's a little space below your chin, then open the [Image editor](/tools/image-editor), add a text layer with your name and the date the photo was taken, give it a white background and place it across the bottom. Save it and fit it to the form's size with [Resize image](/tools/resize-image).",
    published: "2026-11-07",
    time: "09:00",
    updated: "2026-11-07",
    cluster: "image-tools",
    tools: ["image-editor", "crop-image", "resize-image"],
    sections: [
      {
        heading: "Which forms ask for it",
        blocks: [
          { p: "UPSC's online applications ask for a recent photograph with the candidate's name and the date of taking the photograph printed on it, and some state commissions and recruitment boards have followed. It shows the photo is recent and belongs to you. If your notification doesn't ask for it, don't add it." },
        ],
      },
      {
        heading: "Add the name and date step by step",
        blocks: [
          {
            steps: [
              "Open [Crop image](/tools/crop-image) and crop to the passport shape, leaving extra room below your chin for the text strip.",
              "Open the cropped photo in the [Image editor](/tools/image-editor) and go to the Text tab.",
              "Type your name on the first line and the date the photo was taken on the second (for example 07/11/2026).",
              "Choose a plain font in black, give the text a white background, and centre it at the bottom of the photo without covering your face.",
              "Open Save, keep JPG, and download.",
              "Fit it to the form with [Resize image](/tools/resize-image), turning on Limit the file size if there's a KB range.",
            ],
          },
        ],
      },
      {
        heading: "Getting it right",
        blocks: [
          {
            list: [
              "Use the name exactly as in your application, in capitals if the notice says so.",
              "The date must be when the photo was taken, not today's date if you're reusing an older photo, and the photo must be within the recency the notice allows.",
              "Make the text large enough to read when the photo is shown small: about a tenth of the photo's height per line works well.",
              "Keep your face fully visible, with the strip below the chin.",
            ],
          },
          { p: "For the rest of UPSC's photo and signature rules, see [UPSC photo and signature size](/guides/upsc-photo-and-signature-size)." },
        ],
      },
    ],
    faq: [
      ["Should the name and date be inside the photo or below it?", "On the photo itself, along the bottom, below the face. Forms want a single image file, so the strip must be part of the picture."],
      ["Can I write the name by hand on a printed photo and scan it?", "That works too if it's neat and readable, but typed text is clearer at small sizes."],
    ],
  },
  {
    slug: "photo-to-pdf-under-200kb",
    title: "How to Convert a Photo to a PDF Under 200 KB for Upload Portals",
    description: "Turn a photo of a document into a PDF under 200 KB (or 100 KB) for exam, job and government portals, while keeping the text readable. Free and private.",
    h1: "How to convert a photo to a PDF under 200 KB",
    summary:
      "Shrink the photo first with [Compress image](/tools/compress-image) (File size: about 150 KB), then turn it into a PDF with [JPG to PDF](/tools/jpg-to-pdf). If the PDF is still above 200 KB, run it through [Compress PDF](/tools/compress-pdf). Compressing the photo before it goes into the PDF gives the cleanest result.",
    published: "2026-11-07",
    time: "13:00",
    updated: "2026-11-07",
    cluster: "pdf-converter",
    tools: ["jpg-to-pdf", "compress-image", "compress-pdf", "crop-image"],
    sections: [
      {
        heading: "Step by step",
        blocks: [
          {
            steps: [
              "Crop the photo to just the document with [Crop image](/tools/crop-image): no table, no fingers.",
              "Open [Compress image](/tools/compress-image), choose File size and enter about 75% of the PDF limit (150 KB for a 200 KB limit, 75 KB for 100 KB).",
              "Open [JPG to PDF](/tools/jpg-to-pdf), add the compressed photo, and choose A4 if the portal expects a printable page, or Same as image.",
              "Press Convert to PDF and check the size of the download.",
              "If it's still too big, open [Compress PDF](/tools/compress-pdf) and use Recommended or Extreme.",
            ],
          },
          { note: "All of these tools work in your browser, so your documents stay on your phone or computer." },
        ],
      },
      {
        heading: "Several photos in one PDF",
        blocks: [
          { p: "For a document with several pages, compress each photo, then add them all to JPG to PDF in order. Divide the limit by the number of pages when compressing: for a 200 KB limit and two pages, aim for about 75 KB per photo." },
        ],
      },
      {
        heading: "Keep it readable",
        blocks: [
          {
            list: [
              "Shoot in daylight, straight from above, so the page is evenly lit; shadows waste space and hurt readability.",
              "For black-and-white documents, Compress PDF's Grayscale option saves a lot without losing legibility.",
              "Zoom in on the smallest text in the final PDF before uploading.",
            ],
          },
          { p: "More options for strict limits are in [How to upload certificates as small PDFs](/guides/upload-certificates-as-small-pdf)." },
        ],
      },
    ],
    faq: [
      ["Why is my PDF bigger than the photo?", "A PDF made from a large photo keeps all its pixels. Compressing the photo first, or the PDF afterwards, brings it down."],
      ["Can I get a single page under 50 KB?", "Usually, for a text document: crop tightly, compress the photo to about 40 KB and use Grayscale when compressing the PDF."],
    ],
  },
  {
    slug: "scan-documents-into-one-pdf",
    title: "How to Scan Documents With Your Phone Into One Small PDF",
    description: "Scan marksheets, certificates and ID with your phone, put them in the right order in one PDF, number the pages and keep the file small enough to upload.",
    h1: "How to scan documents with your phone into one small PDF",
    summary:
      "Open [Scan to PDF](/tools/scan-to-pdf) on your phone and capture each page in the order the form lists them. Fix the order or rotation with [Organize PDF](/tools/organize-pdf), add page numbers if the documents will be referred to, and shrink the result with [Compress PDF](/tools/compress-pdf). No app to install, and the scans stay on your phone.",
    published: "2026-11-07",
    time: "18:00",
    updated: "2026-11-07",
    cluster: "pdf-tools",
    tools: ["scan-to-pdf", "organize-pdf", "compress-pdf", "page-numbers"],
    sections: [
      {
        heading: "Scan the pages",
        blocks: [
          {
            steps: [
              "Lay out the documents in the order the form or office wants them, for example: ID proof, 10th marksheet, 12th marksheet, degree, experience letters.",
              "Open [Scan to PDF](/tools/scan-to-pdf), allow camera access, and hold the phone flat above each page.",
              "Capture every page, including back sides that carry information.",
              "Check the thumbnails, delete blurry shots and retake them, then build the PDF.",
            ],
          },
        ],
      },
      {
        heading: "Tidy and finish",
        blocks: [
          {
            steps: [
              "Open [Organize PDF](/tools/organize-pdf) to drag pages into order, rotate sideways ones and delete duplicates.",
              "Add numbers with [Add page numbers](/tools/page-numbers), using the “Page 1 of N” format, so nobody wonders whether pages are missing.",
              "Compress the file with [Compress PDF](/tools/compress-pdf). Turn on Grayscale images for black-and-white documents.",
              "Name it clearly, for example “Priya-Sharma-Documents.pdf”.",
            ],
          },
        ],
      },
      {
        heading: "Scanning tips",
        blocks: [
          {
            list: [
              "Daylight from a window beats a ceiling bulb, which causes shadows.",
              "Put light paper on a dark surface so page edges are clear.",
              "Hold the phone parallel to the page; tilted shots make text look slanted and smaller.",
            ],
          },
          { p: "If each document must be a separate small PDF instead, see [How to upload certificates as small PDFs](/guides/upload-certificates-as-small-pdf)." },
        ],
      },
    ],
    faq: [
      ["Can I search the text in my scanned PDF?", "Not until it's recognised: run OCR PDF on it to add a searchable text layer."],
      ["Does Scan to PDF work on a laptop?", "Yes, with the webcam, or by choosing photos you've already taken."],
    ],
  },
  {
    slug: "file-size-exceeds-limit-upload",
    title: "“File Size Exceeds Limit” on a Government Portal: 7 Ways to Fix It",
    description: "Seven ways to get a PDF or photo under a portal's upload limit: compress, grayscale, split, resize, change format, drop pages or rescan. With free tools.",
    h1: "“File size exceeds limit” on a government portal: 7 ways to fix it",
    summary:
      "Start with [Compress PDF](/tools/compress-pdf) (or [Compress image](/tools/compress-image) for photos). If that's not enough, use grayscale, remove pages that aren't needed, split the file with [Split by size](/tools/split-by-size), or rescan at a lower resolution. One of these fixes almost every “file too large” error.",
    published: "2026-11-08",
    time: "10:00",
    updated: "2026-11-08",
    cluster: "pdf-tools",
    tools: ["compress-pdf", "compress-image", "split-by-size", "organize-pdf"],
    sections: [
      {
        heading: "The seven fixes",
        blocks: [
          {
            steps: [
              "Compress the PDF: [Compress PDF](/tools/compress-pdf) with Recommended, then Extreme if needed. Scans often shrink by 50–90%.",
              "Turn images grayscale: in Compress PDF, turn on Grayscale images. Colour is rarely needed for marksheets, ID copies or letters.",
              "Shrink photos before they go into the PDF: [Compress image](/tools/compress-image) with a File size target, then make the PDF.",
              "Resize photos and signatures to the dimensions the form asks for with [Resize image](/tools/resize-image); oversized images are the usual problem.",
              "Change the format: PNG photos are large; save them as JPG with [Convert image](/tools/convert-image).",
              "Remove pages the portal doesn't need, such as blank backs or instruction pages, with [Organize PDF](/tools/organize-pdf).",
              "Split the file: if the portal accepts several files, [Split by size](/tools/split-by-size) makes parts that each fit; for GST uploads, [GST filing prep](/tools/gst-filing-prep) compresses and splits in one go.",
            ],
          },
        ],
      },
      {
        heading: "If nothing works, rescan",
        blocks: [
          { p: "A document scanned at 600 DPI in colour can be 10–20 MB per page, and compression has limits. Rescan at 150–200 DPI in black and white or grayscale: text stays crisp and pages come out at a fraction of the size." },
        ],
      },
      {
        heading: "When the file is too small",
        blocks: [
          { p: "Some forms also have a minimum, such as 10 KB for a signature or 50 KB for a certificate. Resize to slightly larger dimensions, or compress less, rather than adding blank space." },
          { p: "Detailed walkthroughs: [How to compress a PDF](/guides/how-to-compress-a-pdf), [How to compress a photo to 20, 50 or 100 KB](/guides/compress-photo-to-50kb) and [How to convert a photo to a PDF under 200 KB](/guides/photo-to-pdf-under-200kb)." },
        ],
      },
    ],
    faq: [
      ["Why does compressing a text PDF barely help?", "Text takes very little space; size comes from images. A text-only PDF is usually already small."],
      ["Is it safe to compress government documents online?", "These tools run in your browser, so the documents never leave your device."],
    ],
  },
  {
    slug: "change-date-in-pdf",
    title: "How to Change a Date or Number in a PDF",
    description: "Update a date, amount or reference number in a PDF you created, so it keeps the original font and the old value is removed from the file.",
    h1: "How to change a date or number in a PDF",
    summary:
      "Open the PDF in the [PDF editor](/tools/edit-pdf), choose Edit text, click the line with the date or number and type the new value. It's written in the same font, size and colour, and the old value is deleted from the file rather than covered. Use it for your own documents: quotes, invoices, letters, résumés, schedules.",
    published: "2026-11-08",
    time: "17:00",
    updated: "2026-11-08",
    cluster: "pdf-tools",
    tools: ["edit-pdf", "pdf-forms", "compare-pdf"],
    sections: [
      {
        heading: "Change it step by step",
        blocks: [
          {
            steps: [
              "Open the [PDF editor](/tools/edit-pdf) and choose the PDF.",
              "Pick Edit text. Lines of text get dashed outlines.",
              "Click the line with the date or number, select the old value and type the new one.",
              "Press Esc and check the line still lines up with its neighbours.",
              "Download the PDF.",
            ],
          },
          { p: "Numbers usually use digits the document already contains, so they match perfectly. If the PDF is a scan, there's no text to edit; you can type over it with Add text instead." },
        ],
      },
      {
        heading: "Dates in forms and tables",
        blocks: [
          {
            list: [
              "If the date is in a fillable form field, use [PDF Forms](/tools/pdf-forms) instead: it lists every field to change.",
              "Values in a table are often separate pieces of text; click each cell's text separately.",
              "When you change an amount, check totals and amounts in words elsewhere in the document.",
            ],
          },
          { p: "To double-check nothing else changed, compare the old and new files with [Compare PDF](/tools/compare-pdf)." },
        ],
      },
      {
        heading: "Only change your own documents",
        blocks: [
          { note: "Changing dates, amounts or names on certificates, bank statements, bills, ID or any official document issued to you is forgery, and a criminal offence. Ask the issuer for a corrected copy instead." },
        ],
      },
    ],
    faq: [
      ["Will the new date look different from the rest?", "No. It's written with the document's own font at the same size and colour, so it blends in."],
      ["Can I change a date in a scanned PDF?", "Scans are images, so the original can't be edited as text. For your own documents, cover it with the editor's Whiteout tool and type the new date on top."],
    ],
  },
  {
    slug: "resume-pdf-to-word",
    title: "How to Convert a Resume From PDF to Word and Keep the Layout",
    description: "Turn a résumé PDF back into an editable Word file with headings, bullet points and tables intact, and fix the parts designer templates lose.",
    h1: "How to convert a résumé from PDF to Word and keep the layout",
    summary:
      "Open [PDF to Word](/tools/pdf-to-word), choose the résumé and press Convert to Word. You get a .docx with real headings, paragraphs, bullet lists and tables that you can edit in Word, Google Docs or the [Word editor](/tools/word-editor). Single-column résumés convert closely; two-column designer layouts need some tidying.",
    published: "2026-11-09",
    time: "09:00",
    updated: "2026-11-09",
    cluster: "pdf-converter",
    tools: ["pdf-to-word", "word-editor", "word-to-pdf", "edit-pdf"],
    sections: [
      {
        heading: "Convert step by step",
        blocks: [
          {
            steps: [
              "Open [PDF to Word](/tools/pdf-to-word) and choose your résumé.",
              "Press Convert to Word and download the .docx.",
              "Open it in Word, Google Docs, LibreOffice or our [Word editor](/tools/word-editor).",
              "Make your changes, then save it as PDF again, for example with [Word to PDF](/tools/word-to-pdf).",
            ],
          },
          { note: "The conversion runs in your browser; your résumé isn't uploaded." },
        ],
      },
      {
        heading: "What converts well, and what doesn't",
        blocks: [
          {
            list: [
              "Single-column résumés: headings, bullet points, dates and paragraphs come through as normal, editable text.",
              "Tables, such as skills grids: converted to Word tables.",
              "Two-column and sidebar designs: the converter rebuilds the text as one flow, so the sidebar moves above or below the main column. Rebuild the columns with a two-column table in Word.",
              "Icons, photos and decorative shapes may need re-inserting.",
              "Scanned résumés need [OCR](/tools/ocr-pdf) first, because there's no text to convert.",
            ],
          },
        ],
      },
      {
        heading: "Just changing a few words?",
        blocks: [
          { p: "For a new phone number, date or job title, editing the PDF directly keeps the design exactly as it is. See [How to edit a résumé PDF](/guides/edit-resume-pdf)." },
        ],
      },
    ],
    faq: [
      ["Will the fonts be the same?", "Not always: the text is rebuilt as a normal Word document, so fonts may differ from the PDF. Choose a common font in Word for a consistent look."],
      ["Is the converted résumé ATS-friendly?", "A clean single-column Word résumé with real headings is generally easy for applicant tracking systems to read."],
    ],
  },
  {
    slug: "pdf-to-excel-keep-tables",
    title: "How to Convert PDF to Excel Without Breaking the Tables",
    description: "Get tables out of a PDF into Excel with rows and columns intact, then fix the common problems: numbers stored as text, merged columns and repeated headers.",
    h1: "How to convert PDF to Excel without breaking the tables",
    summary:
      "Open [PDF to Excel](/tools/pdf-to-excel), choose the PDF and press Convert to Excel. Rows and columns are rebuilt from where the text sits on each page, one worksheet per page. Then convert number columns from text to numbers, remove repeated headers and split any merged columns. Scanned PDFs need [OCR PDF](/tools/ocr-pdf) first.",
    published: "2026-11-09",
    time: "13:00",
    updated: "2026-11-09",
    cluster: "pdf-converter",
    tools: ["pdf-to-excel", "pdf-to-csv", "ocr-pdf", "excel-editor"],
    sections: [
      {
        heading: "Convert step by step",
        blocks: [
          {
            steps: [
              "Open [PDF to Excel](/tools/pdf-to-excel) and choose a PDF with selectable text.",
              "Press Convert to Excel.",
              "Open the .xlsx in Excel, Google Sheets or the [Excel editor](/tools/excel-editor).",
              "Check a few rows against the PDF before relying on the data.",
            ],
          },
        ],
      },
      {
        heading: "Fixing common problems",
        blocks: [
          {
            list: [
              "Numbers as text (left-aligned, or a green triangle in Excel): select the column and use Data → Text to Columns → Finish, or the Convert to Number option.",
              "Two columns in one: tables without clear gaps between columns can merge. Split them with Text to Columns using spaces or a fixed width.",
              "One table across several pages becomes several worksheets: copy the rows into one sheet and delete repeated header rows.",
              "Cells that wrapped onto two lines in the PDF may become two rows; join them before sorting.",
            ],
          },
        ],
      },
      {
        heading: "Tips for better tables",
        blocks: [
          {
            list: [
              "PDFs exported from software (reports, invoices, price lists) convert far better than scans.",
              "For data you'll import elsewhere, [PDF to CSV](/tools/pdf-to-csv) gives plain values without formatting.",
              "Scanned tables need [OCR PDF](/tools/ocr-pdf) first; check numbers carefully afterwards.",
            ],
          },
          { p: "For statements specifically, see [How to convert a bank statement PDF to Excel](/guides/bank-statement-pdf-to-excel)." },
        ],
      },
    ],
    faq: [
      ["Does it keep formatting like colours and borders?", "It focuses on getting values into the right cells; formatting such as colours and borders isn't carried over."],
      ["Can I convert only one page?", "Convert the whole file and use that page's worksheet, or split the page out first with Split PDF."],
    ],
  },
  {
    slug: "bill-of-supply-vs-tax-invoice",
    title: "Bill of Supply vs Tax Invoice: Which One Should You Issue?",
    description: "When GST law requires a bill of supply instead of a tax invoice, what each must contain, and what composition dealers must print on their bills.",
    h1: "Bill of supply vs tax invoice: which one should you issue?",
    summary:
      "Under GST, a registered business issues a tax invoice for taxable supplies, and a bill of supply when it supplies only exempt goods or services, or when it's under the composition scheme. A bill of supply shows no tax, because none is charged. [GST invoice](/tools/gst-invoice) makes tax invoices; for a bill of supply, start from the Invoice template in the [Excel editor](/tools/excel-editor).",
    published: "2026-11-09",
    time: "18:00",
    updated: "2026-11-09",
    cluster: "office-tools",
    tools: ["gst-invoice", "excel-editor", "excel-to-pdf"],
    sections: [
      {
        heading: "The difference",
        blocks: [
          {
            list: [
              "Tax invoice: for taxable supplies. Shows the tax rate and the CGST, SGST/UTGST or IGST charged, and lets a registered buyer claim input tax credit.",
              "Bill of supply: for exempt supplies, and for every supply by a composition taxpayer. Shows no tax, and the buyer can't claim input tax credit on it.",
            ],
          },
          { p: "The rule comes from section 31(3)(c) of the CGST Act; the contents of each document are set by Rules 46 (tax invoice) and 49 (bill of supply) of the CGST Rules." },
        ],
      },
      {
        heading: "What a bill of supply must show",
        blocks: [
          {
            list: [
              "Supplier's name, address and GSTIN.",
              "A serial number unique for the financial year, and the date.",
              "Buyer's name, address and GSTIN if registered.",
              "HSN code of goods or SAC of services, and a description.",
              "Value of the supply after any discount.",
              "Signature or digital signature of the supplier or an authorised person (not needed on an electronic bill).",
            ],
          },
          { note: "Composition taxpayers must also print “composition taxable person, not eligible to collect tax on supplies” at the top of each bill of supply." },
        ],
      },
      {
        heading: "Selling both taxable and exempt items",
        blocks: [
          { p: "If you make both taxable and exempt supplies to an unregistered buyer, Rule 46A lets you issue a single invoice-cum-bill of supply covering both, which must contain the details required by both rules." },
        ],
      },
      {
        heading: "Making the document",
        blocks: [
          {
            steps: [
              "For taxable supplies, use [GST invoice](/tools/gst-invoice): it works out CGST/SGST or IGST, totals and the amount in words, and downloads a PDF.",
              "For a bill of supply, open the [Excel editor](/tools/excel-editor), start from the Invoice template, remove the tax columns and add the details above.",
              "Save it as PDF with [Excel to PDF](/tools/excel-to-pdf) or from the editor's download menu.",
            ],
          },
          { p: "For the fields of a tax invoice, see [GST invoice format](/guides/gst-invoice-format)." },
        ],
      },
    ],
    faq: [
      ["Can a composition dealer issue a tax invoice?", "No. Composition taxpayers can't charge GST to customers, so they issue a bill of supply."],
      ["Does an exempt supply need any document?", "Yes. A registered person supplying exempt goods or services issues a bill of supply."],
    ],
  },
  {
    slug: "form-26as-ais-password",
    title: "Form 26AS and AIS PDF Password: How to Open Your Tax Statements",
    description: "AIS and TIS PDFs open with your PAN in lowercase plus date of birth (DDMMYYYY); Form 26AS from TRACES uses your date of birth. Examples and how to unlock them.",
    h1: "Form 26AS and AIS PDF password: how to open your tax statements",
    summary:
      "Your Annual Information Statement (AIS) and Taxpayer Information Summary (TIS) PDFs open with your PAN in lowercase followed by your date of birth as DDMMYYYY, for example abcde1234f05031992. Form 26AS downloaded from TRACES uses your date of birth (DDMMYYYY) wherever a password is asked for. [Unlock PDF](/tools/unlock-pdf) saves copies without the password.",
    published: "2026-11-10",
    time: "10:00",
    updated: "2026-11-10",
    cluster: "pdf-tools",
    tools: ["unlock-pdf", "pdf-to-excel", "merge-pdf"],
    sections: [
      {
        heading: "Passwords at a glance",
        blocks: [
          {
            list: [
              "AIS (PDF and JSON) and TIS: PAN in lowercase + date of birth as DDMMYYYY → abcde1234f05031992.",
              "Form 26AS from TRACES: date of birth as DDMMYYYY → 05031992, where the file is protected.",
              "Companies and other entities use their date of incorporation or formation in place of a date of birth.",
            ],
          },
          { p: "Your ITR-V and income tax intimations use the same password as the AIS; see [ITR-V acknowledgement PDF password](/guides/itr-v-pdf-password)." },
        ],
      },
      {
        heading: "Unlock and use the statements",
        blocks: [
          {
            steps: [
              "Open [Unlock PDF](/tools/unlock-pdf) and choose the AIS or 26AS PDF.",
              "Enter the password and press Unlock PDF.",
              "Download the copy, which opens without a password.",
            ],
          },
          { p: "To check TDS and interest entries against your own records, convert the unlocked statement with [PDF to Excel](/tools/pdf-to-excel). To keep the year's tax papers together, combine them with [Merge PDF](/tools/merge-pdf)." },
          { note: "Unlocking runs in your browser: your tax statements aren't uploaded." },
        ],
      },
      {
        heading: "New form numbers",
        blocks: [
          { p: "Under the Income-tax Rules, 2026, which apply from 1 April 2026, Form 26AS has been renumbered as Form 168. Statements for earlier years keep their old names." },
        ],
      },
    ],
    faq: [
      ["Which is more complete, AIS or Form 26AS?", "AIS covers more information, such as interest, dividends and securities transactions; 26AS focuses on tax deducted and paid. Check both before filing."],
      ["Why won't my AIS open with my date of birth alone?", "The AIS needs your PAN in lowercase before the date of birth. Date of birth alone is for Form 26AS."],
    ],
  },
  {
    slug: "convert-logo-to-vector",
    title: "How to Turn a Logo Image Into a Vector (SVG) for Printing",
    description: "Printers and sign makers ask for a vector logo. Turn a JPG or PNG logo into a clean, scalable SVG, and know when a logo needs redrawing instead.",
    h1: "How to turn a logo image into a vector for printing",
    summary:
      "Open [JPG to SVG](/tools/jpg-to-svg), choose your logo, pick Logo mode, turn on Remove white background and press Convert to vector. The SVG scales to any size without blurring and opens in Illustrator, CorelDRAW, Inkscape and Figma. Blurry or tiny logos trace poorly; for those, start from the largest copy you can find.",
    published: "2026-11-10",
    time: "17:00",
    updated: "2026-11-10",
    cluster: "image-tools",
    tools: ["jpg-to-svg", "crop-image", "convert-image", "image-editor"],
    sections: [
      {
        heading: "Why printers want vectors",
        blocks: [
          { p: "A JPG or PNG logo is made of pixels, so it turns blurry and jagged when blown up for a banner, signboard, T-shirt or vehicle wrap. A vector logo (SVG, AI, EPS, PDF or CDR) is made of shapes and stays sharp at any size, and printers can change its colours exactly." },
        ],
      },
      {
        heading: "Convert step by step",
        blocks: [
          {
            steps: [
              "Find the largest, sharpest copy of the logo: the original file, your website's header image, or a high-quality PDF.",
              "Crop it to just the logo with [Crop image](/tools/crop-image).",
              "Open [JPG to SVG](/tools/jpg-to-svg), choose Logo, select Smooth for clean curves, and turn on Remove white background.",
              "Press Convert to vector and download the SVG.",
              "Open it in Illustrator, CorelDRAW or Inkscape to check the shapes, adjust colours, and save in the format your printer asked for (AI, EPS, PDF or CDR).",
            ],
          },
        ],
      },
      {
        heading: "When to redraw instead",
        blocks: [
          {
            list: [
              "Tiny logos, such as a 100-pixel favicon, don't have enough detail to trace.",
              "Logos with gradients, shadows or photos become many small shapes.",
              "Text in the logo traces as shapes, not a font: if letters look wobbly, retype them in the right font in a design program.",
            ],
          },
          { p: "If the image is small, enlarging it slightly and raising contrast in the [Image editor](/tools/image-editor) before tracing can help. For laser cutting and Cricut, see [How to convert JPG to SVG for CorelDRAW, laser cutting and Cricut](/guides/jpg-to-svg-for-coreldraw-laser-cutting)." },
        ],
      },
    ],
    faq: [
      ["Is SVG accepted by printers?", "Most accept SVG or can open it. If they insist on AI, EPS or CDR, open the SVG in Illustrator, Inkscape or CorelDRAW and save it in that format."],
      ["Will my logo's colours stay exact?", "Tracing picks the main colours. For brand-exact colours, set the HEX or Pantone values on the shapes afterwards."],
    ],
  },
];
