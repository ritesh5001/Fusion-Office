import { DEFAULT_META, emptyDoc, type JSONContent, type WordDoc } from "./model";

const t = (text: string, marks?: JSONContent["marks"]): JSONContent => (marks ? { type: "text", text, marks } : { type: "text", text });
const p = (...content: JSONContent[]): JSONContent => (content.length ? { type: "paragraph", content } : { type: "paragraph" });
const h = (level: number, text: string): JSONContent => ({ type: "heading", attrs: { level }, content: [t(text)] });
const bullets = (...items: string[]): JSONContent => ({ type: "bulletList", content: items.map((i) => ({ type: "listItem", content: [p(t(i))] })) });
const bold = [{ type: "bold" }];
const muted = [{ type: "textStyle", attrs: { color: "#5b6170" } }];

const today = () => new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

export interface WordTemplate {
  id: string;
  label: string;
  hint: string;
  build: () => WordDoc;
}

const BASE_TEMPLATES: WordTemplate[] = [
  { id: "blank", label: "Blank", hint: "An empty A4 page", build: () => ({ meta: DEFAULT_META, content: emptyDoc() }) },
  {
    id: "letter",
    label: "Letter",
    hint: "Formal letter layout",
    build: () => ({
      meta: DEFAULT_META,
      content: {
        type: "doc",
        content: [
          p(t("Your Name", bold)),
          p(t("Street address, City, PIN", muted)),
          p(t("you@example.com · +91 00000 00000", muted)),
          p(),
          p(t(today())),
          p(),
          p(t("Recipient Name")),
          p(t("Company")),
          p(t("Address")),
          p(),
          p(t("Subject: ", bold), t("Write the purpose of the letter")),
          p(),
          p(t("Dear Recipient,")),
          p(t("Start with why you are writing. Keep each paragraph to one idea, and end with what you would like the reader to do next.")),
          p(t("Thank you for your time and consideration.")),
          p(),
          p(t("Yours sincerely,")),
          p(),
          p(t("Your Name")),
        ],
      },
    }),
  },
  {
    id: "report",
    label: "Report",
    hint: "Title, sections, a table",
    build: () => ({
      meta: DEFAULT_META,
      content: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 1, textAlign: "left" }, content: [t("Project report")] },
          p(t(`Prepared ${today()}`, muted)),
          h(2, "Summary"),
          p(t("Two or three sentences on what happened and what it means.")),
          h(2, "Highlights"),
          bullets("First result worth noting", "Second result worth noting", "Third result worth noting"),
          h(2, "Numbers"),
          {
            type: "table",
            content: [
              { type: "tableRow", content: ["Metric", "Target", "Actual"].map((x) => ({ type: "tableHeader", content: [p(t(x))] })) },
              ...[
                ["Revenue", "₹10,00,000", "₹11,20,000"],
                ["New customers", "120", "134"],
              ].map((row) => ({ type: "tableRow", content: row.map((x) => ({ type: "tableCell", content: [p(t(x))] })) })),
            ],
          },
          h(2, "Next steps"),
          { type: "orderedList", attrs: { start: 1 }, content: ["Decide on the next milestone", "Assign owners", "Review in two weeks"].map((i) => ({ type: "listItem", content: [p(t(i))] })) },
        ],
      },
    }),
  },
  {
    id: "notes",
    label: "Meeting notes",
    hint: "Agenda, decisions, actions",
    build: () => ({
      meta: DEFAULT_META,
      content: {
        type: "doc",
        content: [
          h(1, "Meeting notes"),
          p(t("Date: ", bold), t(today())),
          p(t("Attendees: ", bold), t("Names")),
          h(2, "Agenda"),
          bullets("Topic one", "Topic two"),
          h(2, "Decisions"),
          bullets("What was agreed"),
          h(2, "Action items"),
          bullets("Owner: task, due date"),
        ],
      },
    }),
  },
];

// ─── Everyday letters (India) ──────────────────────────────────────

/** A formal letter: sender, date, recipient, subject, body paragraphs, sign-off. */
function formalLetter(o: { from: string[]; to: string[]; subject: string; salutation: string; body: (string | JSONContent)[]; closing: string; signer: string[] }): WordDoc {
  return {
    meta: DEFAULT_META,
    content: {
      type: "doc",
      content: [
        ...o.from.map((l, i) => p(t(l, i === 0 ? bold : muted))),
        p(),
        p(t(`Date: ${today()}`)),
        p(),
        ...o.to.map((l) => p(t(l))),
        p(),
        p(t("Subject: ", bold), t(o.subject)),
        p(),
        p(t(o.salutation)),
        ...o.body.map((b) => (typeof b === "string" ? p(t(b)) : b)),
        p(),
        p(t(o.closing)),
        p(),
        p(),
        ...o.signer.map((l, i) => p(t(l, i === 0 ? bold : undefined))),
      ],
    },
  };
}

