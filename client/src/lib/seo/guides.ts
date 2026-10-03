/**
 * Guides: practical answers to "how do I…" searches. Each one explains the
 * task itself (when to do it, what affects the result, common problems) and
 * walks through doing it with the matching Fusion Office tool.
 *
 * Text may contain inline links written as [anchor text](/path).
 */
import type { ClusterId } from "./clusters";

export type GuideBlock = { p: string } | { steps: string[] } | { list: string[] } | { note: string };

export interface Guide {
  slug: string;
  title: string;
  description: string;
  h1: string;
  /** Direct answer, shown first. */
  summary: string;
  published: string;
  updated: string;
  cluster: ClusterId;
  /** Tools the guide uses, main one first. */
  tools: string[];
  sections: { heading: string; blocks: GuideBlock[] }[];
  faq?: [string, string][];
}

const D = "2026-10-04";

export const GUIDES: Guide[] = [
  {
    slug: "how-to-compress-a-pdf",
    title: "How to Compress a PDF and Reduce Its File Size (Free)",
    description: "Make a PDF smaller for email or upload limits: what makes PDFs large, which compression level to pick, and what to do when it's still too big.",
    h1: "How to compress a PDF (and reduce its file size)",
    summary:
      "To make a PDF smaller, open [Compress PDF](/tools/compress-pdf), add the file, choose the Recommended level and download the result. Most of a PDF's size comes from images, so scans and photo-heavy files shrink the most, often by more than half, while the text stays sharp and searchable.",
    published: D,
    updated: D,
    cluster: "pdf-tools",
    tools: ["compress-pdf", "split-by-size", "gst-filing-prep", "compress-image"],
    sections: [
      {
        heading: "Why some PDFs are so large",
        blocks: [
          { p: "Text barely affects a PDF's size: a 100-page report of plain text is often under 1 MB. What makes PDFs big is images. A phone scan stores every page as a photo, and slides or brochures contain high-resolution pictures that are far sharper than any screen needs." },
          { p: "Fonts and hidden extras add a little too: embedded fonts, thumbnails, metadata and leftover editing data. Compression tools mostly win by re-encoding images at a sensible resolution and quality." },
        ],
      },
      {
        heading: "Compress a PDF step by step",
        blocks: [
          {
            steps: [
              "Open [Compress PDF](/tools/compress-pdf) and choose your file. You can add several PDFs at once.",
              "Pick a level. Less keeps images closest to the original, Recommended is the best balance for most files, and Extreme gives the smallest file with softer images.",
              "Optionally turn on Grayscale images (good for black-and-white documents) and Remove metadata.",
              "Press Compress PDF. The result shows the old and new size; download the file.",
            ],
          },
          { note: "The compression runs in your browser, so the PDF is never uploaded. That matters for statements, IDs and contracts." },
        ],
      },
      {
        heading: "Which compression level should you choose?",
        blocks: [
          {
            list: [
              "Recommended: email attachments, upload portals and sharing. Photos still look clear on screen and print acceptably.",
              "Extreme: when you must reach a small limit, and the document is mostly text or a black-and-white scan.",
              "Less: brochures, portfolios and anything with photos you care about.",
            ],
          },
          { p: "If a file is mostly text and barely shrinks, that's expected: there are no large images to reduce. It is probably already as small as it will get." },
        ],
      },
      {
        heading: "When the PDF is still too big",
        blocks: [
          { p: "Some portals cap each file at 2 MB or 5 MB, and a long scan may not fit even after compression. In that case split it: [Split by size](/tools/split-by-size) makes as many parts as needed, each under the limit you set, in the original page order." },
          { p: "For GST replies and appeals, [GST filing prep](/tools/gst-filing-prep) does both steps in one go for the 2, 5 and 10 MB limits. If the PDF started life as photos, it can also help to [compress the images](/tools/compress-image) before putting them into a PDF." },
        ],
      },
    ],
    faq: [
      ["Does compressing a PDF reduce text quality?", "No. Text and vector graphics are kept as they are; only embedded images are re-encoded."],
      ["Can I compress a password-protected PDF?", "Unlock it first with Unlock PDF (you need the password), compress it, then protect it again if needed."],
    ],
  },
  {
    slug: "how-to-merge-pdf-files",
    title: "How to Merge PDF Files into One Document (Free, Online)",
    description: "Combine several PDFs into one file in the right order, merge only some pages, and interleave front-and-back scans. Step-by-step, no software needed.",
    h1: "How to merge PDF files into one",
    summary:
      "To combine PDFs, open [Merge PDF](/tools/merge-pdf), add all the files, arrange them with the arrows and press Merge PDF. You get a single PDF with every page in the order you set. Pages are copied as they are, so nothing loses quality.",
    published: D,
    updated: D,
    cluster: "pdf-tools",
    tools: ["merge-pdf", "organize-pdf", "alternate-mix", "compress-pdf"],
    sections: [
      {
        heading: "Merge PDFs step by step",
        blocks: [
          {
            steps: [
              "Open [Merge PDF](/tools/merge-pdf) and choose two or more files (or drop them onto the page).",
              "Check the thumbnails and use the up and down arrows to set the order. The number on each file is its position in the final document.",
              "Add more files at any time with Add more files.",
              "Press Merge PDF and download the combined file.",
            ],
          },
        ],
      },
      {
        heading: "Merge only some pages",
        blocks: [
          { p: "If you don't want every page of every file, use [Organize PDF](/tools/organize-pdf) instead. Add all the files, then delete, rotate and drag individual pages before saving one PDF. It's the better choice for assembling a document from parts of several others." },
        ],
      },
      {
        heading: "Combine front and back scans",
        blocks: [
          { p: "Scanners without double-sided scanning often produce two files: one with all the fronts and one with all the backs, sometimes in reverse order. [Alternate & Mix](/tools/alternate-mix) interleaves them one page at a time, and can reverse the second file so page order comes out right." },
        ],
      },
      {
        heading: "Tips for a clean merged PDF",
        blocks: [
          {
            list: [
              "Name files with numbers (01-cover.pdf, 02-cv.pdf) so they're easy to put in order.",
              "Unlock password-protected PDFs first; encrypted files can't be merged.",
              "Large merges can exceed email limits. Run [Compress PDF](/tools/compress-pdf) on the result if needed.",
              "Add [page numbers](/tools/page-numbers) after merging so the combined document is easy to reference.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "how-to-split-a-pdf",
    title: "How to Split a PDF: by Pages, Ranges, Size or Chapters",
    description: "Four ways to split a PDF into separate files: extract pages, split by ranges, keep parts under a size limit, or split at bookmarks and keywords.",
    h1: "How to split a PDF into separate files",
    summary:
      "To split a PDF, open [Split PDF](/tools/split-pdf), choose your file and pick a method: page ranges (such as 1-3, 4-10), every N pages, or extract specific pages. Each part downloads as its own PDF. For size limits or chapters there are dedicated tools, covered below.",
    published: D,
    updated: D,
    cluster: "pdf-tools",
    tools: ["split-pdf", "split-by-size", "split-by-bookmarks", "split-by-text"],
    sections: [
      {
        heading: "Split by page ranges or extract pages",
        blocks: [
          {
            steps: [
              "Open [Split PDF](/tools/split-pdf) and choose the file. The total page count is shown.",
              "Choose By ranges and type ranges separated by commas, for example 1-3, 4-10, 11-20. Each range becomes one file.",
              "Or choose Extract pages, type the pages you need (2, 5, 7-9), and decide whether they go into one PDF or one file each.",
              "Or choose Every N pages to cut the document into equal parts.",
              "Press Split PDF. Several files download together as a ZIP.",
            ],
          },
        ],
      },
      {
        heading: "Split to fit an upload limit",
        blocks: [
          { p: "When the problem is size rather than content, use [Split by size](/tools/split-by-size). Enter the largest size allowed per file, like 5 MB, and you get as many parts as needed, in order. Try [compressing the PDF](/tools/compress-pdf) first: you may end up with fewer parts." },
        ],
      },
      {
        heading: "Split at chapters or at a keyword",
        blocks: [
          { p: "If the PDF has bookmarks (the outline in a PDF reader's sidebar), [Split by bookmarks](/tools/split-by-bookmarks) turns each chapter into its own file, named after the bookmark." },
          { p: "For batches like a month of invoices exported as one PDF, [Split by text](/tools/split-by-text) starts a new file on every page that contains a phrase you choose, such as “Invoice No.”. Scanned batches need [OCR](/tools/ocr-pdf) first so there is text to search." },
        ],
      },
    ],
  },
  {
    slug: "how-to-convert-pdf-to-word",
    title: "How to Convert PDF to Word (Editable DOCX), Including Scans",
    description: "Turn a PDF into an editable Word document, keep headings and tables, and handle scanned PDFs with OCR. Free, step by step, no software needed.",
    h1: "How to convert a PDF to an editable Word document",
    summary:
      "Open [PDF to Word](/tools/pdf-to-word), choose your PDF and press Convert to Word. You get a .docx with real headings, paragraphs, lists and tables that opens in Microsoft Word, Google Docs or LibreOffice. If the PDF is a scan, run [OCR PDF](/tools/ocr-pdf) first so there is text to convert.",
    published: D,
    updated: D,
    cluster: "pdf-converter",
    tools: ["pdf-to-word", "ocr-pdf", "word-editor", "edit-pdf"],
    sections: [
      {
        heading: "Convert a PDF to Word step by step",
        blocks: [
          {
            steps: [
              "Open [PDF to Word](/tools/pdf-to-word) and choose the PDF.",
              "Press Convert to Word. The conversion runs in your browser; nothing is uploaded.",
              "Open the downloaded .docx in Word, Google Docs, LibreOffice, or the [online Word editor](/tools/word-editor).",
              "Check headings, tables and page breaks, then edit as normal.",
            ],
          },
        ],
      },
      {
        heading: "Is your PDF a scan? Check first",
        blocks: [
          { p: "Try selecting a word in your PDF viewer. If you can't, the page is an image of text, usually from a scanner or phone. Converters have nothing to work with, so you'd get an empty document." },
          { p: "Fix that with [OCR PDF](/tools/ocr-pdf): it recognises the text and adds it to the file. Then convert the OCR'd file to Word. OCR works best on clear, straight, high-resolution scans of printed English text." },
        ],
      },
      {
        heading: "What converts well, and what doesn't",
        blocks: [
          {
            list: [
              "Converts well: reports, letters, CVs, contracts and papers with headings, paragraphs, lists and tables.",
              "Simplified: magazine layouts with many columns, text boxes and text wrapped around images. They become a single, editable flow of text.",
              "Not converted: handwriting, and text inside images (diagrams, screenshots).",
            ],
          },
          { p: "If you only need to fix a few words, you may not need Word at all: the [PDF editor](/tools/edit-pdf) changes existing text directly in the PDF, keeping the original layout." },
        ],
      },
    ],
    faq: [
      ["Will the Word file look exactly like the PDF?", "The structure and text carry over; exact positions can shift because Word reflows text across pages while PDF fixes every line."],
      ["Can I convert Word back to PDF?", "Yes, with Word to PDF, which keeps the layout from Word."],
    ],
  },
  {
    slug: "how-to-convert-jpg-to-pdf",
    title: "How to Convert JPG to PDF: Combine Photos into One PDF",
    description: "Turn JPG, PNG and phone photos into a single PDF, choose page size and margins, and keep the file small enough to send. Step by step.",
    h1: "How to convert JPG images to a PDF",
    summary:
      "Open [JPG to PDF](/tools/jpg-to-pdf), add your images, put them in order, choose a page size (same as image, A4 or Letter) and press Convert to PDF. Each image becomes a page of one PDF. PNG and WEBP images work the same way.",
    published: D,
    updated: D,
    cluster: "pdf-converter",
    tools: ["jpg-to-pdf", "scan-to-pdf", "compress-pdf", "compress-image"],
    sections: [
      {
        heading: "Convert images to PDF step by step",
        blocks: [
          {
            steps: [
              "Open [JPG to PDF](/tools/jpg-to-pdf) and choose your images. Add more at any time.",
              "Arrange them with the arrows; each image will be one page.",
              "Choose the page size. A4 or Letter suits documents you'll print; Same as image keeps photos uncropped at their own shape.",
              "Pick the orientation (Auto turns landscape photos sideways) and a margin, then press Convert to PDF.",
            ],
          },
        ],
      },
      {
        heading: "Photographing documents? Scan them instead",
        blocks: [
          { p: "If the photos are of paper documents, [Scan to PDF](/tools/scan-to-pdf) lets you capture each page with your phone or laptop camera and builds the PDF in one flow, with no app to install." },
        ],
      },
      {
        heading: "Keep the PDF small",
        blocks: [
          { p: "Modern phone photos are 3–8 MB each, so a ten-photo PDF can be too big to email. Either [compress the images](/tools/compress-image) before converting, or [compress the PDF](/tools/compress-pdf) afterwards; the Recommended level usually shrinks photo PDFs a lot with little visible change." },
          { p: "To make the text in scanned pages searchable, run [OCR PDF](/tools/ocr-pdf) on the result." },
        ],
      },
    ],
  },
  {
    slug: "how-to-edit-a-pdf",
    title: "How to Edit a PDF: Change Text, Add Images and Annotate",
    description: "Edit the existing text of a PDF, add text, images and shapes, highlight and comment, and reorder pages, free and in your browser. A practical walkthrough.",
    h1: "How to edit a PDF online",
    summary:
      "Open the [PDF editor](/tools/edit-pdf), choose your file, pick Edit text and click a line to change it. The new words keep the original font, size and colour. Use the toolbar to add text, images, shapes, highlights, comments and signatures, then download the edited PDF.",
    published: D,
    updated: D,
    cluster: "pdf-tools",
    tools: ["edit-pdf", "sign-pdf", "pdf-forms", "organize-pdf", "redact-pdf"],
    sections: [
      {
        heading: "Change existing text",
        blocks: [
          {
            steps: [
              "Open the [PDF editor](/tools/edit-pdf) and choose the PDF.",
              "Select Edit text in the toolbar (shortcut G) and click the line you want to change.",
              "Type the correction. The replacement matches the original font, size and colour, and the old words are removed from the file rather than hidden.",
              "Download the PDF when you're done. Your work is also saved on this device as you go.",
            ],
          },
          { note: "Scanned pages are pictures, so their words can't be edited as text. You can still white out an area and type new text on top." },
        ],
      },
      {
        heading: "Add text, images, shapes and notes",
        blocks: [
          {
            list: [
              "Add text (T) to type anywhere, for example to fill in a form that has no fields.",
              "Add image (I) to place a logo, photo or stamp.",
              "Rectangles, ellipses, lines and arrows for marking up drawings and screenshots.",
              "Highlight, underline and strike out existing text, and add comments that open as sticky notes in any PDF reader.",
            ],
          },
        ],
      },
      {
        heading: "Pages, signatures, forms and sensitive data",
        blocks: [
          { p: "The page sidebar in the editor lets you reorder, rotate, add and delete pages; for bigger page jobs across several files, [Organize PDF](/tools/organize-pdf) is quicker." },
          { p: "To sign, see [how to sign a PDF](/guides/how-to-sign-a-pdf). For fillable forms, [PDF Forms](/tools/pdf-forms) lists every field so you can complete them quickly. To remove information for good, use [Redact PDF](/tools/redact-pdf) rather than drawing black boxes." },
        ],
      },
    ],
  },
  {
    slug: "how-to-sign-a-pdf",
    title: "How to Sign a PDF Online Without Printing It",
    description: "Add a drawn, typed or uploaded signature to a PDF, place it precisely, add the date and lock it in. Free, step by step, nothing to install.",
    h1: "How to sign a PDF without printing it",
    summary:
      "Open the PDF in [Sign PDF](/tools/sign-pdf), choose Signature, then draw, type or upload your signature. Click the page to place it, drag and resize it into position, and download the signed PDF. Tick “remember” and your signature is ready next time.",
    published: D,
    updated: D,
    cluster: "pdf-tools",
    tools: ["sign-pdf", "flatten-pdf", "protect-pdf", "pdf-forms"],
    sections: [
      {
        heading: "Sign a PDF step by step",
        blocks: [
          {
            steps: [
              "Open [Sign PDF](/tools/sign-pdf) and choose the document.",
              "Choose Signature in the toolbar and pick Draw, Type or Upload.",
              "Draw with your mouse, finger or stylus; or type your name and choose a handwriting style; or upload a photo of your signature on white paper (the background can be removed).",
              "Click where it belongs on the page, then drag the corners to size it.",
              "Add the date or your printed name with a text box, and download the signed PDF.",
            ],
          },
        ],
      },
      {
        heading: "Make the signed copy harder to tamper with",
        blocks: [
          { p: "After signing a form, [flatten it](/tools/flatten-pdf) so the answers and signature become part of the page and can't be edited in a PDF reader. If the document is confidential, [add a password](/tools/protect-pdf) before emailing it." },
        ],
      },
      {
        heading: "Is an electronic signature valid?",
        blocks: [
          { p: "A signature image added this way is a simple electronic signature. Many countries accept these for everyday agreements such as offer letters, rental contracts and consent forms. Some documents, like certain government filings, need a certificate-based digital signature instead, so check what the recipient accepts." },
        ],
      },
    ],
  },
  {
    slug: "how-to-password-protect-a-pdf",
    title: "How to Password Protect a PDF (and Remove a Password)",
    description: "Encrypt a PDF with a password using AES-256, control printing and copying, and remove a password you know. Clear steps and safety tips.",
    h1: "How to password-protect a PDF",
    summary:
      "Open [Protect PDF](/tools/protect-pdf), choose the file, type a password twice and press Protect PDF. The PDF is encrypted with AES-256 and can only be opened with that password. To remove a password you know, use [Unlock PDF](/tools/unlock-pdf).",
    published: D,
    updated: D,
    cluster: "pdf-tools",
    tools: ["protect-pdf", "unlock-pdf", "remove-restrictions", "redact-pdf"],
    sections: [
      {
        heading: "Add a password step by step",
        blocks: [
          {
            steps: [
              "Open [Protect PDF](/tools/protect-pdf) and choose one or more PDFs.",
              "Type a strong password and repeat it.",
              "Decide what people who open it may do: allow printing, copying text and editing, or not.",
              "Press Protect PDF and download the encrypted file.",
            ],
          },
          { note: "Encryption happens in your browser: neither the file nor the password is sent anywhere." },
        ],
      },
      {
        heading: "Choosing and sharing the password",
        blocks: [
          {
            list: [
              "Use at least 12 characters, or a short phrase of unrelated words. Short or common passwords can be guessed.",
              "Send the password by a different route than the file, for example the PDF by email and the password by text message.",
              "Store the password somewhere safe: a forgotten password can't be recovered.",
            ],
          },
        ],
      },
      {
        heading: "Remove a password or restrictions",
        blocks: [
          { p: "If you know the password and are tired of typing it, [Unlock PDF](/tools/unlock-pdf) saves a copy that opens without one. Some PDFs open freely but block printing or copying; [Remove restrictions](/tools/remove-restrictions) clears those permission flags on files you're allowed to use." },
          { p: "A password protects the whole file, but anyone with the password sees everything. To share a document with some details hidden, [redact](/tools/redact-pdf) them first." },
        ],
      },
    ],
  },
  {
    slug: "how-to-redact-a-pdf",
    title: "How to Redact a PDF Properly (So Text Can't Be Recovered)",
    description: "Why black boxes aren't redaction, how to permanently remove names, numbers and Aadhaar or PAN details from a PDF, and how to check the result.",
    h1: "How to redact a PDF properly",
    summary:
      "Real redaction deletes the text, not just covers it. Open [Redact PDF](/tools/redact-pdf), enter the words or numbers to remove and press Redact: matches are deleted from the file and blacked out. For ID and account numbers, [Auto-redact PII](/tools/auto-redact-pii) finds them for you.",
    published: D,
    updated: D,
    cluster: "pdf-tools",
    tools: ["redact-pdf", "auto-redact-pii", "privacy-scanner", "edit-pdf"],
    sections: [
      {
        heading: "Why a black rectangle isn't enough",
        blocks: [
          { p: "Drawing a black box over text in most editors only adds a shape on top. The text underneath is still in the file: anyone can select it, copy it, search for it or remove the box. Many leaked “redacted” documents failed this way." },
          { p: "Proper redaction removes the characters from the page's content and then marks the spot, which is what the Fusion Office redaction tools do." },
        ],
      },
      {
        heading: "Redact specific words or numbers",
        blocks: [
          {
            steps: [
              "Open [Redact PDF](/tools/redact-pdf) and choose the file.",
              "Enter each word, name or number to remove on its own line.",
              "Turn on Whole words only to avoid partial matches, and Match case if capitals matter.",
              "Press Redact and download.",
            ],
          },
        ],
      },
      {
        heading: "Find personal data automatically",
        blocks: [
          { p: "[Auto-redact PII](/tools/auto-redact-pii) looks for Aadhaar and PAN numbers, card numbers, email addresses, phone numbers, GSTIN, IFSC and IBAN codes. Numbers with check digits (Aadhaar, cards) are validated, which avoids blacking out random digits." },
          { p: "Before sharing a document widely, run the [privacy scanner](/tools/privacy-scanner): it also reports hidden properties such as the author, comments, attachments and scripts, and can produce a cleaned copy." },
        ],
      },
      {
        heading: "Check your redaction",
        blocks: [
          {
            list: [
              "Open the redacted PDF and search for a removed word: it should not be found.",
              "Try selecting text where the black box is: nothing should be copied.",
              "Scanned pages contain images, not text, so text search can't redact them. Run [OCR](/tools/ocr-pdf) first, or cover the area by hand in the [PDF editor](/tools/edit-pdf) with its Redact tool, which also removes the content underneath.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "how-to-make-a-scanned-pdf-searchable",
    title: "How to Make a Scanned PDF Searchable with OCR",
    description: "Use OCR to turn a scanned PDF into searchable, selectable text, get the best recognition results, and convert scans to Word or Excel.",
    h1: "How to make a scanned PDF searchable",
    summary:
      "Open [OCR PDF](/tools/ocr-pdf), choose the scanned PDF and press Make searchable. The tool recognises the text on each page and adds it as an invisible layer, so the PDF looks the same but you can search, select and copy the words.",
    published: D,
    updated: D,
    cluster: "pdf-converter",
    tools: ["ocr-pdf", "scan-to-pdf", "pdf-to-word", "chat-with-pdf"],
    sections: [
      {
        heading: "How to tell if a PDF needs OCR",
        blocks: [
          { p: "Open the PDF and try to select a word or search with Ctrl+F (⌘F on a Mac). If nothing is found, the pages are images of text, which is typical for scanners, phone scans and faxes. OCR (optical character recognition) reads those images and adds real text." },
        ],
      },
      {
        heading: "Run OCR step by step",
        blocks: [
          {
            steps: [
              "Open [OCR PDF](/tools/ocr-pdf) and choose the file.",
              "Leave “Skip pages that already have text” on for documents that mix typed and scanned pages.",
              "Press Make searchable. The first time, the recognition engine downloads to your browser; after that it starts straight away.",
              "Download the searchable PDF.",
            ],
          },
          { note: "OCR runs on your device, so even sensitive scans stay private. Recognition currently supports English text." },
        ],
      },
      {
        heading: "Get better OCR results",
        blocks: [
          {
            list: [
              "Scan at 300 DPI if you can; blurry or tiny text is misread.",
              "Keep pages straight and evenly lit. When photographing, hold the phone parallel to the page.",
              "Printed text works far better than handwriting.",
              "Crop away dark scanner edges with [Crop PDF](/tools/crop-pdf) if they confuse recognition.",
            ],
          },
        ],
      },
      {
        heading: "What you can do after OCR",
        blocks: [
          { p: "Once a scan has text, every text tool works on it: convert it with [PDF to Word](/tools/pdf-to-word) or [PDF to Excel](/tools/pdf-to-excel), [ask questions about it](/tools/chat-with-pdf), [redact](/tools/redact-pdf) names and numbers, or [split it at a keyword](/tools/split-by-text)." },
        ],
      },
    ],
  },
  {
    slug: "how-to-reduce-image-file-size",
    title: "How to Reduce Image File Size to 20 KB, 50 KB or 100 KB",
    description: "Shrink a photo or signature to a KB limit for online forms, choose between compressing and resizing, and pick the right format. Free, step by step.",
    h1: "How to reduce an image's file size (to 50 KB, 100 KB or less)",
    summary:
      "Open [Compress image](/tools/compress-image), choose File size, type the limit (for example 50 KB) and press Compress. The image is saved at the highest quality that fits. For exact dimensions too, such as a 3.5 × 4.5 cm photo, use [Resize image](/tools/resize-image) with its file-size limit.",
    published: D,
    updated: D,
    cluster: "image-tools",
    tools: ["compress-image", "resize-image", "convert-image", "crop-image"],
    sections: [
      {
        heading: "Fit an image under a size limit",
        blocks: [
          {
            steps: [
              "Open [Compress image](/tools/compress-image) and choose one or more images.",
              "Select Compress by File size and enter the limit, such as 20 KB, 50 KB or 100 KB (you can also write 1.5 MB).",
              "Keep the format, or choose JPG for photos.",
              "Press Compress and check the new size shown for each image, then download.",
            ],
          },
        ],
      },
      {
        heading: "Compress or resize?",
        blocks: [
          { p: "Compressing lowers the quality of the stored image; resizing lowers its dimensions in pixels. Small targets usually need both: a 12-megapixel phone photo can't become a 20 KB file at full size without looking terrible, but at 600 pixels wide it can look fine." },
          { p: "Forms for exams, jobs and government services often specify both dimensions and size, for example a 3.5 × 4.5 cm photo under 50 KB, or a signature of 140 × 60 pixels under 20 KB. [Resize image](/tools/resize-image) handles both at once: set the size in pixels or cm (with presets for passport photos and signatures), turn on Limit the file size, and enter the KB limit." },
        ],
      },
      {
        heading: "Pick the right format",
        blocks: [
          {
            list: [
              "JPG: photos and scanned signatures. Smallest for photographs.",
              "PNG: screenshots, logos and graphics with sharp edges or transparency. Usually larger for photos.",
              "WEBP: smaller than both for most images, but some older forms don't accept it.",
            ],
          },
          { p: "If a form rejects your file type, [Convert image](/tools/convert-image) changes it to JPG, PNG or WEBP, including iPhone HEIC photos. Crop away unneeded background first with [Crop image](/tools/crop-image): fewer pixels means a smaller file." },
        ],
      },
    ],
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);

/** Guides that use a tool, for linking from that tool's page. */
export const guidesForTool = (slug: string) => GUIDES.filter((g) => g.tools.includes(slug));
