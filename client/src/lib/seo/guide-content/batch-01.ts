import type { Guide } from "../guides";

/** Scheduled guides 1–10 (22–25 October 2026). */
export const BATCH_01: Guide[] = [
  {
    slug: "ssc-cgl-photo-and-signature-size",
    title: "SSC CGL Photo and Signature Size: Live Photo and 10–20 KB Signature",
    description: "SSC CGL now takes your photo live during the application. Here is the signature size SSC asks for (10–20 KB JPG) and how to prepare it so it isn't rejected.",
    h1: "SSC CGL photo and signature size: what you upload now",
    summary:
      "SSC no longer accepts an uploaded passport photo: the photograph is captured live with your webcam or the mySSC app while you fill the form. The only image you prepare is your signature: a JPG between 10 KB and 20 KB, signed on white paper and cropped so it fills the box. [Resize image](/tools/resize-image) can set the size and keep it under 20 KB in one step.",
    published: "2026-10-22",
    time: "09:00",
    updated: "2026-10-22",
    cluster: "image-tools",
    tools: ["resize-image", "crop-image", "compress-image"],
    sections: [
      {
        heading: "How the photograph works now",
        blocks: [
          { p: "For SSC CGL 2026 the application module captures a live photograph through your computer's webcam. If your computer has no camera, the Upload Documents page shows a QR code for the official mySSC app, which takes the photo on your phone instead. An old photo, or a photo of a printed photo, gets the application rejected, so there is no photo file to resize." },
          {
            list: [
              "Sit facing the camera at eye level, in good, even light, against a plain light background.",
              "Remove your cap, mask and glasses or spectacles.",
              "Keep your face inside the outline the screen shows: not too close and not too far.",
            ],
          },
        ],
      },
      {
        heading: "Signature requirements",
        blocks: [
          {
            list: [
              "Format: JPG or JPEG.",
              "File size: between 10 KB and 20 KB.",
              "Shape: a wide, short image. The notice describes it as about 4.0 cm wide and 2.0 cm high (one paragraph says 6.0 × 2.0 cm); the upload box on the portal is the final word.",
              "Your normal running signature, not your name in capital letters.",
            ],
          },
          { note: "A tiny signature floating in a big white image is one of the most common reasons for rejection. Crop close so the signature fills most of the frame." },
        ],
      },
      {
        heading: "Prepare the signature step by step",
        blocks: [
          {
            steps: [
              "Sign with a black or blue pen on plain white paper, a little larger than usual.",
              "Photograph or scan it in good light, holding the phone straight above the paper.",
              "Open [Crop image](/tools/crop-image) and crop tightly around the signature, leaving only a thin white margin.",
              "Open [Resize image](/tools/resize-image), choose Print size and set 4.0 × 2.0 cm at 200 DPI (about 315 × 157 pixels).",
              "Turn on Limit the file size, enter 20 KB, choose JPG and press Resize.",
              "Check the result shows at least 10 KB. If it is smaller, raise the DPI a little and resize again.",
            ],
          },
          { p: "If you only need to shrink a file that already has the right shape, [Compress image](/tools/compress-image) with File size set to 20 KB does it without changing the dimensions." },
        ],
      },
      {
        heading: "Before you submit",
        blocks: [
          { p: "Open the downloaded file and zoom in: every stroke should be clear, with no shadow from your hand or the phone. Upload it, and check the preview the portal shows before final submission, since you may not be able to change it afterwards." },
        ],
      },
    ],
    faq: [
      ["Do I need to upload a passport photo for SSC CGL?", "No. The photo is captured live during the application, through a webcam or the mySSC app. Only the signature is uploaded as a file."],
      ["What if my signature is under 10 KB?", "The portal rejects files below 10 KB. Resize it to slightly larger dimensions or a higher DPI so the file lands between 10 and 20 KB."],
    ],
  },
  {
    slug: "aadhaar-pdf-password",
    title: "Aadhaar PDF Password: Format, Examples and How to Open e-Aadhaar",
    description: "The e-Aadhaar PDF password is the first four letters of your name in capitals plus your birth year. Examples, common mistakes, and how to remove the password.",
    h1: "Aadhaar PDF password: format, examples and how to open it",
    summary:
      "The password for an e-Aadhaar PDF is the first four letters of your name exactly as printed on the Aadhaar, in CAPITAL letters, followed by your year of birth. For example, SURESH KUMAR born in 1990 opens the file with SURE1990. If you want a copy that opens without the password, [Unlock PDF](/tools/unlock-pdf) removes it on your own device.",
    published: "2026-10-22",
    time: "13:00",
    updated: "2026-10-22",
    cluster: "pdf-tools",
    tools: ["unlock-pdf", "auto-redact-pii", "protect-pdf"],
    sections: [
      {
        heading: "The password format",
        blocks: [
          { p: "UIDAI protects every downloaded e-Aadhaar with an eight-character password built from your own details, so it is never sent to you separately and cannot be changed." },
          {
            list: [
              "Name SURESH KUMAR, born 1990: SURE1990",
              "Name PRIYA SHARMA, born 2001: PRIY2001",
              "Name R. MOHAN, born 1985: R.MO1985 (dots and other characters in the name count)",
            ],
          },
          { p: "There is no space between the letters and the year, and the letters must be capitals." },
        ],
      },
      {
        heading: "When the password doesn't work",
        blocks: [
          {
            list: [
              "Use the name as it appears in your Aadhaar record, not your full name or a nickname. Check the spelling on an old copy of the card.",
              "Use the year of birth from the Aadhaar record; if only a year was recorded, that year is what counts.",
              "Make sure Caps Lock is on for the letters, and that your keyboard isn't adding a space.",
              "For names shorter than four letters, guides disagree on the exact rule. Try the name as printed followed by the year (for example RAM1993).",
            ],
          },
        ],
      },
      {
        heading: "Remove the password from your copy",
        blocks: [
          {
            steps: [
              "Open [Unlock PDF](/tools/unlock-pdf) and choose the e-Aadhaar file.",
              "Type the password in the format above.",
              "Press Unlock PDF and download the copy that opens without a password.",
            ],
          },
          { note: "Unlock PDF works inside your browser, so your Aadhaar is never uploaded. It only removes a password you already know; it can't guess one." },
        ],
      },
      {
        heading: "Keep the unlocked copy safe",
        blocks: [
          { p: "An unlocked Aadhaar opens for anyone who gets the file. Store it somewhere private, and when you share it for KYC, consider hiding the first eight digits: [Auto-redact personal data](/tools/auto-redact-pii) finds Aadhaar numbers and removes them from the file. If you need to send it with a password again, [Protect PDF](/tools/protect-pdf) adds one of your choice." },
        ],
      },
    ],
    faq: [
      ["Is the Aadhaar PDF password case-sensitive?", "Yes. The four letters must be capitals, followed by the four-digit year, with no space."],
      ["Can I change the e-Aadhaar password?", "No. UIDAI sets it from your name and year of birth. You can remove it from your own copy with Unlock PDF once you know it."],
    ],
  },
  {
    slug: "gst-portal-upload-size-limit",
    title: "GST Portal Upload Size Limit: Make Your PDF Fit the 5 MB Rule",
    description: "GST portal attachments must be PDF or JPEG, at most 5 MB each, usually up to four files. How to compress and split replies and appeal documents so they upload.",
    h1: "GST portal upload size limit: how to make your PDF fit",
    summary:
      "On the GST portal, supporting documents for appeals and notice replies must be PDF or JPEG files of at most 5 MB each, and many forms accept no more than four. If your PDF is larger, [GST filing prep](/tools/gst-filing-prep) compresses it and, only if that isn't enough, splits it into numbered parts that are each under 5 MB.",
    published: "2026-10-22",
    time: "18:00",
    updated: "2026-10-22",
    cluster: "pdf-tools",
    tools: ["gst-filing-prep", "compress-pdf", "split-by-size", "merge-pdf"],
    sections: [
      {
        heading: "What the GST portal accepts",
        blocks: [
          { p: "The GST portal's own user manuals give the same limits in several places:" },
          {
            list: [
              "Appeal to the appellate authority (APL-01): the annexure is uploaded as a PDF of at most 5 MB, and up to four other supporting documents can be attached, each a PDF or JPEG of at most 5 MB. Remaining documents can be handed over in hard copy.",
              "Payments and replies in enforcement cases: up to four PDF or JPEG files of at most 5 MB each.",
            ],
          },
          { p: "Limits can differ between forms, so read the hint next to the upload button for the form you're filing." },
        ],
      },
      {
        heading: "Make a large PDF fit, step by step",
        blocks: [
          {
            steps: [
              "Open [GST filing prep](/tools/gst-filing-prep) and choose the PDF you need to upload.",
              "Pick 5 MB as the limit per file.",
              "Press Prepare for upload. The tool compresses the PDF first and only splits it if it's still too big.",
              "Download the parts. They are numbered in page order, so attach them in that order.",
            ],
          },
          { note: "The work happens in your browser, so notices, financial statements and replies are never uploaded to us." },
        ],
      },
      {
        heading: "When there are more files than slots",
        blocks: [
          { p: "With only four attachments allowed, plan the files before you compress them. Group related annexures into one document with [Merge PDF](/tools/merge-pdf) (for example all invoices in one file, all ledgers in another), then run each group through GST filing prep." },
          { p: "If one group alone is far above 5 MB, check how it was scanned. Scans saved at very high resolution or in full colour are the usual cause: plain black-and-white pages scanned at 150–200 DPI stay small and readable. [Compress PDF](/tools/compress-pdf) with Grayscale images turned on often brings colour scans down a long way, and [Split by size](/tools/split-by-size) handles any other upload limit." },
        ],
      },
    ],
    faq: [
      ["What is the maximum file size on the GST portal?", "For supporting documents in appeals and notice replies, 5 MB per file, in PDF or JPEG format. Always check the hint shown on the form you are filing."],
      ["Will compressing make my documents unreadable?", "No. Text stays as sharp text; only images inside the PDF are re-encoded. Check the result before uploading, especially for faint scans."],
    ],
  },
  {
    slug: "edit-latex-resume-pdf",
    title: "How to Edit a LaTeX or Overleaf Resume PDF Without the .tex File",
    description: "Lost the .tex source of your résumé? Change words in the PDF itself while keeping the LaTeX fonts, link colours and underlines. Free, and nothing is uploaded.",
    h1: "How to edit a LaTeX résumé PDF without the .tex file",
    summary:
      "Open the PDF in the [PDF editor](/tools/edit-pdf), choose Edit text and click the line you want to change. The new words are written with the résumé's own Computer Modern font, and blue links and their underlines keep their colour. For more than a few small changes, editing the .tex source (for example in Overleaf) is still the cleaner route.",
    published: "2026-10-23",
    time: "10:00",
    updated: "2026-10-23",
    cluster: "pdf-tools",
    tools: ["edit-pdf", "pdf-to-word", "compress-pdf"],
    sections: [
      {
        heading: "Why LaTeX résumés are hard to edit",
        blocks: [
          { p: "Templates made with LaTeX (Jake's Resume, Awesome-CV, moderncv and most Overleaf templates) use TeX fonts such as CMR10 and CMBX10, place every word at an exact position, and draw link underlines as separate lines rather than as part of the text. Many PDF editors replace the line with Arial or Helvetica, turn it all one colour, or leave the old underline behind." },
        ],
      },
      {
        heading: "Edit a line step by step",
        blocks: [
          {
            steps: [
              "Open the [PDF editor](/tools/edit-pdf) and choose your résumé PDF.",
              "Pick Edit text in the toolbar. Every line of text gets a dashed outline.",
              "Click the line you want to change and type. Bold and italic parts, and blue link words, keep their own style.",
              "Press Esc when you're done, check the line, and download the PDF.",
            ],
          },
          { p: "The old words are deleted from the file, together with the underlines drawn under them, so nothing shows through or can be copied out of the new PDF." },
        ],
      },
      {
        heading: "What to expect",
        blocks: [
          {
            list: [
              "Letters the résumé already uses are written with its own embedded font. TeX fonts are usually embedded as subsets, so a letter that never appeared in the original falls back to a similar standard font.",
              "Short changes (a date, a company name, a number, a few words) look seamless. Rewriting a whole paragraph is better done in the source.",
              "The clickable area of a link stays where it was. If you change a link's wording a lot, check that it still sits over the word.",
            ],
          },
          { note: "Click a line without changing it and it stays exactly as it was: the editor only rewrites lines you actually change." },
        ],
      },
      {
        heading: "Other options",
        blocks: [
          { p: "If you need to restructure the whole document, [PDF to Word](/tools/pdf-to-word) gives you an editable .docx with real headings and lists, though the LaTeX look will change. If the edited PDF is too large for a job portal, [Compress PDF](/tools/compress-pdf) shrinks it without touching the text." },
        ],
      },
    ],
    faq: [
      ["Will the edited résumé still pass applicant tracking systems?", "Yes. The edited line is real, selectable text, so it can be copied and read by ATS software like the rest of the document."],
      ["Is my résumé uploaded?", "No. The editor runs in your browser; the file only leaves your device if you choose to save it to the cloud."],
    ],
  },
  {
    slug: "edit-pdf-text-same-font",
    title: "How to Edit Text in a PDF Without Changing the Font",
    description: "Change words in a PDF so they match the original font, size and colour. Why edits often look wrong, how font subsets work, and how to get a clean result.",
    h1: "How to edit text in a PDF without changing the font",
    summary:
      "In the [PDF editor](/tools/edit-pdf), choose Edit text and click the line to change. The editor writes your new words with the font that is embedded in the PDF, at the same size and colour, and deletes the old words from the file. Letters the embedded font doesn't contain use the closest standard font.",
    published: "2026-10-23",
    time: "17:00",
    updated: "2026-10-23",
    cluster: "pdf-tools",
    tools: ["edit-pdf", "ocr-pdf"],
    sections: [
      {
        heading: "Why edited PDF text often looks wrong",
        blocks: [
          { p: "A PDF isn't a word-processor file. Each line is a set of characters placed at exact positions, drawn with a font that is usually embedded inside the file, and often only as a subset: just the letters the document used. Many editors can't reuse that subset, so they paint a white box over the old line and type a new one in Arial or Times on top." },
          { p: "That shows up as a slightly different typeface, a different weight, a line that sits a little higher or lower, or a white patch on coloured backgrounds. The old words are also still in the file underneath." },
        ],
      },
      {
        heading: "Edit text with the original font",
        blocks: [
          {
            steps: [
              "Open the [PDF editor](/tools/edit-pdf) and choose your PDF.",
              "Pick Edit text. Every line you can change gets a dashed outline.",
              "Click a line and type your change. The panel on the right shows the font, size and colour it found.",
              "Press Esc, check the result, and download the PDF.",
            ],
          },
          { p: "If a line mixes styles (a bold label followed by normal text, or a blue link inside a sentence) each part keeps its own font and colour." },
        ],
      },
      {
        heading: "Getting the cleanest result",
        blocks: [
          {
            list: [
              "Keep changes close to the original length. A much longer line can run into whatever sits to its right.",
              "Use letters the document already contains where you can. A missing letter falls back to a standard font, which may stand out in a decorative typeface.",
              "Change one line at a time: each line is edited separately, which keeps paragraph spacing intact.",
            ],
          },
          { note: "Scanned pages are pictures of text, so there is no font to reuse. You can still type on top of them, or run [OCR PDF](/tools/ocr-pdf) first to make the words searchable." },
        ],
      },
      {
        heading: "More editing help",
        blocks: [
          { p: "For adding text boxes, images, signatures and highlights, see [How to edit a PDF](/guides/how-to-edit-a-pdf)." },
        ],
      },
    ],
    faq: [
      ["Does the old text stay hidden underneath?", "No. The original characters are deleted from the page content when you export, so they can't be copied or found by search."],
      ["Can I change the font size of an existing line?", "Yes. Select the edited line and change the size in the properties panel; you can also make parts of it bold, italic or a different colour."],
    ],
  },
  {
    slug: "do-online-pdf-tools-upload-your-files",
    title: "Do Online PDF Tools Upload Your Files? How to Check in 30 Seconds",
    description: "Most online PDF tools send your file to a server. Two quick ways to see whether a tool uploads your document, and which Fusion Office tools work on your device.",
    h1: "Do online PDF tools upload your files? How to check",
    summary:
      "Most online PDF sites upload your document to their servers, process it there and delete it later. You can check any tool yourself: load the page, switch off your internet, and run the task. If it still works, the file never left your device. Most Fusion Office tools, including [Compress PDF](/tools/compress-pdf) and [Merge PDF](/tools/merge-pdf), pass that test.",
    published: "2026-10-24",
    time: "09:00",
    updated: "2026-10-24",
    cluster: "pdf-tools",
    tools: ["compress-pdf", "merge-pdf", "unlock-pdf", "edit-pdf"],
    sections: [
      {
        heading: "Why it matters",
        blocks: [
          { p: "Bank statements, Aadhaar and PAN copies, salary slips and contracts are exactly the files people run through PDF tools. When a tool uploads them, your privacy depends on how that company stores, logs and deletes files. When a tool works in your browser, there is nothing to store." },
        ],
      },
      {
        heading: "Test 1: the offline test (any device)",
        blocks: [
          {
            steps: [
              "Open the tool's page and wait until it has fully loaded.",
              "Turn on airplane mode, or switch off Wi-Fi and mobile data.",
              "Choose your file and run the task.",
              "If you get a result, the work happened on your device. If you get an error or an endless spinner, the tool needed a server.",
            ],
          },
        ],
      },
      {
        heading: "Test 2: watch the network (computer)",
        blocks: [
          {
            steps: [
              "In Chrome or Edge, press F12 (or Ctrl+Shift+I, Cmd+Option+I on a Mac) and open the Network tab.",
              "Run the task with a file of a few megabytes.",
              "Look for a request whose size is close to your file's size, usually a POST or PUT. That is your file being uploaded.",
            ],
          },
          { p: "Small requests for icons, fonts and analytics are normal and don't contain your document." },
        ],
      },
      {
        heading: "Which Fusion Office tools upload",
        blocks: [
          { p: "Each tool page says how it works, next to its title: Works in your browser, Converted on our server, or Uses AI." },
          {
            list: [
              "On your device: compressing, merging, splitting, organising, editing, signing, protecting and unlocking PDFs, PDF to Word, Excel and JPG, OCR, and all image tools.",
              "On our server: converting Word, Excel, PowerPoint, web pages, Markdown, CSV, eBooks and CorelDRAW files, which need office software. The file is deleted as soon as the result is ready.",
              "AI tools (summarise, translate, chat): the text is read from the PDF on your device and only that text is sent to the AI provider; nothing is stored.",
            ],
          },
        ],
      },
    ],
    faq: [
      ["Is it safe to use online PDF tools for ID documents?", "It's safest with tools that work in your browser, since the file never leaves your device. Use the offline test above to check any tool."],
      ["Does Fusion Office keep my files?", "Browser tools never receive them. Server conversions delete the file as soon as the result is ready, and saving to the cloud only happens if you choose it."],
    ],
  },
  {
    slug: "open-cdr-file-without-coreldraw",
    title: "How to Open a CDR File Without CorelDRAW (Free)",
    description: "Got a .cdr file but no CorelDRAW? Convert it to PDF, PNG, JPG or SVG online so any phone or computer can open it, or keep it editable as a vector.",
    h1: "How to open a CDR file without CorelDRAW",
    summary:
      "A .cdr file is CorelDRAW's own drawing format, so most computers and phones can't open it. Convert it with the [CDR converter](/tools/cdr-converter): choose PDF to view and print it, PNG or JPG for an image, or SVG to keep it editable as vectors in Illustrator, Inkscape or Figma.",
    published: "2026-10-24",
    time: "13:00",
    updated: "2026-10-24",
    cluster: "image-tools",
    tools: ["cdr-converter", "jpg-to-svg", "convert-image"],
    sections: [
      {
        heading: "Convert a CDR file step by step",
        blocks: [
          {
            steps: [
              "Open the [CDR converter](/tools/cdr-converter) and choose one or more .cdr files.",
              "Pick the output: PDF for printing and sharing, PNG or JPG for an image, or SVG to edit the shapes elsewhere.",
              "For PNG or JPG, pick Screen, Standard or Print quality (up to 300 DPI).",
              "Press Convert and download the result, or a ZIP if you converted several files.",
            ],
          },
          { p: "The conversion runs on our server because it needs a CorelDRAW file reader; the file is deleted as soon as your result is ready." },
        ],
      },
      {
        heading: "Which format to choose",
        blocks: [
          {
            list: [
              "PDF: keeps shapes and text sharp at any zoom, includes every page, and opens on every device. The best choice for checking or printing a design.",
              "PNG: a picture with sharp edges, good for logos on websites and social media.",
              "JPG: a smaller picture file for photos and previews.",
              "SVG: editable vector shapes for Illustrator, Inkscape, Figma or CorelDRAW itself. Only the first page is converted.",
            ],
          },
        ],
      },
      {
        heading: "Things that may look different",
        blocks: [
          { p: "Most files from older CorelDRAW versions up to the modern X-series convert well. Very new effects, and fonts that aren't installed on our server, may come out slightly different: missing fonts are replaced with similar ones. Password-protected or damaged CDR files can't be converted." },
          { p: "Free desktop programs can also read CDR files: Inkscape and LibreOffice Draw both import them, which is useful if you need to edit a drawing offline." },
        ],
      },
      {
        heading: "Going the other way",
        blocks: [
          { p: "If a printer or sign maker asks you for a CDR and you only have a JPG logo, convert it to a vector with [JPG to SVG](/tools/jpg-to-svg), then open the SVG in CorelDRAW and save it as .cdr there." },
        ],
      },
    ],
    faq: [
      ["Can I open a CDR file on my phone?", "Not directly. Convert it to PDF or PNG first, and any phone can open the result."],
      ["Will the SVG be editable in CorelDRAW?", "Yes. CorelDRAW imports SVG with its shapes intact, and you can save it as .cdr from there."],
    ],
  },
  {
    slug: "convert-heic-to-jpg-or-pdf",
    title: "How to Convert iPhone HEIC Photos to JPG or PDF",
    description: "iPhone photos save as HEIC, which many websites and forms reject. Convert HEIC to JPG or PDF for free, and set your iPhone to save JPGs in the first place.",
    h1: "How to convert iPhone HEIC photos to JPG or PDF",
    summary:
      "To turn HEIC photos into JPGs, open [Convert image](/tools/convert-image), add the photos, choose JPG and press Convert. For a PDF, convert to JPG first and then put the JPGs into one document with [JPG to PDF](/tools/jpg-to-pdf). Both run in your browser, so the photos aren't uploaded.",
    published: "2026-10-24",
    time: "18:00",
    updated: "2026-10-24",
    cluster: "image-tools",
    tools: ["convert-image", "jpg-to-pdf", "compress-image"],
    sections: [
      {
        heading: "What HEIC is and why forms reject it",
        blocks: [
          { p: "Since iOS 11, iPhones save photos as HEIC (High Efficiency Image), which takes about half the space of a JPG at the same quality. Windows, older Android phones and many upload forms for jobs, exams and government services still only accept JPG, JPEG or PNG." },
        ],
      },
      {
        heading: "Convert HEIC to JPG",
        blocks: [
          {
            steps: [
              "Open [Convert image](/tools/convert-image) and choose your HEIC photos. You can add many at once.",
              "Pick JPG as the format.",
              "Leave quality on the default, or lower it for smaller files.",
              "Press Convert and download the JPGs.",
            ],
          },
          { note: "Reading HEIC depends on the browser. Safari on iPhone, iPad and Mac supports it; if another browser can't open your file, try Safari." },
        ],
      },
      {
        heading: "Turn the photos into a PDF",
        blocks: [
          {
            steps: [
              "Convert the HEIC photos to JPG as above.",
              "Open [JPG to PDF](/tools/jpg-to-pdf) and add the JPGs.",
              "Put them in order with the arrows and pick A4 if the PDF will be printed.",
              "Press Convert to PDF and download one PDF with every photo as a page.",
            ],
          },
          { p: "If the form has a size limit, shrink the JPGs first with [Compress image](/tools/compress-image), or compress the finished PDF." },
        ],
      },
      {
        heading: "Make your iPhone save JPG instead",
        blocks: [
          {
            list: [
              "Settings → Camera → Formats → Most Compatible makes new photos JPG from now on.",
              "Settings → Photos → Transfer to Mac or PC → Automatic converts photos to JPG when you copy them to a computer.",
            ],
          },
          { p: "Existing photos stay HEIC, so you'll still need to convert those." },
        ],
      },
    ],
    faq: [
      ["Does converting HEIC to JPG lose quality?", "Very little at the default quality. JPG files are larger than HEIC for the same picture, but look the same."],
      ["Are my photos uploaded?", "No. The conversion happens in your browser."],
    ],
  },
  {
    slug: "upsc-photo-and-signature-size",
    title: "UPSC Photo and Signature Size and How to Fix Upload Errors",
    description: "UPSC asks for a recent photo with your name and date on it and a sheet of three signatures, as JPGs of 20–300 KB. How to prepare both and fix rejected uploads.",
    h1: "UPSC photo and signature size, and how to fix upload errors",
    summary:
      "UPSC online applications ask for a recent colour photo with your name and the date it was taken printed on it, and one image showing your signature three times, one below the other. Both are JPG files, generally between 20 KB and 300 KB according to recent notices. Check the notice for your exam, then size the files with [Resize image](/tools/resize-image).",
    published: "2026-10-25",
    time: "10:00",
    updated: "2026-10-25",
    cluster: "image-tools",
    tools: ["resize-image", "image-editor", "crop-image", "compress-image"],
    sections: [
      {
        heading: "Photograph rules",
        blocks: [
          {
            list: [
              "A recent colour photo, taken within the period the notice gives (recent notices say within 10 days of applying).",
              "Your name and the date the photo was taken printed clearly at the bottom.",
              "Plain white background, face looking straight at the camera and filling about three quarters of the photo, both ears visible.",
              "JPG format, within the KB range shown on the form.",
            ],
          },
          { p: "If your studio didn't print the name and date, add them yourself with the Text tab of the [Image editor](/tools/image-editor): a white strip at the bottom with black text is enough." },
        ],
      },
      {
        heading: "Signature rules",
        blocks: [
          {
            list: [
              "Sign three times on white paper with a black pen, one signature below the other.",
              "Scan or photograph the sheet so all three signatures are in a single image.",
              "JPG format, within the KB range shown on the form.",
            ],
          },
        ],
      },
      {
        heading: "Prepare both files",
        blocks: [
          {
            steps: [
              "Crop the photo and the signature sheet with [Crop image](/tools/crop-image), leaving only a small margin.",
              "Open [Resize image](/tools/resize-image) and set a size the form accepts in pixels.",
              "Turn on Limit the file size and enter the maximum the form allows, for example 300 KB.",
              "Download and check that the result is above the minimum (for example 20 KB). If it's too small, resize to slightly larger dimensions.",
            ],
          },
        ],
      },
      {
        heading: "Common upload errors",
        blocks: [
          {
            list: [
              "File size out of range: make it larger by increasing the pixel size, or smaller with [Compress image](/tools/compress-image) using a KB limit.",
              "Wrong format: the form wants .jpg or .jpeg. PNG and HEIC files need converting first.",
              "Blurred or dark image: retake it in daylight; compression can't fix a blurry original.",
              "Photo without name and date: add them before uploading, as described above.",
            ],
          },
          { note: "UPSC changes details between notices. The notice for your exam, and the hints on the OTR and application pages, always take priority over any guide." },
        ],
      },
    ],
    faq: [
      ["Do I need my name and date on the UPSC photo?", "Recent UPSC notices require the candidate's name and the date of taking the photo to be printed on it. Check your notice to confirm."],
      ["Why three signatures?", "UPSC asks for the signature to appear three times in one image so it can be checked for consistency. Sign three times, one below the other, on the same sheet."],
    ],
  },
  {
    slug: "masked-aadhaar-hide-aadhaar-number",
    title: "Masked Aadhaar: How to Hide Your Aadhaar Number Before Sharing",
    description: "Share Aadhaar copies with only the last four digits visible. Download a masked Aadhaar from UIDAI, or hide the number in a copy you already have.",
    h1: "Masked Aadhaar: how to hide your Aadhaar number before sharing",
    summary:
      "A masked Aadhaar shows only the last four digits of your number. You can choose the masked option when you download e-Aadhaar from UIDAI. For a copy you already have, remove the number with [Auto-redact personal data](/tools/auto-redact-pii), or black out the first eight digits by hand in the [PDF editor](/tools/edit-pdf). Both delete the digits from the file rather than covering them.",
    published: "2026-10-25",
    time: "17:00",
    updated: "2026-10-25",
    cluster: "pdf-tools",
    tools: ["auto-redact-pii", "redact-pdf", "edit-pdf", "watermark-pdf"],
    sections: [
      {
        heading: "When to use a masked Aadhaar",
        blocks: [
          { p: "Hotels, gyms, landlords, courier companies and many offices ask for an ID copy without needing your full Aadhaar number. A masked copy proves your identity while the first eight digits stay private, which makes misuse of the copy far harder." },
        ],
      },
      {
        heading: "Option 1: download a masked e-Aadhaar",
        blocks: [
          { p: "When you download e-Aadhaar from the myAadhaar portal, tick the option for a masked Aadhaar before downloading. The PDF then shows the number as XXXX XXXX 1234. It uses the same password as the normal e-Aadhaar: the first four letters of your name in capitals and your year of birth." },
        ],
      },
      {
        heading: "Option 2: hide the number in a copy you have",
        blocks: [
          {
            steps: [
              "Open [Auto-redact personal data](/tools/auto-redact-pii) and choose the PDF.",
              "Tick Aadhaar (add PAN or phone numbers too if you like).",
              "Press Find & redact, check what was found, and download the redacted PDF.",
            ],
          },
          { p: "Auto-redact removes the whole number. To keep the last four digits visible, open the PDF in the [PDF editor](/tools/edit-pdf), pick the Redact tool and draw a box over just the first eight digits, then download." },
          { note: "If your copy is a photo or scan, the digits are part of the image and can't be found automatically. Use the editor's Redact box, which removes everything under it from the page." },
        ],
      },
      {
        heading: "Don't forget the QR code",
        blocks: [
          { p: "The QR code on an e-Aadhaar holds your details in digital form. If the person you're sending it to doesn't need to scan it, cover it with a redaction box as well. Adding a line such as “For hotel check-in only” with [Watermark PDF](/tools/watermark-pdf) also makes a copy harder to reuse elsewhere." },
        ],
      },
    ],
    faq: [
      ["Is a masked Aadhaar valid as ID?", "UIDAI provides it for exactly this purpose, and it is widely accepted where the full number isn't required. Some services, such as bank KYC, may still ask for the full number."],
      ["Is a black box drawn on a PDF enough?", "Not always: a box drawn on top can be moved and the number copied from underneath. Redaction removes the text itself, which is what the tools above do."],
    ],
  },
];
