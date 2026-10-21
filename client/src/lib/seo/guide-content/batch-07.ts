import type { Guide } from "../guides";

/** Scheduled guides 61–70 (15–18 November 2026). */
export const BATCH_07: Guide[] = [
  {
    slug: "merge-assignment-scans",
    title: "How to Merge Assignment Scans Into One PDF in the Right Order",
    description: "Scan handwritten assignment pages with your phone, put them in order, fix sideways pages and submit one small PDF to Google Classroom or your college portal.",
    h1: "How to merge assignment scans into one PDF in the right order",
    summary:
      "Scan every page with [Scan to PDF](/tools/scan-to-pdf) in page order, or turn existing photos into a PDF with [JPG to PDF](/tools/jpg-to-pdf). Fix any page that's out of place or sideways in [Organize PDF](/tools/organize-pdf), then shrink the file with [Compress PDF](/tools/compress-pdf) so it uploads to Google Classroom, Moodle or your college portal.",
    published: "2026-11-15",
    time: "09:00",
    updated: "2026-11-15",
    cluster: "pdf-tools",
    tools: ["scan-to-pdf", "jpg-to-pdf", "organize-pdf", "compress-pdf", "merge-pdf"],
    sections: [
      {
        heading: "Scan the pages",
        blocks: [
          {
            steps: [
              "Number your pages in the corner before scanning, so the order is easy to check.",
              "Open [Scan to PDF](/tools/scan-to-pdf), and capture each page flat, in order, in daylight.",
              "Check the thumbnails, retake blurry pages, and build the PDF.",
            ],
          },
          { p: "If you already took photos with your camera, add them to [JPG to PDF](/tools/jpg-to-pdf) instead and arrange them with the arrows." },
        ],
      },
      {
        heading: "Fix order, rotation and size",
        blocks: [
          {
            steps: [
              "Open [Organize PDF](/tools/organize-pdf) to drag misplaced pages into order and rotate sideways ones.",
              "If you scanned in two sessions, combine the PDFs first with [Merge PDF](/tools/merge-pdf).",
              "Shrink the file with [Compress PDF](/tools/compress-pdf). For pen on white paper, Grayscale images keeps it small and clear.",
              "Name it as your teacher asks, for example “RollNo-Name-Assignment3.pdf”.",
            ],
          },
          { p: "A cover page typed in the Word editor and converted to PDF can be added at the front with Organize PDF's Add pages." },
        ],
      },
      {
        heading: "Before you submit",
        blocks: [
          {
            list: [
              "Flip through the PDF once: every page present, upright and readable.",
              "Check the portal's size limit; most accept 10 MB or more, but some college portals ask for 2 MB.",
              "Keep the original photos until the assignment is graded.",
            ],
          },
        ],
      },
    ],
    faq: [
      ["Can I do this entirely on my phone?", "Yes. All of these tools work in a phone browser, with no app to install."],
      ["My PDF is 40 MB. How do I make it smaller?", "Compress it with Extreme and Grayscale images turned on. Phone photos of handwriting usually shrink by 80–90%."],
    ],
  },
  {
    slug: "extract-images-from-pdf",
    title: "How to Extract All Images From a PDF at Original Quality",
    description: "Pull every photo and picture out of a PDF at its original resolution, without screenshots or quality loss, and download them all at once. Free, in your browser.",
    h1: "How to extract all images from a PDF",
    summary:
      "Open [Extract images](/tools/extract-images), choose the PDF and press Extract images. Every picture stored in the PDF is saved at its original resolution, without re-rendering the page, and several images download together as a ZIP. Charts and logos drawn as vector graphics aren't images; capture those with [PDF to JPG](/tools/pdf-to-jpg).",
    published: "2026-11-15",
    time: "13:00",
    updated: "2026-11-15",
    cluster: "pdf-converter",
    tools: ["extract-images", "pdf-to-jpg", "compress-image", "convert-image"],
    sections: [
      {
        heading: "Extract step by step",
        blocks: [
          {
            steps: [
              "Open [Extract images](/tools/extract-images) and choose the PDF.",
              "Press Extract images.",
              "Download the images, or the ZIP if there are several.",
            ],
          },
          { note: "The PDF is processed in your browser and isn't uploaded." },
        ],
      },
      {
        heading: "Why this beats screenshots",
        blocks: [
          { p: "A screenshot captures the image at your screen's size, often smaller and blurrier than the original. Extracting takes the picture exactly as the PDF stores it, so a high-resolution product photo in a catalogue comes out at full resolution." },
        ],
      },
      {
        heading: "What you might not get",
        blocks: [
          {
            list: [
              "Charts, diagrams and many logos are drawn with vector shapes, not stored as images. Use [PDF to JPG](/tools/pdf-to-jpg) to save the whole page as a picture instead; see [How to convert a PDF to JPG](/guides/pdf-to-jpg-every-page).",
              "In a scanned PDF, each page is one big image, so you get one image per page.",
              "Some PDFs split a picture into strips or tiles; these come out as separate pieces.",
            ],
          },
          { p: "Extracted images keep their original format. To change the format or shrink them, use [Convert image](/tools/convert-image) or [Compress image](/tools/compress-image)." },
        ],
      },
    ],
    faq: [
      ["Are the extracted images the same quality as in the PDF?", "Yes. They're saved as stored in the file, without recompression where possible."],
      ["Can I extract images from a password-protected PDF?", "Unlock it first with Unlock PDF, using its password."],
    ],
  },
  {
    slug: "bates-numbering-pdf",
    title: "How to Add Bates Numbers to Legal Documents and Court Filings",
    description: "Stamp sequential Bates numbers such as ABC-000123 on every page, continuing across several PDFs, for document productions, exhibits and audit evidence.",
    h1: "How to add Bates numbers to legal documents",
    summary:
      "Open [Bates numbering](/tools/bates-numbering), add the PDFs in production order, set a prefix (such as your case code), the starting number and the number of digits, choose a position, and press Add Bates numbers. Numbering continues from one file to the next, so every page in the set has its own unique number.",
    published: "2026-11-15",
    time: "18:00",
    updated: "2026-11-15",
    cluster: "pdf-tools",
    tools: ["bates-numbering", "merge-pdf", "page-numbers", "header-footer"],
    sections: [
      {
        heading: "What Bates numbers are for",
        blocks: [
          { p: "A Bates number is a unique identifier stamped on every page of a set of documents, such as SHARMA-000001 to SHARMA-004812. Lawyers, auditors and investigators use them so anyone can point to an exact page in a large production, and so missing or added pages are obvious." },
        ],
      },
      {
        heading: "Add Bates numbers step by step",
        blocks: [
          {
            steps: [
              "Open [Bates numbering](/tools/bates-numbering) and choose the PDFs, in the order they'll be produced.",
              "Set a prefix (for example the client or matter code, followed by a hyphen) and an optional suffix.",
              "Set the starting number and the number of digits: six digits gives 000001 to 999999.",
              "Choose the position (bottom right is the convention) and the text size.",
              "Press Add Bates numbers and download the numbered files.",
            ],
          },
          { note: "Numbering runs in your browser. Confidential case documents aren't uploaded." },
        ],
      },
      {
        heading: "Good practice",
        blocks: [
          {
            list: [
              "Keep a log of each production: prefix, first and last number, and date.",
              "If a second production follows, start where the last one ended so numbers never repeat.",
              "Leave the margin clear: if documents already have content in the corner, choose another position.",
              "For ordinary page numbers in a report, use [Add page numbers](/tools/page-numbers) instead; for titles and dates on every page, [Header and footer](/tools/header-footer).",
            ],
          },
        ],
      },
    ],
    faq: [
      ["Can I number several PDFs as one continuous set?", "Yes. Add them in order; numbering continues across files."],
      ["Should I merge the PDFs first?", "Not necessary, since numbering continues across files. Merge them with Merge PDF if the recipient wants a single file."],
    ],
  },
  {
    slug: "cas-statement-password",
    title: "CAS Statement Password: How to Open Your Mutual Fund Statement",
    description: "CAMS and KFintech CAS PDFs open with the password you chose when requesting them; CDSL eCAS uses your PAN in capitals. How to open, unlock and analyse them.",
    h1: "CAS statement password: how to open your mutual fund statement",
    summary:
      "A Consolidated Account Statement (CAS) requested from CAMS or KFintech opens with the password you typed when you requested it. A CAS from CDSL opens with the first holder's PAN in capital letters, according to CDSL's own FAQ. Once open, [Unlock PDF](/tools/unlock-pdf) saves a copy without the password.",
    published: "2026-11-16",
    time: "10:00",
    updated: "2026-11-16",
    cluster: "pdf-tools",
    tools: ["unlock-pdf", "pdf-to-excel", "merge-pdf"],
    sections: [
      {
        heading: "Which CAS do you have?",
        blocks: [
          {
            list: [
              "CAMS + KFintech CAS (requested on the CAMS or KFintech website, or MFCentral): covers your mutual fund folios. The password is the one you set when requesting it, and the email doesn't include a hint.",
              "CDSL eCAS: sent by CDSL if your demat account is with a CDSL depository participant. The password is the PAN of the first or sole holder, in CAPITAL letters.",
              "NSDL CAS: sent by NSDL for NSDL demat accounts. The email explains its password; follow that.",
            ],
          },
          { p: "If you've forgotten the password you set for a CAMS/KFintech CAS, request the statement again with a new password." },
        ],
      },
      {
        heading: "Unlock and analyse",
        blocks: [
          {
            steps: [
              "Open [Unlock PDF](/tools/unlock-pdf) and choose the CAS.",
              "Enter the password and press Unlock PDF.",
              "Download the copy that opens without a password.",
            ],
          },
          { p: "To work with your holdings in a spreadsheet, convert the unlocked CAS with [PDF to Excel](/tools/pdf-to-excel). To keep the year's investment papers together with bank and tax documents, combine them with [Merge PDF](/tools/merge-pdf)." },
          { note: "Unlocking runs in your browser: your portfolio details aren't uploaded." },
        ],
      },
    ],
    faq: [
      ["Is the CAS password case-sensitive?", "Yes. For CDSL, type the PAN in capitals. For CAMS/KFintech, type exactly what you set."],
      ["Why can't my portfolio app read my CAS?", "Some apps need the original protected PDF and the password; others need an unlocked copy. Follow the app's instructions."],
    ],
  },
  {
    slug: "resize-image-cm-inches-print",
    title: "How to Resize an Image in cm or Inches for Printing",
    description: "Set an image's print size in centimetres or inches at the right DPI: 4 × 6 inch photos, A4 posters and passport prints, with the pixel sizes each one needs.",
    h1: "How to resize an image in cm or inches for printing",
    summary:
      "Open [Resize image](/tools/resize-image), choose Print size, enter the width and height in cm, mm or inches, set the DPI (300 for sharp prints), and press Resize. A 4 × 6 inch print at 300 DPI needs 1200 × 1800 pixels; an A4 page needs about 2480 × 3508. If your image has fewer pixels, print it smaller or at a lower DPI.",
    published: "2026-11-16",
    time: "17:00",
    updated: "2026-11-16",
    cluster: "image-tools",
    tools: ["resize-image", "crop-image", "image-editor"],
    sections: [
      {
        heading: "Pixels needed for common prints",
        blocks: [
          {
            list: [
              "Passport photo 3.5 × 4.5 cm at 300 DPI: about 413 × 531 pixels.",
              "4 × 6 inch photo at 300 DPI: 1200 × 1800 pixels.",
              "5 × 7 inch photo at 300 DPI: 1500 × 2100 pixels.",
              "A4 (21 × 29.7 cm) at 300 DPI: about 2480 × 3508 pixels; at 150 DPI, 1240 × 1754.",
            ],
          },
          { p: "The formula is pixels = inches × DPI, or cm ÷ 2.54 × DPI. 300 DPI is the usual target for photos viewed up close; posters viewed from a distance look fine at 150 DPI." },
        ],
      },
      {
        heading: "Resize step by step",
        blocks: [
          {
            steps: [
              "Crop to the print's shape first with [Crop image](/tools/crop-image) (4:6 for a 4 × 6 print), so nothing gets stretched.",
              "Open [Resize image](/tools/resize-image) and choose Print size.",
              "Pick the unit (cm, mm or inches), enter the size, and set the DPI.",
              "Keep proportions on; if the shapes differ, choose crop to fill or add borders rather than stretching.",
              "Press Resize and download.",
            ],
          },
        ],
      },
      {
        heading: "If your image is too small",
        blocks: [
          { p: "Resizing up adds pixels but no detail, so a small web image printed large looks soft. Either print smaller, accept a lower DPI (150–200 is often fine for larger prints), or find the original, higher-resolution file. Brightening and sharpening slightly in the [Image editor](/tools/image-editor) can help prints look crisper." },
        ],
      },
    ],
    faq: [
      ["What DPI should I use for printing photos?", "300 DPI for photos held in the hand; 150–200 DPI is enough for posters and large prints viewed from further away."],
      ["Does changing DPI alone change the print size?", "Only in combination with pixels. Resize image calculates the pixels from the size and DPI you enter."],
    ],
  },
  {
    slug: "rotate-pdf-permanently",
    title: "How to Rotate a PDF and Save It Permanently",
    description: "Turn sideways or upside-down PDF pages the right way up and save the rotation in the file, so it opens correctly on every device. All pages or just some.",
    h1: "How to rotate a PDF and save it permanently",
    summary:
      "Open [Rotate PDF](/tools/rotate-pdf), choose the file, pick 90° right, 180° or 90° left, leave Pages as “all” or list the pages to turn (such as 2, 4-6), and press Rotate PDF. The rotation is saved in the file itself, unlike rotating the view in a PDF reader, which is forgotten when you close it.",
    published: "2026-11-17",
    time: "09:00",
    updated: "2026-11-17",
    cluster: "pdf-tools",
    tools: ["rotate-pdf", "organize-pdf", "flip-pdf"],
    sections: [
      {
        heading: "Rotate step by step",
        blocks: [
          {
            steps: [
              "Open [Rotate PDF](/tools/rotate-pdf) and choose one or more PDFs.",
              "Pick the rotation: right 90°, 180° or left 90°.",
              "Leave Pages as “all”, or list the pages to rotate, such as 2, 4-6.",
              "Press Rotate PDF and download.",
            ],
          },
          { note: "Rotation happens in your browser, and the page content isn't re-rendered, so text stays sharp and selectable." },
        ],
      },
      {
        heading: "Rotating by looking at the pages",
        blocks: [
          { p: "When different pages need different turns (a scan with a few sideways tables), [Organize PDF](/tools/organize-pdf) shows every page as a thumbnail with its own rotate button. It's easier than working out page numbers." },
        ],
      },
      {
        heading: "Rotate isn't mirror",
        blocks: [
          { p: "If a page reads backwards, as with some scans or iron-on transfer prints, it needs mirroring, not rotating: [Flip PDF](/tools/flip-pdf) mirrors pages left to right or top to bottom." },
        ],
      },
    ],
    faq: [
      ["Why does my PDF open sideways again after rotating it in the viewer?", "Most viewers only rotate the view. Rotate PDF saves the change in the file."],
      ["Can I rotate just one page?", "Yes. Type that page number in the Pages box."],
    ],
  },
  {
    slug: "listen-to-pdf-audio",
    title: "How to Listen to a PDF: Turn Notes and Books Into Audio",
    description: "Have any PDF read aloud with your device's voices, at your own speed, with each sentence highlighted as it's read. Free text-to-speech that doesn't upload the file.",
    h1: "How to listen to a PDF",
    summary:
      "Open [PDF to Audio](/tools/pdf-to-audio), choose a PDF with selectable text, pick a voice and a speed, and press play. The current sentence is highlighted as it's read, and you can tap any sentence to jump there. It uses the voices built into your phone or computer, so nothing is uploaded.",
    published: "2026-11-17",
    time: "13:00",
    updated: "2026-11-17",
    cluster: "ai-pdf-tools",
    tools: ["pdf-to-audio", "ocr-pdf", "summarize-pdf", "split-pdf"],
    sections: [
      {
        heading: "Listen step by step",
        blocks: [
          {
            steps: [
              "Open [PDF to Audio](/tools/pdf-to-audio) and choose the PDF.",
              "Pick a voice and a reading speed.",
              "Press play. The sentence being read is highlighted.",
              "Tap any sentence to jump to it; pause and resume when you like.",
            ],
          },
        ],
      },
      {
        heading: "Voices and languages",
        blocks: [
          { p: "The voices come from your device or browser, so the list differs between phones and computers. Many devices include natural-sounding voices for English and Indian languages such as Hindi; if you don't see one, you can usually add it in your device's language or text-to-speech settings." },
        ],
      },
      {
        heading: "Ways to use it",
        blocks: [
          {
            list: [
              "Revise notes while commuting or walking.",
              "Proofread your own writing: hearing it catches mistakes your eyes skip.",
              "Make long reports easier for anyone who finds reading on screen tiring.",
              "Listen to just one chapter by extracting it first with [Split PDF](/tools/split-pdf).",
            ],
          },
          { p: "Scanned PDFs need [OCR PDF](/tools/ocr-pdf) first. To decide whether a long document is worth listening to, [Summarize PDF](/tools/summarize-pdf) gives its main points." },
        ],
      },
    ],
    faq: [
      ["Can I download the audio as an MP3?", "No. The speech is made live by your device's voices, which is why nothing is uploaded and no AI is involved."],
      ["Does it work offline?", "Once the page and PDF are loaded, reading uses your device's voices; some voices on some devices need a connection."],
    ],
  },
  {
    slug: "copy-text-from-scanned-pdf",
    title: "How to Copy Text From a Scanned PDF",
    description: "A scanned PDF is a picture, so you can't select its words. Recognise the text with OCR, then copy it, extract it to a .txt file or convert it to Word.",
    h1: "How to copy text from a scanned PDF",
    summary:
      "Run the scan through [OCR PDF](/tools/ocr-pdf) to recognise its words; the page looks the same but the text becomes selectable. Then copy from it in any PDF reader, or pull all the text out with [Extract text](/tools/extract-text). OCR runs on your device and works best on clear, printed English text.",
    published: "2026-11-17",
    time: "18:00",
    updated: "2026-11-17",
    cluster: "pdf-tools",
    tools: ["ocr-pdf", "extract-text", "pdf-to-word", "scan-to-pdf"],
    sections: [
      {
        heading: "Copy text step by step",
        blocks: [
          {
            steps: [
              "Open [OCR PDF](/tools/ocr-pdf) and choose the scanned PDF. The first run downloads the recognition engine.",
              "Keep “Skip pages that already have text” on for mixed documents.",
              "Press Make searchable and download the result.",
              "Open it in any PDF reader and select and copy the text, or use [Extract text](/tools/extract-text) to get all of it as a .txt file.",
            ],
          },
          { p: "To keep editing in a word processor, convert the OCR'd PDF with [PDF to Word](/tools/pdf-to-word)." },
        ],
      },
      {
        heading: "Getting accurate text",
        blocks: [
          {
            list: [
              "Start from a sharp, straight, well-lit scan; [Scan to PDF](/tools/scan-to-pdf) on a phone in daylight works well.",
              "Printed text recognises far better than handwriting.",
              "Recognition is tuned for English. Other scripts may not be recognised correctly.",
              "Check numbers, names and email addresses by eye: a 0 read as O or 1 read as l is easy to miss.",
            ],
          },
          { p: "For more on making scans searchable, see [How to make a scanned PDF searchable](/guides/how-to-make-a-scanned-pdf-searchable)." },
        ],
      },
    ],
    faq: [
      ["Why can't I select text in my PDF?", "It's a scan or photo, so each page is an image. OCR adds a hidden text layer you can select."],
      ["Is my scan uploaded for OCR?", "No. Recognition runs on your device."],
    ],
  },
  {
    slug: "sign-offer-letter-rent-agreement-pdf",
    title: "How to Sign an Offer Letter or Rent Agreement PDF Online",
    description: "Sign an offer letter or simple agreement PDF without printing it, and know when a drawn signature isn't enough, such as rent agreements needing e-stamp or eSign.",
    h1: "How to sign an offer letter or rent agreement PDF online",
    summary:
      "To accept an offer letter or sign an everyday form, open the PDF, choose Signature in [Sign PDF](/tools/sign-pdf), draw, type or upload your signature, place it and download. That's a simple electronic signature. Rent agreements in India usually also need stamp duty paid (often by e-stamp) and, for longer leases, registration, and an Aadhaar eSign or physical signature carries more legal weight than a drawn one.",
    published: "2026-11-18",
    time: "10:00",
    updated: "2026-11-18",
    cluster: "pdf-tools",
    tools: ["sign-pdf", "edit-pdf", "flatten-pdf", "protect-pdf"],
    sections: [
      {
        heading: "Sign a PDF step by step",
        blocks: [
          {
            steps: [
              "Open the PDF in [Sign PDF](/tools/sign-pdf).",
              "Choose Signature and draw it, type your name in a handwriting font, or upload a photo of your signature (its background can be removed). Tick remember to reuse it later.",
              "Click the page to place it, then drag and resize it onto the signature line.",
              "Add the date with a text box, and initial other pages if asked.",
              "Download the signed PDF. If you also filled in form fields, [Flatten PDF](/tools/flatten-pdf) locks them into the page so they can't be changed.",
            ],
          },
          { note: "Signing happens in your browser: the document isn't uploaded." },
        ],
      },
      {
        heading: "When a drawn signature is fine",
        blocks: [
          { p: "Accepting an offer letter, signing an NDA a company sent you, school and bank forms that accept emailed copies, internal approvals and quotations: these routinely accept a signature added to the PDF. It's a simple electronic signature, and the recipient decides whether they accept it." },
        ],
      },
      {
        heading: "Rent agreements need more",
        blocks: [
          {
            list: [
              "Stamp duty must be paid on a rent agreement under your state's stamp law; many states let you buy an e-stamp online.",
              "Under the Registration Act, leases from year to year or for more than a year must be registered, which is why many agreements are written for 11 months.",
              "The IT Act gives full legal recognition to the electronic signatures listed in it, such as Aadhaar eSign and digital signature certificates. A drawn or typed signature isn't one of those, so it carries less weight if there's a dispute.",
            ],
          },
          { p: "For a rent agreement, use an e-stamp with Aadhaar eSign through a licensed service, or sign on paper. Rules vary by state, so check locally or ask a lawyer for anything significant." },
        ],
      },
    ],
    faq: [
      ["Is a signature added to a PDF legally valid?", "For many everyday documents, yes, if the other party accepts it. Some documents legally require a certified electronic signature, stamp duty or registration."],
      ["Can I sign on my phone?", "Yes. Draw the signature with your finger, or upload a photo of it."],
    ],
  },
  {
    slug: "salary-slip-pdf-password",
    title: "Salary Slip PDF Password: How to Open and Remove It",
    description: "Payslip passwords are set by your employer's payroll system, often from your employee ID, PAN or date of birth. Where to find yours and how to unlock the PDF.",
    h1: "Salary slip PDF password: how to open and remove it",
    summary:
      "Salary slip passwords are chosen by your employer's payroll software, so there's no single format. Common ones combine your employee ID, PAN, or date of birth; the email or HR portal that sends the payslip usually says which. Once you have it, [Unlock PDF](/tools/unlock-pdf) saves a copy without the password, ready for a loan or visa application.",
    published: "2026-11-18",
    time: "17:00",
    updated: "2026-11-18",
    cluster: "pdf-tools",
    tools: ["unlock-pdf", "merge-pdf", "protect-pdf", "compress-pdf"],
    sections: [
      {
        heading: "Where to find the password",
        blocks: [
          {
            list: [
              "The payslip email: the format is usually explained at the bottom.",
              "Your HR or payroll portal's help section.",
              "Your HR or payroll team, if neither says.",
            ],
          },
          {
            p: "Common ingredients are your employee ID, your PAN (in capitals or lowercase), your date of birth as DDMMYYYY or DDMM, or part of your name. Try the combination the email describes exactly, including the letter case.",
          },
        ],
      },
      {
        heading: "Unlock and prepare for applications",
        blocks: [
          {
            steps: [
              "Open [Unlock PDF](/tools/unlock-pdf) and choose the payslip.",
              "Enter the password and press Unlock PDF; repeat for each month.",
              "Combine the months with [Merge PDF](/tools/merge-pdf) in date order, for example the last three or six months for a loan.",
              "Compress the result with [Compress PDF](/tools/compress-pdf) if the portal has a size limit.",
            ],
          },
          { p: "Lenders often ask for unlocked payslips because their systems can't open protected files. When you email them, you can add a single password of your own with [Protect PDF](/tools/protect-pdf) and share it separately." },
          { note: "Unlocking runs in your browser, so your salary details aren't uploaded." },
        ],
      },
    ],
    faq: [
      ["Is my payslip password the same as my Form 16 password?", "Usually not. Form 16 from TRACES uses the first five characters of your PAN and your date of birth; payslips use whatever your employer's payroll system sets."],
      ["Can I remove the password if I don't know it?", "No. The tool needs the correct password; ask HR if you can't find it."],
    ],
  },
];
