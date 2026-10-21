import type { Guide } from "../guides";

/** Scheduled guides 31–40 (3–6 November 2026). */
export const BATCH_04: Guide[] = [
  {
    slug: "rrb-ntpc-photo-signature-size",
    title: "RRB NTPC Photo and Signature Size: Live Photo and Signature Rules",
    description: "RRB NTPC now captures your photo live during the application. The signature size recent notices ask for, and how to resize it free without losing clarity.",
    h1: "RRB NTPC photo and signature size: live photo and signature rules",
    summary:
      "Recent RRB NTPC applications capture your photograph live with a webcam or phone camera, so there's no photo file to resize. The signature is still uploaded: recent notices ask for a JPG of 30–49 KB, at least 140 × 60 pixels, signed in black ink on white paper. [Resize image](/tools/resize-image) can set both the size and the KB range.",
    published: "2026-11-03",
    time: "09:00",
    updated: "2026-11-03",
    cluster: "image-tools",
    tools: ["resize-image", "crop-image", "image-editor"],
    sections: [
      {
        heading: "The live photo",
        blocks: [
          { p: "Recent RRB recruitment portals take your photograph live while you fill the form. A photo of an existing photograph is rejected, as is one that doesn't clearly show your face. Sit facing the camera in good light against a plain, light background, without a cap, mask or dark glasses." },
        ],
      },
      {
        heading: "Signature requirements",
        blocks: [
          {
            list: [
              "JPG or JPEG format.",
              "File size between 30 KB and 49 KB in recent notices; files under 30 KB are rejected by the form.",
              "At least 140 × 60 pixels (larger is fine, smaller isn't).",
              "Signed in black ink on plain white paper, scanned or photographed at good resolution.",
            ],
          },
          { note: "Older RRB notices used different limits (such as 10–20 KB). Each CEN notice can change them, so always check the one you're applying under." },
        ],
      },
      {
        heading: "Prepare the signature",
        blocks: [
          {
            steps: [
              "Sign a little larger than usual on white paper, and photograph it from directly above.",
              "Crop tightly with [Crop image](/tools/crop-image).",
              "If the paper looks grey, raise brightness and contrast in the [Image editor](/tools/image-editor) until the background is white.",
              "Open [Resize image](/tools/resize-image), choose Pixels and set a size of at least 140 × 60 (for example 350 × 150).",
              "Turn on Limit the file size, enter 49 KB and save as JPG.",
              "Check the file is above 30 KB. If it's smaller, use larger dimensions or a higher quality and resize again.",
            ],
          },
        ],
      },
    ],
    faq: [
      ["Why is my 15 KB signature rejected?", "Recent RRB notices set a minimum of 30 KB. Resize the signature to larger dimensions so the file is between 30 and 49 KB."],
      ["Do I upload a photo for RRB NTPC?", "Recent notices capture the photo live during the application instead. Follow the instructions on the form for your CEN."],
    ],
  },
  {
    slug: "is-it-safe-to-upload-aadhaar-pan-online",
    title: "Is It Safe to Unlock or Edit Aadhaar and PAN on PDF Websites?",
    description: "What happens to your Aadhaar or PAN when you use an online PDF tool, which tools keep it on your device, and simple habits that keep ID copies safe.",
    h1: "Is it safe to unlock or edit Aadhaar and PAN on PDF websites?",
    summary:
      "It depends on whether the website uploads the file. Tools that run in your browser never receive your Aadhaar or PAN, so there is nothing to leak. Tools that upload it rely on the company deleting it properly. Use browser-based tools like [Unlock PDF](/tools/unlock-pdf) for ID documents, share masked copies where you can, and never put the password and the file in the same message.",
    published: "2026-11-03",
    time: "13:00",
    updated: "2026-11-03",
    cluster: "pdf-tools",
    tools: ["unlock-pdf", "auto-redact-pii", "watermark-pdf", "protect-pdf"],
    sections: [
      {
        heading: "The real risks",
        blocks: [
          {
            list: [
              "Uploaded copies: a server stores your file at least briefly. Its safety depends on encryption, deletion and the company's own security.",
              "Leaked copies you send: an unmasked Aadhaar or PAN shared over email or WhatsApp can be forwarded and reused for loan or SIM fraud.",
              "Fake sites: a site that asks you to log in, pay, or install software to “unlock” an ID document is a red flag.",
            ],
          },
        ],
      },
      {
        heading: "How to tell if a tool uploads your file",
        blocks: [
          { p: "Load the tool, turn on airplane mode, and run it. If it still works, your file never left your device. The full method, including how to watch network traffic on a computer, is in [Do online PDF tools upload your files?](/guides/do-online-pdf-tools-upload-your-files)" },
          { p: "On Fusion Office, every tool page says next to its title whether it works in your browser. Unlocking, protecting, redacting, editing and watermarking PDFs all do." },
        ],
      },
      {
        heading: "Safe habits for ID copies",
        blocks: [
          {
            list: [
              "Share a masked Aadhaar where the full number isn't needed: see [Masked Aadhaar](/guides/masked-aadhaar-hide-aadhaar-number), or remove numbers with [Auto-redact personal data](/tools/auto-redact-pii).",
              "Mark copies for one purpose, such as “For SIM KYC only”, with [Watermark PDF](/tools/watermark-pdf).",
              "Keep unlocked copies off shared folders; add your own password with [Protect PDF](/tools/protect-pdf) before emailing, and send the password separately.",
              "Delete ID copies from chats and downloads once the job is done.",
            ],
          },
          { p: "Password formats for the files themselves are covered in [Aadhaar PDF password](/guides/aadhaar-pdf-password) and [e-PAN card PDF password](/guides/e-pan-card-pdf-password)." },
        ],
      },
    ],
    faq: [
      ["Can someone misuse a photocopy of my Aadhaar?", "An unmasked copy can be misused for fraud, which is why UIDAI offers the masked Aadhaar. Share full copies only where the full number is required."],
      ["Does Fusion Office see my documents?", "Not when you use browser tools: the file stays on your device. Server conversions delete the file as soon as the result is ready."],
    ],
  },
  {
    slug: "cuet-ug-photo-signature-size",
    title: "CUET UG Photo, Signature and Certificate Upload Sizes Explained",
    description: "CUET UG needs a live photo plus a 10–200 KB photo, a 10–50 KB signature and, where needed, a 50–300 KB PDF certificate. What each file must look like.",
    h1: "CUET UG photo, signature and certificate upload sizes",
    summary:
      "According to the CUET (UG) 2026 information bulletin, you capture a live photo during the application and also upload a scanned passport photo (JPG, 10–200 KB), a signature (JPG, 10–50 KB) and, if it applies, a disability/UDID certificate (PDF, 50–300 KB). Candidates verifying identity without Aadhaar or DigiLocker also upload an ID proof (JPG, 10–200 KB).",
    published: "2026-11-03",
    time: "18:00",
    updated: "2026-11-03",
    cluster: "image-tools",
    tools: ["resize-image", "compress-image", "compress-pdf", "scan-to-pdf"],
    sections: [
      {
        heading: "What the 2026 bulletin asks for",
        blocks: [
          {
            list: [
              "Live photograph: captured with your webcam, or by scanning the QR code with a phone if your computer has no camera. Use a light-coloured background, proper lighting, and keep 80% of your face visible including the ears, without a mask.",
              "Scanned passport photo: recent, in colour, 80% face (including ears, without a mask) against a white background. JPG/JPEG, 10–200 KB.",
              "Signature: JPG/JPEG, 10–50 KB, clearly legible.",
              "Disability or UDID certificate (if you don't have a UDID card): PDF, 50–300 KB.",
              "Identity proof, only if you verify identity by a method other than Aadhaar or DigiLocker: JPG/JPEG, 10–200 KB.",
            ],
          },
        ],
      },
      {
        heading: "Prepare the files",
        blocks: [
          {
            steps: [
              "Crop the photo and signature closely, then open [Resize image](/tools/resize-image).",
              "Turn on Limit the file size: 200 KB for the photo, 50 KB for the signature. Save as JPG.",
              "Check each file is above 10 KB; resize at a higher quality if not.",
              "Scan certificates with [Scan to PDF](/tools/scan-to-pdf), then bring them into the 50–300 KB range with [Compress PDF](/tools/compress-pdf).",
            ],
          },
          { p: "If you only need a smaller file and the dimensions are fine, [Compress image](/tools/compress-image) with File size set to the limit does it in one step." },
        ],
      },
      {
        heading: "Before you submit",
        blocks: [
          { p: "NTA compares your photos and details with your Aadhaar, and advises updating Aadhaar with a recent photograph, name, date of birth and address before applying. Using someone else's photo, signature or certificate is treated as unfair means." },
          { note: "These figures are from the CUET (UG) 2026 bulletin. Check the 2027 bulletin when it's published; it takes priority over this guide." },
        ],
      },
    ],
    faq: [
      ["Do I need both a live photo and an uploaded photo for CUET UG?", "Yes, in 2026 the bulletin asked for a live photograph during the application and a scanned passport-size photograph."],
      ["What if my computer has no webcam?", "Scan the QR code shown on the form with a phone or tablet and take the live photo there."],
    ],
  },
  {
    slug: "watermark-id-copy-for-kyc",
    title: "How to Watermark ID Copies “For KYC Only” Before You Send Them",
    description: "Add a “For KYC only” watermark with the date and recipient to Aadhaar, PAN or passport copies, so a leaked copy is harder to reuse. Free, on your device.",
    h1: "How to watermark ID copies “For KYC only” before you send them",
    summary:
      "Open [Watermark PDF](/tools/watermark-pdf), choose your ID copy, type a line such as “For ABC Bank KYC only – 4 Nov 2026”, set it semi-transparent at 45° across the page, and press Add watermark. Anyone who receives a leaked copy can see what it was meant for, which makes it much harder to reuse.",
    published: "2026-11-04",
    time: "10:00",
    updated: "2026-11-04",
    cluster: "pdf-tools",
    tools: ["watermark-pdf", "auto-redact-pii", "jpg-to-pdf", "pdf-to-jpg"],
    sections: [
      {
        heading: "Add the watermark step by step",
        blocks: [
          {
            steps: [
              "If your ID is a photo, turn it into a PDF with [JPG to PDF](/tools/jpg-to-pdf).",
              "Open [Watermark PDF](/tools/watermark-pdf) and choose the file.",
              "Pick Text and type who it's for, why, and the date.",
              "Set transparency to around 30–40% and rotation to 45°, or turn on tiling to repeat it across the page.",
              "Press Add watermark and download the marked copy.",
            ],
          },
        ],
      },
      {
        heading: "What to write",
        blocks: [
          {
            list: [
              "“For XYZ Bank account opening only – 04/11/2026”",
              "“Submitted to ABC Telecom for SIM KYC – not valid for any other use”",
              "“Copy for rental agreement with Mr. Sharma only”",
            ],
          },
          { p: "Place it so it crosses the photo or details partly but leaves the number and name readable; the copy still has to do its job." },
        ],
      },
      {
        heading: "Make it harder to remove",
        blocks: [
          { p: "A text watermark is added to the PDF as its own layer, so a determined person could remove it. To bake it into the image, convert the watermarked PDF to images with [PDF to JPG](/tools/pdf-to-jpg) and back into a PDF with JPG to PDF: the watermark becomes part of the picture." },
          { p: "Combining a watermark with a masked number is stronger still: remove the first eight digits of an Aadhaar with [Auto-redact personal data](/tools/auto-redact-pii) or the editor's Redact tool before watermarking." },
        ],
      },
    ],
    faq: [
      ["Will the bank accept a watermarked copy?", "Most do, as long as the details are readable. If they ask for a clean copy, that's their requirement to state."],
      ["Is the ID uploaded to add the watermark?", "No. Watermark PDF runs in your browser."],
    ],
  },
  {
    slug: "upload-certificates-as-small-pdf",
    title: "How to Upload Caste, Category and Other Certificates as Small PDFs",
    description: "Exam and job forms want certificates as PDFs under a size limit, often 50–300 KB. How to scan them clearly and bring them into the range without blurring.",
    h1: "How to upload certificates as small PDFs for exam and job forms",
    summary:
      "Scan the certificate with [Scan to PDF](/tools/scan-to-pdf) in good light, then shrink it with [Compress PDF](/tools/compress-pdf) until it fits the form's range: NTA exams, for example, ask for certificates as PDFs of 50–300 KB. If it's still too big, compress with Grayscale on; if it's under the minimum, scan again at a higher quality.",
    published: "2026-11-04",
    time: "17:00",
    updated: "2026-11-04",
    cluster: "pdf-tools",
    tools: ["scan-to-pdf", "compress-pdf", "jpg-to-pdf", "merge-pdf"],
    sections: [
      {
        heading: "Scan the certificate",
        blocks: [
          {
            steps: [
              "Lay the certificate flat on a dark table in daylight, without shadows.",
              "Open [Scan to PDF](/tools/scan-to-pdf) on your phone, hold it directly above, and capture the page. Add more pages if the certificate has a back side.",
              "Check the thumbnails, retake any blurry shots, and build the PDF.",
            ],
          },
          { p: "If you already have photos of the certificate, [JPG to PDF](/tools/jpg-to-pdf) turns them into a PDF instead." },
        ],
      },
      {
        heading: "Bring it into the size range",
        blocks: [
          {
            steps: [
              "Open [Compress PDF](/tools/compress-pdf) and choose the scan.",
              "Start with Recommended. If the file is still above the maximum, try Extreme, and turn on Grayscale images for black-and-white certificates.",
              "Check the new size shown under the result.",
              "Open the file and zoom in on the seal and signature: they must stay readable.",
            ],
          },
          { note: "If the PDF is under the minimum (some forms reject files below 50 KB), scan again with more light and less compression rather than padding the file." },
        ],
      },
      {
        heading: "Several certificates in one upload",
        blocks: [
          { p: "Some forms have a single slot for all supporting documents. Scan each one, combine them with [Merge PDF](/tools/merge-pdf) in the order the form lists them, then compress the merged file." },
          { p: "The size limit and format are always in the form's hint or the notification. When in doubt, aim for the middle of the range rather than just under the maximum." },
        ],
      },
    ],
    faq: [
      ["Can I upload a photo of the certificate instead of a PDF?", "Only if the form accepts JPG for that field. Most certificate fields ask for PDF; convert photos with JPG to PDF."],
      ["Why is my one-page scan 4 MB?", "Phone cameras save large, detailed photos. Compressing to Recommended or Extreme usually brings a single page well under 300 KB."],
    ],
  },
  {
    slug: "passport-size-photo-online-form",
    title: "How to Make a Passport-Size Photo for Online Forms on Your Phone",
    description: "Take a passport-size photo with your phone, crop it to 3.5 × 4.5 cm, whiten the background and fit the form's KB limit. Free, and the photo stays on your phone.",
    h1: "How to make a passport-size photo for online forms on your phone",
    summary:
      "Take a straight, well-lit photo against a plain white wall, crop it to the passport shape (3.5 × 4.5 cm) with [Crop image](/tools/crop-image), then use [Resize image](/tools/resize-image) with the Passport photo 3.5 × 4.5 cm preset and Limit the file size set to the form's maximum. Everything happens on your phone.",
    published: "2026-11-05",
    time: "09:00",
    updated: "2026-11-05",
    cluster: "image-tools",
    tools: ["crop-image", "resize-image", "image-editor", "compress-image"],
    sections: [
      {
        heading: "Take the photo",
        blocks: [
          {
            list: [
              "Stand about half a metre in front of a plain white or light wall, facing a window for even daylight.",
              "Ask someone else to take it at eye level, with the back camera, from about 1.5 metres away.",
              "Look straight at the camera with a neutral expression, both ears visible, no cap or tinted glasses.",
              "Avoid shadows behind you: step a little away from the wall.",
            ],
          },
        ],
      },
      {
        heading: "Crop and resize",
        blocks: [
          {
            steps: [
              "Open [Crop image](/tools/crop-image), pick the passport ratio, and position the frame so your face fills about 70–80% of the height with a little space above your head.",
              "If the background looks grey or yellow, brighten it in the [Image editor](/tools/image-editor) with Exposure and Warmth.",
              "Open [Resize image](/tools/resize-image) and choose the Passport photo 3.5 × 4.5 cm preset.",
              "Turn on Limit the file size, enter the form's maximum (for example 50 KB), choose JPG and press Resize.",
            ],
          },
          { p: "If the form gives pixels instead of centimetres, choose Pixels and type them in. At 200 DPI, 3.5 × 4.5 cm is about 276 × 354 pixels." },
        ],
      },
      {
        heading: "Check before uploading",
        blocks: [
          {
            list: [
              "The file is a JPG and within the KB range (some forms also have a minimum).",
              "Your face is sharp, evenly lit and centred.",
              "The background is plain and light, with no objects or patterns.",
            ],
          },
          { note: "Many exams now also capture a live photo during the application. The uploaded photo should match it, so use a recent one." },
        ],
      },
    ],
    faq: [
      ["What size is a passport photo for Indian forms?", "Most forms use 3.5 × 4.5 cm (about 276 × 354 pixels at 200 DPI). Always check the form, as some ask for pixels or a different size."],
      ["Can I use a selfie?", "Selfies distort the face and usually have busy backgrounds. A photo taken by someone else from a little distance looks right."],
    ],
  },
  {
    slug: "resize-signature-10-20-kb",
    title: "How to Resize a Signature to 10–20 KB for Online Forms",
    description: "Scan your signature, clean up the background, crop it tight and resize it to the pixels and 10–20 KB limit online forms ask for. Free, on your phone or PC.",
    h1: "How to resize a signature to 10–20 KB for online forms",
    summary:
      "Sign on white paper, photograph it, crop it tightly, then open [Resize image](/tools/resize-image), enter the dimensions the form asks for (for example 140 × 60 pixels), turn on Limit the file size and enter 20 KB. Check the result is above the minimum, usually 10 KB.",
    published: "2026-11-05",
    time: "13:00",
    updated: "2026-11-05",
    cluster: "image-tools",
    tools: ["resize-image", "crop-image", "image-editor", "compress-image"],
    sections: [
      {
        heading: "Sign and capture",
        blocks: [
          {
            list: [
              "Use a black or dark blue pen on plain white paper; ballpoint shows up better than a faint gel pen.",
              "Sign in your normal running style, not in capital letters, a little larger than usual.",
              "Photograph it in daylight from directly above, without your phone's shadow on the paper.",
            ],
          },
        ],
      },
      {
        heading: "Clean, crop and resize",
        blocks: [
          {
            steps: [
              "Open [Crop image](/tools/crop-image) and crop close around the signature, leaving a thin white margin.",
              "If the paper looks grey, open the [Image editor](/tools/image-editor) and raise Brightness and Contrast until the background is white and the ink is dark.",
              "Open [Resize image](/tools/resize-image), choose Pixels and enter the size from the form, such as 140 × 60.",
              "Turn on Limit the file size, enter 20 KB and save as JPG.",
              "Check the result shows at least 10 KB. If not, raise the quality or dimensions slightly and resize again.",
            ],
          },
        ],
      },
      {
        heading: "Common signature sizes",
        blocks: [
          {
            list: [
              "IBPS and SBI: 140 × 60 pixels, 10–20 KB.",
              "SSC: 10–20 KB, about 4 × 2 cm.",
              "RRB (recent notices): at least 140 × 60 pixels, 30–49 KB.",
            ],
          },
          { p: "More detail for each exam is in [SSC CGL photo and signature size](/guides/ssc-cgl-photo-and-signature-size) and [IBPS photo, signature, thumb impression and declaration sizes](/guides/ibps-photo-signature-thumb-declaration-size)." },
        ],
      },
    ],
    faq: [
      ["Why does the form say my signature is too small in KB?", "The file must be at least the minimum size. Resize it to larger dimensions or a higher quality so it lands inside the range."],
      ["Should the signature be on a transparent background?", "Not for exam forms: they want a JPG with a white background. Transparent PNGs are for adding a signature to documents."],
    ],
  },
  {
    slug: "compress-photo-to-50kb",
    title: "How to Compress a Photo to 20 KB, 50 KB or 100 KB Without Blurring",
    description: "Get a photo under 20, 50 or 100 KB for a form without it turning blocky: when to resize first, which format to pick, and the settings that keep it sharp.",
    h1: "How to compress a photo to 20 KB, 50 KB or 100 KB without it turning blurry",
    summary:
      "Open [Compress image](/tools/compress-image), choose File size, type the limit (for example 50) and press Compress. The tool lowers quality and, if it must, the dimensions until the photo fits. For very small targets like 20 KB, crop and resize first so it doesn't have to throw away so much detail.",
    published: "2026-11-05",
    time: "18:00",
    updated: "2026-11-05",
    cluster: "image-tools",
    tools: ["compress-image", "resize-image", "crop-image", "convert-image"],
    sections: [
      {
        heading: "Compress to an exact size",
        blocks: [
          {
            steps: [
              "Open [Compress image](/tools/compress-image) and choose the photo (or several).",
              "Choose File size and enter the limit: 20, 50 or 100 KB.",
              "Keep the format as JPG for photos.",
              "Press Compress and check the new size shown under each file.",
            ],
          },
        ],
      },
      {
        heading: "Why small targets look blurry, and how to avoid it",
        blocks: [
          { p: "A 12-megapixel phone photo is about 4000 pixels wide. Squeezing all those pixels into 20 KB forces very heavy compression, which shows as blocks and smudges. The same photo resized to 400 pixels wide fits in 20 KB at good quality, and still looks sharp at the size a form displays it." },
          {
            list: [
              "Crop away background first with [Crop image](/tools/crop-image): fewer pixels, less to compress.",
              "Resize to the dimensions the form asks for with [Resize image](/tools/resize-image), or to 400–600 pixels wide if it doesn't say.",
              "Then compress to the KB limit.",
            ],
          },
        ],
      },
      {
        heading: "Format matters",
        blocks: [
          {
            list: [
              "JPG is the right choice for photos and signatures on forms.",
              "PNG photos are large; convert them to JPG with [Convert image](/tools/convert-image).",
              "WEBP is smaller still, but many government and exam forms don't accept it.",
            ],
          },
          { p: "For more on dimensions versus file size, see [How to reduce image file size](/guides/how-to-reduce-image-file-size)." },
        ],
      },
    ],
    faq: [
      ["Can I compress a photo to exactly 50 KB?", "The tool gets as close as it can below your limit, typically just under it. That satisfies a “maximum 50 KB” rule."],
      ["The form also has a minimum. What if my file goes too small?", "Use a slightly higher limit, or resize to larger dimensions, so the result lands inside the range."],
    ],
  },
  {
    slug: "resize-photo-3-5-x-4-5-cm",
    title: "How to Resize a Photo to 3.5 × 4.5 cm at 200 or 300 DPI",
    description: "Resize a photo to 3.5 × 4.5 cm for an application form, and understand what DPI means: 276 × 354 pixels at 200 DPI, 413 × 531 at 300 DPI.",
    h1: "How to resize a photo to 3.5 × 4.5 cm at 200 or 300 DPI",
    summary:
      "Open [Resize image](/tools/resize-image), choose Print size, enter 3.5 × 4.5 cm and the DPI the form asks for, and press Resize. At 200 DPI that's about 276 × 354 pixels; at 300 DPI, about 413 × 531 pixels. Turn on Limit the file size if the form also gives a KB range.",
    published: "2026-11-06",
    time: "10:00",
    updated: "2026-11-06",
    cluster: "image-tools",
    tools: ["resize-image", "crop-image"],
    sections: [
      {
        heading: "What cm and DPI mean for a digital photo",
        blocks: [
          { p: "A digital image only has pixels. Centimetres describe how big it prints, and DPI (dots per inch) says how many pixels go into each inch. So a size in cm only becomes a pixel size once you pick a DPI: pixels = cm ÷ 2.54 × DPI." },
          {
            list: [
              "3.5 × 4.5 cm at 200 DPI ≈ 276 × 354 pixels.",
              "3.5 × 4.5 cm at 300 DPI ≈ 413 × 531 pixels.",
              "3.5 × 4.5 cm at 100 DPI ≈ 138 × 177 pixels.",
            ],
          },
          { p: "If a form says “3.5 × 4.5 cm” without a DPI, 200 DPI is a common choice; if it gives pixels, use those exactly." },
        ],
      },
      {
        heading: "Resize step by step",
        blocks: [
          {
            steps: [
              "Crop the photo to the 7:9 passport shape first with [Crop image](/tools/crop-image), so nothing gets stretched.",
              "Open [Resize image](/tools/resize-image) and choose Print size (or the Passport photo 3.5 × 4.5 cm preset).",
              "Set the DPI the form asks for.",
              "If the form has a KB limit, turn on Limit the file size and enter it.",
              "Press Resize and download the JPG.",
            ],
          },
        ],
      },
      {
        heading: "If the shape doesn't match",
        blocks: [
          { p: "When the original photo isn't the same shape, Resize image can crop to fill the new size, add borders, or stretch. Crop to fill keeps faces natural; stretching distorts them, so avoid it for ID photos." },
        ],
      },
    ],
    faq: [
      ["Does DPI change the file?", "It changes how many pixels the image has, and so its file size. The DPI value stored in the file only affects printing."],
      ["Can I make a small photo bigger?", "You can enlarge it, but it won't gain detail. Start from the original camera photo when you can."],
    ],
  },
  {
    slug: "thumb-impression-for-online-form",
    title: "How to Make a Clean Thumb Impression Image for Online Forms",
    description: "Make a clear thumb impression for exam and government forms: ink it right, capture it, clean the background, and resize it to the pixels and KB the form needs.",
    h1: "How to make a clean thumb impression image for online forms",
    summary:
      "Press your inked thumb on white paper, photograph it in daylight, and open [Thumbmark maker](/tools/thumbmark-maker) to remove the paper background and choose blue or black ink. Then size it with [Resize image](/tools/resize-image): IBPS and SBI, for example, ask for a left thumb impression of 240 × 240 pixels and 20–50 KB as a JPG.",
    published: "2026-11-06",
    time: "17:00",
    updated: "2026-11-06",
    cluster: "image-tools",
    tools: ["thumbmark-maker", "resize-image", "crop-image", "convert-image"],
    sections: [
      {
        heading: "Make the impression",
        blocks: [
          {
            list: [
              "Use a stamp pad with blue or black ink, not a pen.",
              "Press the thumb on the pad, then roll it once from one side to the other on plain white paper.",
              "Make three or four impressions and pick the clearest, with visible ridges and no smudge.",
              "Use the thumb the form asks for; many specify the left thumb.",
            ],
          },
        ],
      },
      {
        heading: "Clean it up and resize",
        blocks: [
          {
            steps: [
              "Photograph the impression in daylight from directly above.",
              "Open [Thumbmark maker](/tools/thumbmark-maker), choose the photo, pick the ink colour and adjust the strength until ridges are clear.",
              "Download the result, then crop it to a square with [Crop image](/tools/crop-image).",
              "Open [Resize image](/tools/resize-image), set the size from the form (such as 240 × 240 pixels), turn on Limit the file size and enter the maximum (such as 50 KB).",
              "Check the file is above the form's minimum size.",
            ],
          },
          { note: "Thumbmark maker gives a transparent PNG. Most exam forms want a JPG on white: convert it with [Convert image](/tools/convert-image), choosing JPG and white as the fill colour for transparent areas, before resizing." },
        ],
      },
      {
        heading: "Check the form's rules",
        blocks: [
          { p: "Some forms want a scan of a physical impression on paper rather than a photo, and a few want both hands' fingers and thumbs in one image (NEET UG, for example). Follow the notification. For the full IBPS set of files, see [IBPS photo, signature, thumb impression and declaration sizes](/guides/ibps-photo-signature-thumb-declaration-size)." },
        ],
      },
    ],
    faq: [
      ["Can I use a fingerprint scanner image?", "Only if the form says so. Most exam forms expect an ink impression on paper, scanned or photographed."],
      ["My impression is just a dark blob. What went wrong?", "Too much ink. Press the thumb lightly on the pad, and roll it once on paper without pressing hard."],
    ],
  },
];
