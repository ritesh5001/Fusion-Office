import type { Guide } from "../guides";

/** Scheduled guides 21–30 (30 October – 2 November 2026). */
export const BATCH_03: Guide[] = [
  {
    slug: "smallpdf-alternative-no-daily-limit",
    title: "Smallpdf Alternative With No Daily Limit (Free, No Sign-Up)",
    description: "Smallpdf's free plan caps how many tasks you can run per day. A free alternative with no daily limit, no sign-up and tools that work inside your browser.",
    h1: "A Smallpdf alternative with no daily limit",
    summary:
      "Smallpdf's free account limits how many tasks you can run each day: two, according to its own help pages and blog when we checked in October 2026. Fusion Office has no daily limit and no sign-up, and its PDF tools, such as [Compress PDF](/tools/compress-pdf), [PDF to Word](/tools/pdf-to-word) and the [PDF editor](/tools/edit-pdf), run inside your browser.",
    published: "2026-10-30",
    time: "09:00",
    updated: "2026-10-30",
    cluster: "pdf-tools",
    tools: ["compress-pdf", "pdf-to-word", "edit-pdf", "merge-pdf"],
    sections: [
      {
        heading: "What the daily limit means in practice",
        blocks: [
          { p: "With two free tasks a day, compressing one file and merging another uses up the day. The limit resets after 24 hours, or goes away with a Pro subscription. That's fine for an occasional file, and frustrating when you're putting together an application with several documents." },
        ],
      },
      {
        heading: "How Fusion Office differs",
        blocks: [
          {
            list: [
              "No daily or monthly task limit, and no account needed.",
              "No watermark added to your files.",
              "Most PDF tools run in your browser, so documents aren't uploaded. You can check this with the test in [Do online PDF tools upload your files?](/guides/do-online-pdf-tools-upload-your-files)",
              "Conversions that need office software, such as Word to PDF, run on our server and the file is deleted as soon as the result is ready.",
            ],
          },
        ],
      },
      {
        heading: "Where Smallpdf may suit you better",
        blocks: [
          { p: "Smallpdf is a polished product with desktop and mobile apps, e-signature requests, team accounts and cloud integrations. If you need those, its paid plan is a reasonable choice. For everyday tasks (compress, merge, convert, edit, sign) without limits or uploads, the free tools here cover the same ground." },
          { p: "A fair test is to run the same file through both and compare file size, layout and speed." },
        ],
      },
    ],
    faq: [
      ["Is there a file size limit?", "There's no fixed limit for browser tools; very large files are limited only by your device's memory. Server conversions accept files up to 200 MB."],
      ["Do I need to install anything?", "No. Everything works in a web browser on a computer or phone."],
    ],
  },
  {
    slug: "sbi-handwritten-declaration",
    title: "SBI Handwritten Declaration: Text, Size (50–100 KB) and How to Upload",
    description: "What to write in the SBI PO and Clerk handwritten declaration, the 800 × 400 pixel, 50–100 KB JPG size it needs, and how to scan and resize it correctly.",
    h1: "SBI handwritten declaration: what to write and how to upload it",
    summary:
      "SBI PO and Clerk applications ask for a declaration written in your own handwriting in English, scanned as a JPG of 800 × 400 pixels (10 × 5 cm at 200 DPI) and between 50 KB and 100 KB. Write it on white paper in black ink, crop it, then set the size and KB limit with [Resize image](/tools/resize-image).",
    published: "2026-10-30",
    time: "13:00",
    updated: "2026-10-30",
    cluster: "image-tools",
    tools: ["resize-image", "crop-image", "compress-image"],
    sections: [
      {
        heading: "What to write",
        blocks: [
          { p: "Recent IBPS and SBI notifications give this text, with your own name in the blank:" },
          { note: "I, _______ (Name of the candidate), hereby declare that all the information submitted by me in the application form is correct, true and valid. I will present the supporting documents as and when required." },
          { p: "The wording can change between notifications, so copy it word for word from the notification you're applying under. A declaration that differs from the official text can lead to rejection." },
        ],
      },
      {
        heading: "Writing rules",
        blocks: [
          {
            list: [
              "Write it yourself, in English, in your normal running handwriting.",
              "Use black ink on plain white paper.",
              "Don't write in capital letters only; such declarations are not accepted.",
              "Keep it on a few neat lines that fit a wide, short area (twice as wide as it is tall).",
            ],
          },
        ],
      },
      {
        heading: "Scan and resize",
        blocks: [
          {
            steps: [
              "Photograph the page in daylight from directly above, so the lines aren't slanted.",
              "Crop to just the text with [Crop image](/tools/crop-image), using a 2:1 shape if you can.",
              "Open [Resize image](/tools/resize-image), choose Pixels and set 800 × 400.",
              "Turn on Limit the file size, enter 100 KB, choose JPG and press Resize.",
              "Check the file is at least 50 KB. If it's smaller, raise the quality and resize again.",
            ],
          },
          { p: "The photo (20–50 KB), signature (10–20 KB) and left thumb impression (20–50 KB) follow the same steps with their own sizes." },
        ],
      },
    ],
    faq: [
      ["Can I type the declaration and print it?", "No. It must be in your own handwriting."],
      ["My file is 40 KB. Will it be accepted?", "The minimum is 50 KB. Resize again at a higher quality, or slightly larger, until it's between 50 and 100 KB."],
    ],
  },
  {
    slug: "form-16-password",
    title: "Form 16 Password: Format and How to Open the PDF",
    description: "Form 16 PDFs from TRACES open with the first five characters of your PAN in capitals plus your date of birth (DDMMYYYY). Examples, exceptions and how to unlock it.",
    h1: "Form 16 password: format and how to open the PDF",
    summary:
      "A Form 16 generated through the TRACES portal is protected with the first five characters of your PAN in capital letters followed by your date of birth as DDMMYYYY. For PAN ABCDE1234F and a birthday of 5 March 1992, the password is ABCDE05031992. If that fails, your employer may have used its own password; check the email it came with.",
    published: "2026-10-30",
    time: "18:00",
    updated: "2026-10-30",
    cluster: "pdf-tools",
    tools: ["unlock-pdf", "merge-pdf", "protect-pdf"],
    sections: [
      {
        heading: "The password format",
        blocks: [
          {
            list: [
              "First five characters of your PAN, in capitals: ABCDE.",
              "Then your date of birth as eight digits, DDMMYYYY: 05031992.",
              "Together, with no spaces: ABCDE05031992.",
            ],
          },
          { p: "The same format applies to Form 16A, the TDS certificate for income other than salary." },
        ],
      },
      {
        heading: "If it doesn't open",
        blocks: [
          {
            list: [
              "Some employers send Form 16 from their own payroll software with a different password, such as your employee code. The email usually says what it is.",
              "Try the PAN letters in lowercase: some readers report it working that way.",
              "Use the date of birth recorded with the income tax department.",
            ],
          },
        ],
      },
      {
        heading: "Save a copy without the password",
        blocks: [
          {
            steps: [
              "Open [Unlock PDF](/tools/unlock-pdf) and choose the Form 16 file.",
              "Enter the password and press Unlock PDF.",
              "Download the copy. It now opens without a password, which is convenient for filing or sharing with your CA.",
            ],
          },
          { p: "Many employers send Part A and Part B as separate PDFs. After unlocking both, [Merge PDF](/tools/merge-pdf) combines them into one Form 16. When you email it, you can add a password of your own with [Protect PDF](/tools/protect-pdf)." },
          { note: "Unlocking happens in your browser; your Form 16 isn't uploaded anywhere." },
        ],
      },
      {
        heading: "Form 16 under the new Income-tax Act",
        blocks: [
          { p: "Under the Income-tax Act, 2025 and the Income-tax Rules, 2026, the salary TDS certificate has been renumbered as Form 130 from 1 April 2026. Certificates for earlier years are still issued as Form 16." },
        ],
      },
    ],
    faq: [
      ["Is the Form 16 password case-sensitive?", "Yes. TRACES uses the PAN letters in capitals; if that fails, try lowercase, as some employers' files differ."],
      ["What is the Form 16A password?", "The same as Form 16: the first five characters of your PAN followed by your date of birth as DDMMYYYY."],
    ],
  },
  {
    slug: "bank-statement-pdf-to-excel",
    title: "How to Convert a Bank Statement PDF to Excel",
    description: "Turn a bank or credit card statement PDF into an Excel sheet you can sort, filter and total. Unlock it, convert it, and fix numbers that come in as text.",
    h1: "How to convert a bank statement PDF to Excel",
    summary:
      "Unlock the statement if it has a password, then open [PDF to Excel](/tools/pdf-to-excel), choose the PDF and press Convert to Excel. Each page becomes a worksheet with the transactions in rows and columns. Scanned statements need [OCR PDF](/tools/ocr-pdf) first, and amounts may need converting from text to numbers.",
    published: "2026-10-31",
    time: "10:00",
    updated: "2026-10-31",
    cluster: "pdf-converter",
    tools: ["pdf-to-excel", "unlock-pdf", "pdf-to-csv", "ocr-pdf"],
    sections: [
      {
        heading: "Convert step by step",
        blocks: [
          {
            steps: [
              "If the statement asks for a password, remove it with [Unlock PDF](/tools/unlock-pdf) (you'll need the password from the bank's email).",
              "Open [PDF to Excel](/tools/pdf-to-excel) and choose the statement.",
              "Press Convert to Excel and download the .xlsx.",
              "Open it in Excel, Google Sheets or our Excel editor and check that dates, descriptions and amounts landed in the right columns.",
            ],
          },
          { note: "Statements contain account numbers and every transaction you made. PDF to Excel runs in your browser, so the statement isn't uploaded." },
        ],
      },
      {
        heading: "Tidy up the sheet",
        blocks: [
          {
            list: [
              "Amounts may arrive as text (often left-aligned, sometimes with commas). Select the column and use Data → Text to Columns → Finish in Excel, or multiply by 1, to turn them into numbers.",
              "Each page is its own worksheet. Copy the rows into one sheet to see the whole period, and delete repeated header rows.",
              "Long descriptions that wrapped onto two lines in the PDF may land in two rows; merge them before sorting.",
              "Turn on a filter on the header row to find, for example, every UPI payment to one shop.",
            ],
          },
        ],
      },
      {
        heading: "Other formats",
        blocks: [
          { p: "For importing into accounting software, [PDF to CSV](/tools/pdf-to-csv) gives plain comma-separated data, either one file for all pages or one per page. If your statement is a scan or a photo, the text first has to be recognised with [OCR PDF](/tools/ocr-pdf); check the converted amounts carefully, as recognition errors are easy to miss in numbers." },
        ],
      },
    ],
    faq: [
      ["Why are some columns merged together?", "Statements without clear column spacing can confuse the column detection. Use Excel's Text to Columns on the merged column, splitting by spaces or a fixed width."],
      ["Can I convert a credit card statement the same way?", "Yes. Any PDF statement with selectable text converts the same way."],
    ],
  },
  {
    slug: "translate-pdf-english-to-hindi",
    title: "How to Translate a PDF From English to Hindi, Tamil or Marathi",
    description: "Translate a whole PDF into Hindi, Tamil, Telugu, Marathi, Bengali and 16 more languages with AI, keeping its headings and paragraphs. Free, no sign-up.",
    h1: "How to translate a PDF from English to Hindi, Tamil or Marathi",
    summary:
      "Open [Translate PDF](/tools/translate-pdf), choose the PDF, pick Hindi (or Tamil, Telugu, Marathi, Bengali and others) and press Translate. You get the translated text with its headings and paragraphs, which you can copy or download. It works the other way too, from Hindi or another language into English.",
    published: "2026-10-31",
    time: "17:00",
    updated: "2026-10-31",
    cluster: "ai-pdf-tools",
    tools: ["translate-pdf", "word-editor", "ocr-pdf", "summarize-pdf"],
    sections: [
      {
        heading: "Translate step by step",
        blocks: [
          {
            steps: [
              "Open [Translate PDF](/tools/translate-pdf) and choose a PDF with selectable text.",
              "Pick the language to translate into. There are 21, including Hindi, Tamil, Telugu, Marathi and Bengali.",
              "Press Translate.",
              "Copy the translation, or download it as a file.",
            ],
          },
          { note: "The text is read from the PDF on your device; only that text is sent to our AI provider to translate it, and nothing is stored." },
        ],
      },
      {
        heading: "Turn the translation into a document",
        blocks: [
          { p: "The result is text, not a re-laid-out copy of the original PDF. To make a formatted document, paste it into the [Word editor](/tools/word-editor), adjust headings and spacing, and download it. Check that the script displays correctly in the downloaded file before you send it." },
        ],
      },
      {
        heading: "Accuracy",
        blocks: [
          {
            list: [
              "AI translation handles letters, notices, manuals and study material well.",
              "Names, legal terms and technical words may be translated too literally. Read the result before sharing it.",
              "For court filings, government submissions or contracts, use a certified translator: machine translation isn't accepted as an official translation.",
            ],
          },
          { p: "Scanned PDFs have no text to translate until you run [OCR PDF](/tools/ocr-pdf), which recognises English text. For a quick sense of a long document before translating it, [Summarize PDF](/tools/summarize-pdf) gives the main points." },
        ],
      },
    ],
    faq: [
      ["Can I translate a Hindi PDF to English?", "Yes, as long as the PDF has selectable Hindi text. Choose English as the language to translate into."],
      ["Does it keep the original layout?", "It keeps headings and paragraphs, but not the exact page design. Format the text in the Word editor if you need a finished document."],
    ],
  },
  {
    slug: "auto-redact-pdf-personal-data",
    title: "How to Automatically Redact Phone Numbers, Emails and PAN in a PDF",
    description: "Find and permanently remove Aadhaar, PAN, phone numbers, emails, card numbers, GSTIN, IFSC and IBAN from a PDF automatically, on your own device.",
    h1: "How to automatically redact phone numbers, emails and PAN in a PDF",
    summary:
      "Open [Auto-redact personal data](/tools/auto-redact-pii), choose the PDF, tick the kinds of data to remove (Aadhaar, PAN, phone numbers, emails, card numbers, GSTIN, IFSC or IBAN) and press Find & redact. Every match is deleted from the file and covered with a black box. Review the list of what was removed before you share the document.",
    published: "2026-11-01",
    time: "09:00",
    updated: "2026-11-01",
    cluster: "pdf-tools",
    tools: ["auto-redact-pii", "redact-pdf", "privacy-scanner", "ocr-pdf"],
    sections: [
      {
        heading: "Redact step by step",
        blocks: [
          {
            steps: [
              "Open [Auto-redact personal data](/tools/auto-redact-pii) and choose the PDF.",
              "Tick what to find: Aadhaar, PAN, card numbers, emails, phone numbers, GSTIN, IFSC or IBAN.",
              "Press Find & redact and go through the list of matches.",
              "Download the redacted PDF and open it to check.",
            ],
          },
          { note: "Everything runs in your browser. A tool that finds personal data shouldn't need to see it on a server." },
        ],
      },
      {
        heading: "How it avoids false matches",
        blocks: [
          { p: "Numbers are checked, not just pattern-matched: Aadhaar numbers and card numbers have built-in check digits, so a random 12-digit invoice number isn't mistaken for an Aadhaar. PAN, GSTIN and IFSC are matched by their fixed formats." },
        ],
      },
      {
        heading: "What it can't see",
        blocks: [
          {
            list: [
              "Scanned pages are images, so there's no text to search. Run [OCR PDF](/tools/ocr-pdf) first, or draw redaction boxes by hand.",
              "Names and addresses don't follow a fixed pattern. Remove them with [Redact PDF](/tools/redact-pdf), which deletes the exact words you type.",
              "Unusual formats, such as a phone number split across two lines, may be missed. Always look over the result.",
            ],
          },
          { p: "To check a document for hidden details as well (author name, comments, attachments), run it through the [Privacy scanner](/tools/privacy-scanner). For Aadhaar copies specifically, see [Masked Aadhaar](/guides/masked-aadhaar-hide-aadhaar-number)." },
        ],
      },
    ],
    faq: [
      ["Is the redacted text really gone?", "Yes. Matches are deleted from the page content, so they can't be copied, searched or recovered from the downloaded PDF."],
      ["Can I keep the last four digits of a card or Aadhaar number?", "Auto-redact removes the whole number. To keep the last digits, use the Redact tool in the PDF editor and cover only the first digits."],
    ],
  },
  {
    slug: "neet-ug-photo-signature-document-size",
    title: "NEET UG Photo, Signature, Fingerprint and Document Upload Sizes",
    description: "NEET UG's live photo, passport photo, signature, fingerprint and certificate uploads explained, with file sizes that fit NTA's published limits.",
    h1: "NEET UG photo, signature, fingerprint and document upload sizes",
    summary:
      "For NEET UG 2026, NTA captured a live photo during the application and matched it with the Aadhaar photo, and asked for uploads of a recent passport photo, a signature, an image of both hands' fingers and thumbs, and certificates where they apply. Aim for a photo of 50–200 KB, a signature of 10–30 KB, the fingerprints at 50–200 KB and certificates as PDFs of 50–300 KB. Check the NEET UG 2027 bulletin before you upload.",
    published: "2026-11-01",
    time: "13:00",
    updated: "2026-11-01",
    cluster: "image-tools",
    tools: ["resize-image", "compress-image", "compress-pdf", "scan-to-pdf"],
    sections: [
      {
        heading: "The live photo",
        blocks: [
          { p: "NEET UG 2026 introduced a live photograph taken with your webcam or phone camera while filling the form. It was compared with your Aadhaar photo; candidates whose photos didn't match had to submit a certified photograph. Update your Aadhaar photo early if it's very old, and take the live photo in good light against a plain background." },
        ],
      },
      {
        heading: "Files to prepare",
        blocks: [
          {
            list: [
              "Passport-size photo: recent (2026 rules asked for one taken after 1 January of the exam year), colour, white background, face covering about 80% with ears visible. JPG, within NTA's 10–200 KB range.",
              "Signature: running signature in black or blue ink on white paper. JPG. Reported limits differ between bulletins (4–30 KB in older ones, larger in newer ones); 10–30 KB fits all of them.",
              "Fingers and thumbs: one JPG showing the fingers and thumbs of both hands, pressed in ink on white paper. The 2026 bulletin gives both 10–200 KB and 50–300 KB in different places; 50–200 KB satisfies both.",
              "Certificates (category, PwBD and others that apply to you): PDF, 50–300 KB in NTA's recent bulletins.",
            ],
          },
        ],
      },
      {
        heading: "Prepare and resize",
        blocks: [
          {
            steps: [
              "Photograph each item in daylight on white paper, and crop it close.",
              "For images, open [Resize image](/tools/resize-image), turn on Limit the file size and enter the upper limit (for example 200 KB for the photo, 30 KB for the signature).",
              "Check the downloaded file is above the lower limit; if not, resize at a higher quality.",
              "Scan certificates with [Scan to PDF](/tools/scan-to-pdf) and bring them under 300 KB with [Compress PDF](/tools/compress-pdf).",
            ],
          },
          { note: "These ranges come from the NEET UG 2026 information bulletin and reports on it. NTA can change them each year, and the bulletin and the hints on the form always take priority." },
        ],
      },
    ],
    faq: [
      ["Do I still upload a passport photo if there's a live photo?", "In 2026, yes: the live photo is taken in addition to the uploaded passport-size photograph. Follow the bulletin for your year."],
      ["What if my live photo doesn't match my Aadhaar photo?", "In 2026 NTA asked such candidates to upload a photograph certified by an authority listed in the bulletin. Updating an old Aadhaar photo before applying avoids this."],
    ],
  },
  {
    slug: "itr-v-pdf-password",
    title: "ITR-V Acknowledgement PDF Password and How to Open It",
    description: "The ITR-V PDF opens with your PAN in lowercase followed by your date of birth (DDMMYYYY). Examples, the same rule for AIS and 143(1) intimations, and unlocking it.",
    h1: "ITR-V acknowledgement PDF password and how to open it",
    summary:
      "Your ITR-V acknowledgement opens with your PAN in lowercase letters followed by your date of birth as DDMMYYYY. For PAN ABCDE1234F and a birthday of 5 March 1992, type abcde1234f05031992. The same password opens the AIS and intimations under section 143(1). [Unlock PDF](/tools/unlock-pdf) saves a copy without it.",
    published: "2026-11-01",
    time: "18:00",
    updated: "2026-11-01",
    cluster: "pdf-tools",
    tools: ["unlock-pdf", "merge-pdf", "protect-pdf"],
    sections: [
      {
        heading: "The password format",
        blocks: [
          {
            list: [
              "Your full PAN in lowercase: abcde1234f.",
              "Then your date of birth as DDMMYYYY: 05031992.",
              "Together, with no spaces: abcde1234f05031992.",
            ],
          },
          { p: "Companies, firms and other entities use their date of incorporation or formation in place of a date of birth." },
        ],
      },
      {
        heading: "Other tax documents with the same password",
        blocks: [
          {
            list: [
              "Annual Information Statement (AIS) and Taxpayer Information Summary (TIS) PDFs.",
              "Intimation under section 143(1) after your return is processed, and other notices and orders emailed by the department.",
            ],
          },
          { p: "Form 26AS downloaded from TRACES uses only your date of birth (DDMMYYYY) where a password is asked for, and Form 16 uses a different format, covered in [Form 16 password](/guides/form-16-password)." },
        ],
      },
      {
        heading: "Unlock it for your records",
        blocks: [
          {
            steps: [
              "Open [Unlock PDF](/tools/unlock-pdf) and choose the ITR-V.",
              "Enter the password and press Unlock PDF.",
              "Download the copy, which opens without a password.",
            ],
          },
          { p: "To keep a year's tax papers together, combine the ITR-V, computation, Form 16 and AIS with [Merge PDF](/tools/merge-pdf), and protect the combined file with [Protect PDF](/tools/protect-pdf) if you store it in the cloud." },
        ],
      },
      {
        heading: "Don't forget to verify the return",
        blocks: [
          { note: "A return is only complete once it's verified. E-verify it (Aadhaar OTP, net banking or a bank account) or post the signed ITR-V to CPC Bengaluru within 30 days of filing." },
        ],
      },
    ],
    faq: [
      ["Is the ITR-V password case-sensitive?", "Yes. The PAN must be in lowercase, followed by the date of birth as eight digits."],
      ["Do I need to send ITR-V by post?", "Only if you don't e-verify. E-verification online is quicker and removes the need to post it."],
    ],
  },
  {
    slug: "jee-main-photo-signature-size",
    title: "JEE Main Photo and Signature Size, and Common Rejection Reasons",
    description: "JEE Main's live photo, uploaded photo and signature explained, with file sizes that fit NTA's published limits, and the mistakes that get uploads rejected.",
    h1: "JEE Main photo and signature size, and common rejection reasons",
    summary:
      "JEE Main 2026 added a live photo, taken with your webcam or phone during the application and matched with your Aadhaar photo, alongside the usual uploads. Keep the passport photo as a JPG of 10–200 KB (white background, face about 80% of the frame) and the signature as a JPG of 10–50 KB, and check the bulletin for your session before uploading.",
    published: "2026-11-02",
    time: "10:00",
    updated: "2026-11-02",
    cluster: "image-tools",
    tools: ["resize-image", "compress-image", "crop-image", "convert-image"],
    sections: [
      {
        heading: "The live photo",
        blocks: [
          { p: "For the 2026 sessions, NTA captured a live photograph during registration and compared it with the Aadhaar photo. Many candidates whose photos didn't match had to upload a certified photograph later, so make sure your Aadhaar photo is reasonably recent, and take the live photo in good light, facing the camera, without a mask, cap or glasses." },
        ],
      },
      {
        heading: "Photo and signature files",
        blocks: [
          {
            list: [
              "Photo: recent, colour, white background, face and ears clearly visible, about 80% of the frame. JPG, 10–200 KB.",
              "Signature: running signature in black or blue ink on white paper, not in capitals. JPG. Sizes reported for recent sessions range from 10–50 KB to 10–100 KB; 10–50 KB fits both.",
              "Category or PwD certificates, if they apply: PDF, typically 50–300 KB in NTA bulletins.",
            ],
          },
        ],
      },
      {
        heading: "Resize step by step",
        blocks: [
          {
            steps: [
              "Crop the photo so your face is centred with a little space above the head, using [Crop image](/tools/crop-image) with the passport ratio.",
              "Open [Resize image](/tools/resize-image), turn on Limit the file size and enter 200 KB for the photo, then repeat with 50 KB for the signature.",
              "If your phone saved a HEIC or PNG file, change it to JPG with [Convert image](/tools/convert-image) first.",
              "Check each file is above 10 KB before uploading.",
            ],
          },
        ],
      },
      {
        heading: "Common rejection reasons",
        blocks: [
          {
            list: [
              "Selfies or photos with busy, dark or coloured backgrounds.",
              "Face too small, cut off, or partly covered by hair, a mask or tinted glasses.",
              "Signature in capital letters, or a tiny signature lost in a large white image.",
              "File in the wrong format or outside the KB range.",
              "Photo not matching the live capture or the Aadhaar photo.",
            ],
          },
          { note: "These ranges come from the 2026 information bulletin and reports on it. NTA may change them for 2027, and the bulletin and the form's hints always take priority." },
        ],
      },
    ],
    faq: [
      ["Can I upload the same photo for both sessions?", "Use the same recent photo throughout a year's registration so your records match. Follow the bulletin if it asks for a new one."],
      ["My signature file is 6 KB. What should I do?", "Resize it to larger dimensions or a higher quality until it's at least 10 KB."],
    ],
  },
  {
    slug: "bank-statement-pdf-password",
    title: "Bank Statement PDF Password: Where to Find It and How to Remove It",
    description: "Every bank builds its statement password differently. Where to find yours, the details banks usually combine, and how to save a statement without the password.",
    h1: "Bank statement PDF password: where to find it and how to remove it",
    summary:
      "Banks protect e-statements with a password made from your own details, such as your customer ID, account number, date of birth, part of your name or mobile number, and each bank combines them differently. The exact rule is written in the email that carries the statement, usually below the message. Once you know it, [Unlock PDF](/tools/unlock-pdf) saves a copy without the password.",
    published: "2026-11-02",
    time: "17:00",
    updated: "2026-11-02",
    cluster: "pdf-tools",
    tools: ["unlock-pdf", "pdf-to-excel", "merge-pdf", "protect-pdf"],
    sections: [
      {
        heading: "Where to find your password",
        blocks: [
          {
            list: [
              "The email the statement came in: most banks explain the password format at the bottom of the message.",
              "Your bank's website or app, under FAQs for e-statements.",
              "Customer care, if the email doesn't say.",
            ],
          },
          { p: "Banks change these formats occasionally, so a password that worked for last year's statements may not work for this year's." },
        ],
      },
      {
        heading: "Details banks usually combine",
        blocks: [
          {
            list: [
              "Customer ID or CRN, sometimes on its own.",
              "Account number, or its last few digits.",
              "Date of birth, as DDMM, DDMMYY or DDMMYYYY.",
              "The first few letters of your name, in capitals or lowercase.",
              "The last few digits of your registered mobile number.",
            ],
          },
          { p: "If a format with your name fails, check the exact spelling and case the email asks for, and use the name as it appears in your bank account." },
        ],
      },
      {
        heading: "Remove the password from your copy",
        blocks: [
          {
            steps: [
              "Open [Unlock PDF](/tools/unlock-pdf) and choose the statement.",
              "Enter the password and press Unlock PDF.",
              "Download the copy that opens without a password.",
            ],
          },
          { note: "The statement is unlocked in your browser; it isn't uploaded. The tool needs the correct password: it doesn't crack or guess passwords." },
          { p: "Unlocked statements are easy to combine for a loan or visa application with [Merge PDF](/tools/merge-pdf), or to analyse in Excel with [PDF to Excel](/tools/pdf-to-excel). Add a password of your own with [Protect PDF](/tools/protect-pdf) before emailing them." },
        ],
      },
    ],
    faq: [
      ["Can I open a bank statement without the password?", "No. The password is needed to decrypt it. Find the format in the bank's email, or ask the bank."],
      ["Why do loan applications ask for unlocked statements?", "Lenders' systems often can't open protected PDFs. Unlock a copy for them, and keep the original protected file for yourself."],
    ],
  },
];
