export interface ToolSeo {
  /** Full <title>, written for this page's search intent. */
  title: string;
  /** Meta description: what the page does, accurately. */
  description: string;
  /** Search intent this page serves: primary query first, then secondary ones. Not rendered. */
  intent: string[];
  /** Descriptive anchor text other pages use when linking here ("Compress a PDF"). */
  anchor: string;
  /** One or two sentences under the H1. */
  intro: string;
  /** "How to …" steps, specific to this tool's interface. */
  steps: string[];
  features: string[];
  uses: string[];
  /** Honest limits: what the tool can't do, or when to use another tool. */
  limits?: string[];
  /** Questions people ask about this task, answered on the page. */
  faq?: [string, string][];
  /** Hand-picked related and alternative tools (slugs), most relevant first. */
  related?: string[];
  /** Imperative for the "How to …" heading, e.g. "compress a PDF". Defaults to the tool name. */
  howTo?: string;
}
