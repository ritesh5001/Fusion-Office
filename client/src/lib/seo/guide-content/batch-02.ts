import type { Guide } from "../guides";

/** Scheduled guides 11–20 (26–29 October 2026). */
export const BATCH_02: Guide[] = [
  {
    slug: "gst-show-cause-notice-reply-pdf",
    title: "How to Prepare a GST Show Cause Notice Reply as a PDF That Uploads",
    description: "Put your reply to a GST show cause notice and its annexures into PDFs the portal accepts: clear files, the right order, and each one under the 5 MB limit.",
    h1: "How to prepare a GST show cause notice reply as a PDF that uploads",
    summary:
      "Write the reply letter, turn it into a PDF, group your annexures into a few clearly named PDFs, and make sure each file is a PDF or JPEG under 5 MB. [GST filing prep](/tools/gst-filing-prep) compresses a large reply and, if needed, splits it into numbered parts that each fit. Upload the parts in order before the deadline in the notice.",
    published: "2026-10-26",
    time: "09:00",
    updated: "2026-10-26",
    cluster: "pdf-tools",
    tools: ["gst-filing-prep", "word-to-pdf", "merge-pdf", "page-numbers"],
    sections: [
      {
        heading: "What you are uploading",
        blocks: [
          { p: "A show cause notice (often issued with a summary in form DRC-01) is answered on the GST portal, typically in form DRC-06, with your written reply and the documents that support it: invoices, ledgers, bank statements, contracts, reconciliations. The portal accepts attachments as PDF or JPEG files of up to 5 MB each, and only a limited number of files per reply." },
          { p: "This guide covers getting the documents into a shape the portal accepts. What the reply should say is a matter for you and your tax adviser." },
        ],
      },
      {
        heading: "Prepare the files step by step",
        blocks: [
          {
            steps: [
              "Write the reply letter in Word and convert it with [Word to PDF](/tools/word-to-pdf), so the formatting can't shift.",
              "Group the annexures by topic (for example, all invoices together) and combine each group with [Merge PDF](/tools/merge-pdf), in the order your reply refers to them.",
              "Add page numbers with [Add page numbers](/tools/page-numbers), so your reply can point to “Annexure B, page 14”.",
              "Run each PDF through [GST filing prep](/tools/gst-filing-prep) with the 5 MB limit. It compresses first and splits only when it must.",
              "Name the files clearly, such as “Reply.pdf”, “Annexure-A-Invoices-part1.pdf”, and upload them in order.",
            ],
          },
        ],
      },
      {
        heading: "Keep scans readable",
        blocks: [
          {
            list: [
              "Scan in black and white or grayscale at 150–200 DPI. Colour scans at 600 DPI are the usual reason files are huge.",
              "Straighten and crop pages so text isn't cut off at the edges.",
              "Open each final file and zoom in on a dense page, such as a ledger, before uploading.",
            ],
          },
          { p: "For the full list of portal limits, see [GST portal upload size limit](/guides/gst-portal-upload-size-limit)." },
        ],
      },
    ],
    faq: [
      ["What if I have more documents than the reply allows?", "Merge related documents into fewer PDFs before uploading, and keep each under 5 MB. Your adviser can tell you whether to submit extra documents separately or at a personal hearing."],
      ["Are my documents uploaded to Fusion Office?", "No. Merging, numbering and GST filing prep run in your browser. Word to PDF is converted on our server and deleted as soon as the PDF is ready."],
    ],
  },
  {
    slug: "edit-resume-pdf",
    title: "How to Edit a Resume PDF: Change Dates, Titles and Contact Details",
    description: "Update a résumé when you only have the PDF: change dates, job titles and contact details, add a new line, and keep the file small for job portals.",
    h1: "How to edit a résumé PDF",
    summary:
      "For small updates (a new phone number, an end date, a job title) open the résumé in the [PDF editor](/tools/edit-pdf), choose Edit text and click the line to change. The new words keep the résumé's font, size and colour. For a full rewrite, convert it with [PDF to Word](/tools/pdf-to-word) and edit the document instead.",
    published: "2026-10-26",
    time: "13:00",
    updated: "2026-10-26",
    cluster: "pdf-tools",
    tools: ["edit-pdf", "pdf-to-word", "compress-pdf", "privacy-scanner"],
    sections: [
      {
        heading: "Quick edits in the PDF",
        blocks: [
          {
            steps: [
              "Open the [PDF editor](/tools/edit-pdf) and choose your résumé.",
              "Pick Edit text and click the line with the detail to change, such as “2023 – Present”.",
              "Type the new text and press Esc.",
              "To add a line, choose Add text, click where it should go, and match the size and font in the properties panel.",
              "Download the updated résumé.",
            ],
          },
          { p: "The old words are deleted from the file, so a recruiter copying text from your résumé gets the new version, not both." },
        ],
      },
      {
        heading: "When to convert to Word instead",
        blocks: [
          { p: "Adding a new job with several bullet points, reordering sections or changing the layout is easier in a word processor. [PDF to Word](/tools/pdf-to-word) rebuilds the résumé as a .docx with real headings, paragraphs and lists. Designer templates may need some tidying afterwards, so keep the original PDF to compare." },
          { p: "If your résumé was made with LaTeX or Overleaf, see [How to edit a LaTeX résumé PDF](/guides/edit-latex-resume-pdf), and for font matching in general, [How to edit text in a PDF without changing the font](/guides/edit-pdf-text-same-font)." },
        ],
      },
      {
        heading: "Before you send it",
        blocks: [
          {
            list: [
              "Search the PDF for your old phone number or email to make sure no copy remains.",
              "Check the file's hidden properties: [Privacy scanner](/tools/privacy-scanner) shows the author name, software and other details stored in the PDF.",
              "Keep it under the portal's limit (often 2 MB or less): [Compress PDF](/tools/compress-pdf) shrinks photo-heavy résumés without blurring the text.",
              "Name the file with your name, for example “Priya-Sharma-Resume.pdf”.",
            ],
          },
        ],
      },
    ],
    faq: [
      ["Can I edit a Canva résumé PDF?", "Usually, yes. Canva exports real text in most designs, so Edit text works. If a line can't be selected, it was exported as an image; use PDF to Word or edit the design in Canva."],
      ["Will editing break the layout?", "Editing one line at a time keeps everything else in place. Keep new text close to the original length so it doesn't run into other content."],
    ],
  },
  {
    slug: "remove-watermark-from-pdf",
    title: "How to Remove a Watermark From a PDF (Delete It, Not Cover It)",
    description: "Delete “DRAFT”, “CONFIDENTIAL” or logo watermarks from a PDF so they're gone from the file. Choose which marks to remove and preview the result first.",
    h1: "How to remove a watermark from a PDF",
    summary:
      "Open [Remove watermark](/tools/remove-watermark) and choose the PDF. The tool finds text, images and shapes that repeat across pages, shows each one, and deletes the ones you tick from the page content itself. Preview the result and download the clean PDF. It works on watermarks added digitally, not on marks that are part of a scanned image.",
    published: "2026-10-26",
    time: "18:00",
    updated: "2026-10-26",
    cluster: "pdf-tools",
    tools: ["remove-watermark", "edit-pdf", "watermark-pdf", "remove-watermark-image"],
    sections: [
      {
        heading: "Remove a watermark step by step",
        blocks: [
          {
            steps: [
              "Open [Remove watermark](/tools/remove-watermark) and choose your PDF.",
              "Look through the items it found. Each has a preview: a “DRAFT” stamp, a logo in the corner, a diagonal “CONFIDENTIAL”.",
              "Tick the ones to remove and press Remove.",
              "Check the preview, then download the cleaned PDF.",
            ],
          },
          { note: "Everything happens in your browser, so the document isn't uploaded." },
        ],
      },
      {
        heading: "Why deleting beats covering",
        blocks: [
          { p: "Painting a white box over a watermark hides it on screen, but the watermark is still in the file: it can show through on coloured backgrounds, reappear when someone moves the box, and still be found by search. Removing the watermark object leaves the page exactly as it was underneath." },
        ],
      },
      {
        heading: "When it won't work",
        blocks: [
          {
            list: [
              "Scanned documents: the watermark is part of the page image, so it can't be separated from the text. For photos and single images, [Remove watermark from image](/tools/remove-watermark-image) fills small marks from their surroundings.",
              "Watermarks drawn as part of each page's design, rather than repeated identically, may not be detected. You can delete individual objects in the [PDF editor](/tools/edit-pdf).",
              "Password-protected files need unlocking first, with the password.",
            ],
          },
        ],
      },
      {
        heading: "Use it on documents you're allowed to change",
        blocks: [
          { p: "Removing your own “DRAFT” stamp from a final version, or a template's placeholder logo, is what this tool is for. Watermarks on other people's documents, stock images or paid content protect their rights; don't remove them without permission. To add your own watermark, use [Watermark PDF](/tools/watermark-pdf)." },
        ],
      },
    ],
    faq: [
      ["Will removing the watermark change the rest of the page?", "No. Only the objects you tick are removed; text, images and layout stay as they were."],
      ["Can I remove a watermark from a scanned PDF?", "Not cleanly, because the watermark is part of the page image. For small marks on images, try Remove watermark from image."],
    ],
  },
  {
    slug: "ilovepdf-alternative-no-upload",
    title: "Free iLovePDF Alternative That Doesn't Upload Your Files",
    description: "An honest comparison of iLovePDF's free plan and Fusion Office: per-file limits, where your files go, and which one suits which job. Checked October 2026.",
    h1: "A free iLovePDF alternative that doesn't upload your files",
    summary:
      "iLovePDF is a solid, widely used service, but its free plan caps each tool (for example one file of up to 15 MB for PDF to Word and OCR) and processes files on its servers. Fusion Office's PDF tools, such as [Compress PDF](/tools/compress-pdf), [Merge PDF](/tools/merge-pdf) and the [PDF editor](/tools/edit-pdf), work inside your browser without an account, so the file never leaves your device.",
    published: "2026-10-27",
    time: "10:00",
    updated: "2026-10-27",
    cluster: "pdf-tools",
    tools: ["compress-pdf", "merge-pdf", "edit-pdf", "pdf-to-word"],
    sections: [
      {
        heading: "iLovePDF's free plan, as listed on its pricing page",
        blocks: [
          { p: "These are the per-task limits iLovePDF's pricing page showed for its free plan in October 2026. They change from time to time, so check the page before relying on them." },
          {
            list: [
              "Merge: up to 25 files, 100 MB per task.",
              "Compress: up to 2 files, 200 MB.",
              "PDF to Word, Excel or PowerPoint, and Office to PDF: 1 file, 15 MB.",
              "OCR: 1 file, 15 MB; OCR inside PDF to Word is a paid feature.",
              "Edit PDF: 1 file, 100 MB; Sign: 3 files, 50 MB.",
              "The free plan shows ads, and features such as digital signatures, workflows and AI credits are paid.",
            ],
          },
        ],
      },
      {
        heading: "Where your files go",
        blocks: [
          { p: "iLovePDF processes documents on its own servers over an encrypted connection, holds ISO/IEC 27001 certification and lets paid users pick the processing region. That is a reasonable setup for most files." },
          { p: "Fusion Office takes a different approach: compressing, merging, splitting, editing, signing, protecting, unlocking and converting PDFs to Word, Excel or images all run in your browser. Conversions that need office software (Word, Excel or PowerPoint to PDF, for example) are done on our server and deleted as soon as the result is ready. You can confirm this with the test in [Do online PDF tools upload your files?](/guides/do-online-pdf-tools-upload-your-files)" },
        ],
      },
      {
        heading: "Which one to use",
        blocks: [
          {
            list: [
              "Choose iLovePDF if you need its desktop and mobile apps, e-signature requests with audit trails, an API, or integrations with Google Drive and Dropbox.",
              "Choose Fusion Office for private documents (ID cards, statements, contracts), large batches without per-task caps, editing existing text in its original font, and India-specific tools such as [GST filing prep](/tools/gst-filing-prep) and the exam photo tools.",
            ],
          },
          { p: "Both are free to try, so the simplest test is to run the same file through each and compare the result." },
        ],
      },
    ],
    faq: [
      ["Is Fusion Office really free?", "Yes. There's no sign-up, no limit on tasks and no watermark on your files."],
      ["Do I need an account?", "No. An account is only used if you choose to save documents to the cloud."],
    ],
  },
  {
    slug: "jpg-to-svg-for-coreldraw-laser-cutting",
    title: "How to Convert JPG to SVG for CorelDRAW, Laser Cutting and Cricut",
    description: "Turn a JPG or PNG into clean SVG vector paths for CorelDRAW, laser cutters, vinyl plotters and Cricut. Pick the right mode and settings for a usable result.",
    h1: "How to convert JPG to SVG for CorelDRAW, laser cutting and Cricut",
    summary:
      "Open [JPG to SVG](/tools/jpg-to-svg), choose your image, pick Logo for flat colours or Line art for black-and-white designs, turn on Remove white background, and press Convert to vector. Import the SVG into CorelDRAW, LightBurn or Cricut Design Space and the shapes are ready to scale, recolour or cut.",
    published: "2026-10-27",
    time: "17:00",
    updated: "2026-10-27",
    cluster: "image-tools",
    tools: ["jpg-to-svg", "crop-image", "cdr-converter"],
    sections: [
      {
        heading: "Convert step by step",
        blocks: [
          {
            steps: [
              "Crop away anything you don't want traced with [Crop image](/tools/crop-image): borders, text, background clutter.",
              "Open [JPG to SVG](/tools/jpg-to-svg) and choose the image.",
              "Pick the image type: Line art for black-and-white artwork, Logo for a few flat colours, Photo only for decorative effects.",
              "Choose Smooth for clean curves, or Precise to follow every edge, and turn on Remove white background.",
              "Press Convert to vector and download the SVG.",
            ],
          },
          { note: "Tracing happens on your device, so designs you're working on for clients aren't uploaded." },
        ],
      },
      {
        heading: "Using the SVG",
        blocks: [
          {
            list: [
              "CorelDRAW: File → Import (or Open) and choose the SVG. Every shape is editable, and you can save it as .cdr.",
              "Laser cutting (LightBurn, RDWorks, LaserGRBL): import the SVG and assign cut or engrave layers. Line art with Smooth gives the cleanest cut paths.",
              "Cricut Design Space: Upload → Upload image → choose the SVG. Each colour becomes its own layer you can cut from a different material.",
              "Inkscape, Illustrator and Figma open SVG directly.",
            ],
          },
        ],
      },
      {
        heading: "Getting a clean trace",
        blocks: [
          {
            list: [
              "Start from the largest, sharpest image you have. Blurry or tiny logos produce wobbly edges.",
              "Fewer colours trace better. A logo with gradients or shadows becomes many small shapes; simplify it first if you can.",
              "For cutting, use Line art or Logo. Photo mode creates thousands of tiny shapes that a cutter can't use.",
            ],
          },
          { p: "Already have a CorelDRAW file and need it in another format? See [How to open a CDR file without CorelDRAW](/guides/open-cdr-file-without-coreldraw)." },
        ],
      },
    ],
    faq: [
      ["Can I convert JPG directly to CDR?", "No free tool can write CorelDRAW's own format. Convert to SVG here, open it in CorelDRAW and save as .cdr; the shapes stay editable."],
      ["Why does my traced photo look like a painting?", "Vectors are made of flat shapes, so photos come out posterised. Tracing works best on logos, icons and line drawings."],
    ],
  },
  {
    slug: "ibps-photo-signature-thumb-declaration-size",
    title: "IBPS Photo, Signature, Thumb Impression and Declaration Sizes",
    description: "IBPS PO and Clerk upload sizes: photo 20–50 KB, signature 10–20 KB, left thumb 20–50 KB, handwritten declaration 50–100 KB, plus the live photo step.",
    h1: "IBPS photo, signature, thumb impression and declaration sizes",
    summary:
      "IBPS PO and Clerk applications ask for four JPG files: a photo (200 × 230 pixels, 20–50 KB), a signature (140 × 60 pixels, 10–20 KB), a left thumb impression (240 × 240 pixels, 20–50 KB) and a handwritten declaration (800 × 400 pixels, 50–100 KB), plus a live photo taken during the application. [Resize image](/tools/resize-image) sets the pixels and the KB limit together.",
    published: "2026-10-28",
    time: "09:00",
    updated: "2026-10-28",
    cluster: "image-tools",
    tools: ["resize-image", "thumbmark-maker", "crop-image", "compress-image"],
    sections: [
      {
        heading: "The four files",
        blocks: [
          {
            list: [
              "Photograph: 200 × 230 pixels preferred, 20–50 KB, JPG. Recent, colour, light background.",
              "Signature: 140 × 60 pixels, 10–20 KB, JPG. Black ink on white paper, not in capital letters.",
              "Left thumb impression: 240 × 240 pixels (scanned at 200 DPI, about 3 × 3 cm), 20–50 KB, JPG. Black or blue ink on white paper.",
              "Handwritten declaration: 800 × 400 pixels (10 × 5 cm at 200 DPI), 50–100 KB, JPG. In English, in your own handwriting, not in capitals.",
            ],
          },
          { p: "These figures come from recent IBPS notifications and have stayed the same for several years. Annexure III of your notification is the authoritative version." },
        ],
      },
      {
        heading: "The live photo",
        blocks: [
          { p: "Besides the uploaded photo, recent IBPS applications capture a live photograph with your webcam or phone camera during the application. Use good light, a plain background, and no cap or dark glasses. Keep the uploaded photo recent too, since the two are compared." },
        ],
      },
      {
        heading: "Resize each file",
        blocks: [
          {
            steps: [
              "Photograph or scan each item on white paper in daylight, and crop tightly with [Crop image](/tools/crop-image).",
              "Open [Resize image](/tools/resize-image), choose Pixels, and enter the size for that file (for example 140 × 60 for the signature).",
              "Turn on Limit the file size and enter the maximum (20 KB for the signature, 50 KB for the photo and thumb, 100 KB for the declaration).",
              "Save as JPG and check the file is above the minimum. If not, resize again with a higher quality.",
            ],
          },
          { p: "For a cleaner thumb impression, [Thumbmark maker](/tools/thumbmark-maker) removes the paper background and evens out the ink before you resize it." },
        ],
      },
    ],
    faq: [
      ["Which thumb should I use?", "IBPS asks for the left thumb impression. Candidates without a left thumb follow the instructions in the notification."],
      ["Can I type the declaration?", "No. It must be handwritten by you in English, and written in capital letters is not accepted."],
    ],
  },
  {
    slug: "e-pan-card-pdf-password",
    title: "e-PAN Card PDF Password: Format and How to Open It",
    description: "The e-PAN PDF is usually opened with your date of birth as DDMMYYYY. Examples, what to try if it fails, and how to save a copy without the password.",
    h1: "e-PAN card PDF password: format and how to open it",
    summary:
      "An e-PAN PDF is normally protected with your date of birth in DDMMYYYY format, as eight digits with no spaces or slashes: born on 5 March 1992, the password is 05031992. For companies and firms it's the date of incorporation. Once it opens, [Unlock PDF](/tools/unlock-pdf) can save a copy without the password.",
    published: "2026-10-28",
    time: "13:00",
    updated: "2026-10-28",
    cluster: "pdf-tools",
    tools: ["unlock-pdf", "protect-pdf", "watermark-pdf"],
    sections: [
      {
        heading: "The password format",
        blocks: [
          {
            list: [
              "Individuals: date of birth as DDMMYYYY. Born 5 March 1992 → 05031992.",
              "Companies, firms, trusts and other entities: date of incorporation or formation, also as DDMMYYYY.",
              "Always eight digits: keep the leading zeros for days and months below 10.",
            ],
          },
          { p: "This applies to e-PANs downloaded from the Protean (NSDL) and UTIITSL websites and to instant e-PANs from the income tax portal." },
        ],
      },
      {
        heading: "If the password doesn't work",
        blocks: [
          {
            list: [
              "Use the date of birth recorded in your PAN, which can differ from other documents if it was entered wrongly.",
              "Don't add slashes, dashes or spaces.",
              "One guide reports some e-PANs using the PAN in lowercase followed by the date of birth (for example abcde1234f05031992). Try that if the date alone fails.",
            ],
          },
        ],
      },
      {
        heading: "Save a copy without the password",
        blocks: [
          {
            steps: [
              "Open [Unlock PDF](/tools/unlock-pdf) and choose the e-PAN file.",
              "Enter the password.",
              "Press Unlock PDF and download the copy.",
            ],
          },
          { note: "The unlocking runs in your browser, so your PAN card isn't uploaded anywhere." },
          { p: "When you send a PAN copy to someone, a line such as “Submitted for loan KYC only” added with [Watermark PDF](/tools/watermark-pdf) makes it harder to reuse. To send it with a password again, use [Protect PDF](/tools/protect-pdf)." },
        ],
      },
    ],
    faq: [
      ["Is the e-PAN PDF password my PAN number?", "Usually not: it's your date of birth as DDMMYYYY. A few reports mention the PAN in lowercase followed by the date of birth, so try that second."],
      ["Is an e-PAN valid as proof?", "Yes. An e-PAN is a valid PAN card and can be used wherever a PAN card is accepted."],
    ],
  },
  {
    slug: "gst-invoice-format",
    title: "GST Invoice Format: Mandatory Fields and How to Make One Free",
    description: "What a GST tax invoice must show under Rule 46, with HSN, CGST/SGST or IGST and place of supply, and how to make one as a PDF for free in minutes.",
    h1: "GST invoice format: mandatory fields and how to make one for free",
    summary:
      "A GST tax invoice must show your name, address and GSTIN, a unique serial number and date, the buyer's details, HSN or SAC codes, the taxable value, the tax rate and amount (CGST and SGST within a state, IGST between states) and the place of supply. [GST invoice](/tools/gst-invoice) fills in the tax split, totals and amount in words for you and downloads a PDF.",
    published: "2026-10-28",
    time: "18:00",
    updated: "2026-10-28",
    cluster: "office-tools",
    tools: ["gst-invoice", "sign-pdf", "compress-pdf"],
    sections: [
      {
        heading: "What a tax invoice must contain",
        blocks: [
          { p: "Rule 46 of the CGST Rules lists the details a tax invoice must carry. The main ones:" },
          {
            list: [
              "Supplier's name, address and GSTIN.",
              "A consecutive serial number, unique for the financial year, of up to 16 characters (letters, numbers, - and /).",
              "Date of issue.",
              "Buyer's name, address and GSTIN if registered. For an unregistered buyer, their name, address and state when the taxable value is ₹50,000 or more.",
              "HSN code for goods or SAC code for services, a description, quantity and unit.",
              "Total value, taxable value after discounts, tax rate and tax amount for each of CGST, SGST/UTGST, IGST and cess.",
              "Place of supply with the state name for inter-state supplies, and the delivery address if different.",
              "Whether tax is payable on reverse charge.",
              "Signature or digital signature of the supplier or an authorised person.",
            ],
          },
        ],
      },
      {
        heading: "Make an invoice step by step",
        blocks: [
          {
            steps: [
              "Open [GST invoice](/tools/gst-invoice) and enter your business details. GSTINs are checked as you type, and your details are remembered on this device for next time.",
              "Enter the buyer's details. The place of supply decides whether the tool applies CGST + SGST or IGST.",
              "Add each item with its HSN or SAC code, quantity, rate and GST rate.",
              "Check the totals and the amount in words, then download the PDF.",
              "Sign it with [Sign PDF](/tools/sign-pdf) if you don't use a digital signature.",
            ],
          },
        ],
      },
      {
        heading: "HSN digits and e-invoicing",
        blocks: [
          { p: "Businesses with an aggregate turnover of up to ₹5 crore in the previous year must show at least 4-digit HSN codes on invoices to registered buyers; above ₹5 crore, 6 digits are required on all invoices." },
          { note: "If your turnover makes e-invoicing mandatory for you, each B2B invoice must also be registered on the Invoice Registration Portal to get an IRN and QR code. This tool creates the invoice document; the IRN still has to come from the portal." },
        ],
      },
    ],
    faq: [
      ["Do I issue a tax invoice if I'm under the composition scheme?", "No. Composition dealers, and businesses supplying only exempt goods or services, issue a bill of supply instead of a tax invoice."],
      ["Is a PDF invoice valid?", "Yes. A tax invoice can be issued and sent electronically, as long as it shows the details Rule 46 requires."],
    ],
  },
  {
    slug: "text-to-handwriting-assignments",
    title: "Text to Handwriting: Make Typed Notes Look Handwritten",
    description: "Turn typed text into realistic handwritten pages on lined, squared or plain paper, with blue or black ink and natural variation. Free, downloads as a PDF.",
    h1: "Text to handwriting: make typed notes look handwritten",
    summary:
      "Paste your text into [Text to handwriting](/tools/text-to-handwriting), pick a handwriting style, paper and ink, adjust the size and natural wobble, and press Write it. You get a PDF of handwritten-looking pages where no two letters are exactly alike, so it doesn't look like a font.",
    published: "2026-10-29",
    time: "10:00",
    updated: "2026-10-29",
    cluster: "pdf-tools",
    tools: ["text-to-handwriting", "pdf-to-handwriting", "pages-per-sheet"],
    sections: [
      {
        heading: "Convert step by step",
        blocks: [
          {
            steps: [
              "Open [Text to handwriting](/tools/text-to-handwriting) and type or paste your text.",
              "Choose a handwriting style.",
              "Pick the paper (lined, squared or plain) and the ink (blue, black or red).",
              "Adjust the size and the messiness slider: a little variation looks natural, a lot looks rushed.",
              "Press Write it and download the PDF.",
            ],
          },
        ],
      },
      {
        heading: "Make it look more natural",
        blocks: [
          {
            list: [
              "Use blue ink on lined paper for the classic notebook look.",
              "Keep paragraphs short; long unbroken blocks look typed even in handwriting.",
              "Leave the messiness low to medium. Real handwriting is steadier than people expect.",
              "Print on real ruled paper if the lines need to match a notebook.",
            ],
          },
          { p: "Already have notes as a PDF? [PDF to handwriting](/tools/pdf-to-handwriting) reads the PDF's text and writes it out the same way." },
        ],
      },
      {
        heading: "Good uses, and one caution",
        blocks: [
          { p: "It's useful for greeting cards, letters, study notes that are easier to read in a personal style, mock-ups and practice sheets. To fit more on each printed sheet, [Pages per sheet](/tools/pages-per-sheet) puts 2 or 4 pages on one." },
          { note: "If your school or teacher requires handwritten work to be written by you, a generated page doesn't meet that requirement. Check the rules before submitting one." },
        ],
      },
    ],
    faq: [
      ["Can I choose different handwriting styles?", "Yes. There are several styles, and each page varies letter shapes and spacing so it doesn't repeat."],
      ["Can I edit the text after converting?", "Change the text in the box and press Write it again; the pages are regenerated in a moment."],
    ],
  },
  {
    slug: "remove-watermark-from-photo",
    title: "How to Remove a Watermark, Logo or Date Stamp From a Photo",
    description: "Brush over a watermark, logo, date stamp or small object and the area is filled from its surroundings. Free, and the photo stays on your device.",
    h1: "How to remove a watermark, logo or date stamp from a photo",
    summary:
      "Open [Remove watermark from image](/tools/remove-watermark-image), brush over the mark you want gone, and press Remove. The tool fills the area by continuing the textures around it. Small marks on simple backgrounds disappear cleanly; for big logos, work in several smaller passes.",
    published: "2026-10-29",
    time: "17:00",
    updated: "2026-10-29",
    cluster: "image-tools",
    tools: ["remove-watermark-image", "crop-image", "image-editor"],
    sections: [
      {
        heading: "Remove a mark step by step",
        blocks: [
          {
            steps: [
              "Open [Remove watermark from image](/tools/remove-watermark-image) and choose the photo.",
              "Adjust the brush size so it's just bigger than the strokes of the mark.",
              "Paint over the watermark, date stamp or object.",
              "Press Remove, check the result, and paint over any traces for another pass.",
              "Download the cleaned photo.",
            ],
          },
          { note: "The photo is processed on your device and never uploaded." },
        ],
      },
      {
        heading: "Tips for a clean result",
        blocks: [
          {
            list: [
              "Work in small sections. Filling a large area in one go has less real detail to borrow from.",
              "Marks on sky, walls, sand or plain backgrounds vanish best; marks over faces, text or detailed patterns are hardest.",
              "If the mark sits near the edge, cropping it away with [Crop image](/tools/crop-image) may be quicker and cleaner.",
              "Finish with the [Image editor](/tools/image-editor) to fix brightness or add a light filter that hides small seams.",
            ],
          },
        ],
      },
      {
        heading: "Only on photos you have the right to edit",
        blocks: [
          { p: "Removing the date stamp from your own old photos, or a stray object from a holiday picture, is fine. Watermarks on stock photos and other people's work protect their rights: license the image or ask for permission instead of removing them. For watermarks in PDF documents, see [How to remove a watermark from a PDF](/guides/remove-watermark-from-pdf)." },
        ],
      },
    ],
    faq: [
      ["Does it reduce the photo's quality?", "Only the painted area changes; the rest of the photo keeps its original pixels."],
      ["Can it remove people from photos?", "Small figures in the background, yes. Large subjects leave too big a gap to fill convincingly."],
    ],
  },
];
