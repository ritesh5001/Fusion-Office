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

export const WORD_TEMPLATES: WordTemplate[] = [
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