const LETTER_TEMPLATES: WordTemplate[] = [
  {
    id: "leave",
    label: "Leave application",
    hint: "For office or school",
    build: () =>
      formalLetter({
        from: ["Your Name", "Employee ID / Class and Roll No."],
        to: ["To,", "The Manager / Principal", "Department / School name", "City"],
        subject: "Application for leave from [start date] to [end date]",
        salutation: "Respected Sir / Madam,",
        body: [
          "I request leave for [number] days, from [start date] to [end date], because [reason, e.g. a family function / I am unwell].",
          "I have handed over my pending work to [colleague's name], who can be reached for anything urgent. I will be available on my phone if needed.",
          "Kindly grant me leave for the above period.",
        ],
        closing: "Yours faithfully,",
        signer: ["Your Name", "Designation / Class"],
      }),
  },
  {
    id: "resignation",
    label: "Resignation letter",
    hint: "With notice period",
    build: () =>
      formalLetter({
        from: ["Your Name", "Employee ID · Designation"],
        to: ["To,", "The HR Manager", "Company name", "City"],
        subject: "Resignation from the post of [Designation]",
        salutation: "Dear [Manager's name],",
        body: [
          "Please accept this letter as formal notice of my resignation from the post of [Designation], effective [date]. As per my notice period of [30 / 60 / 90] days, my last working day will be [date].",
          "I am grateful for the opportunities and support I have received here. I will complete a smooth handover of my responsibilities before I leave.",
          "Please let me know the exit formalities, including the return of company assets and my full and final settlement.",
        ],
        closing: "Sincerely,",
        signer: ["Your Name", "Phone · Email"],
      }),
  },
  {
    id: "offer",
    label: "Offer letter",
    hint: "Role, salary, joining date",
    build: () =>
      formalLetter({
        from: ["Company Name", "Address · GSTIN · Phone"],
        to: ["To,", "[Candidate's name]", "[Address]"],
        subject: "Offer of employment",
        salutation: "Dear [Candidate's name],",
        body: [
          "We are pleased to offer you the position of [Designation] in our [Department] team, based at [Location].",
          bullets(
            "Date of joining: [date]",
            "Annual CTC: ₹[amount] (break-up in Annexure A)",
            "Probation: [6] months; notice period: [30] days after confirmation",
            "Working hours: [10 am to 6 pm, Monday to Friday]",
          ),
          "Please bring copies of your educational certificates, previous employment letters, PAN, Aadhaar and two photographs on your joining date.",
          "Kindly sign and return a copy of this letter by [date] to confirm your acceptance. We look forward to working with you.",
        ],
        closing: "Warm regards,",
        signer: ["Name", "HR Manager, Company Name"],
      }),
  },
  {
    id: "experience",
    label: "Experience letter",
    hint: "Relieving / service certificate",
    build: () =>
      formalLetter({
        from: ["Company Name", "Address · Phone · Email"],
        to: ["TO WHOMSOEVER IT MAY CONCERN"],
        subject: "Experience certificate",
        salutation: "",
        body: [
          "This is to certify that [Employee's name] (Employee ID [ID]) worked with [Company Name] as [Designation] from [joining date] to [last working date].",
          "During this period [he / she / they] handled [main responsibilities]. We found [him / her / them] sincere, hardworking and professional.",
          "[He / She / They] has been relieved of all duties. We wish [him / her / them] success in the future.",
        ],
        closing: "For Company Name",
        signer: ["Authorised Signatory", "Name, Designation"],
      }),
  },
  {
    id: "noc",
    label: "No objection certificate",
    hint: "NOC from employer or owner",
    build: () =>
      formalLetter({
        from: ["Name / Company Name", "Address · Phone"],
        to: ["TO WHOMSOEVER IT MAY CONCERN"],
        subject: "No objection certificate",
        salutation: "",
        body: [
          "This is to certify that [name], [relationship, e.g. our employee / tenant] residing at [address], has our permission to [purpose, e.g. apply for a passport / travel abroad / register a business at this address].",
          "We have no objection to the above. This certificate is issued on request for the purpose stated and is valid until [date].",
        ],
        closing: "Signature",
        signer: ["Name", "Designation / Owner", "Place: [City]"],
      }),
  },
  {
    id: "rent-agreement",
    label: "Rent agreement (draft)",
    hint: "11-month residential",
    build: () => ({
      meta: DEFAULT_META,
      content: {
        type: "doc",
        content: [
          h(1, "Rent Agreement"),
          p(t("This rent agreement is made on [date] at [city] between:", muted)),
          p(t("Landlord: ", bold), t("[Name], son/daughter of [father's name], residing at [address] (hereinafter “the Landlord”)")),
          p(t("Tenant: ", bold), t("[Name], son/daughter of [father's name], permanent address [address] (hereinafter “the Tenant”)")),
          h(2, "Terms"),
          {
            type: "orderedList",
            content: [
              "Property: [flat / house number, building, full address], including [fittings, e.g. 2 fans, 1 geyser].",
              "Period: 11 months from [start date] to [end date], renewable by mutual agreement.",
              "Rent: ₹[amount] per month, payable by the [5th] of each month by bank transfer / UPI.",
              "Security deposit: ₹[amount], refundable without interest when the Tenant vacates, after deducting unpaid dues or damage beyond normal wear.",
              "Electricity, water and maintenance charges are paid by the [Tenant / Landlord].",
              "The Tenant will use the property only for residence, will not sub-let it, and will keep it in good condition.",
              "Either party may end this agreement with [one] month's written notice.",
              "Rent increases by [5]% on renewal.",
            ].map((x) => ({ type: "listItem", content: [p(t(x))] })),
          },
          p(t("Both parties have read and understood this agreement and sign it of their own free will.")),
          p(),
          p(t("Landlord: ______________________          Tenant: ______________________")),
          p(),
          p(t("Witness 1: ______________________          Witness 2: ______________________")),
          p(),
          p(t("Note: this is a starting draft, not legal advice. Print it on stamp paper of the value your state requires, and have it registered where the law asks for it.", muted)),
        ],
      },
    }),
  },
];

export const WORD_TEMPLATES: WordTemplate[] = [...BASE_TEMPLATES, ...LETTER_TEMPLATES];
