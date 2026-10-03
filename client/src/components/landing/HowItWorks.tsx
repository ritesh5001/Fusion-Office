import { Mascot, type Mood } from "../mascot/Mascot";

const STEPS: { mood: Mood; title: string; text: string }[] = [
  {
    mood: "idle",
    title: "Pick a tool",
    text: "Search or browse every tool on one page, or drop a file and get the tools that can open it.",
  },
  {
    mood: "curious",
    title: "Add your file",
    text: "PDFs, Word, Excel, PowerPoint or photos. Drag them in or choose them from your device.",
  },
  {
    mood: "working",
    title: "Let it work",
    text: "Most tools run right in your browser. The few that need our server delete the file straight after.",
  },
  {
    mood: "happy",
    title: "Download the result",
    text: "No watermark, no sign-up, no queue. If a file is damaged or locked, you get a clear message instead.",
  },
];

/** Four steps from picking a tool to downloading; Folio's face shows each state. */
export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-20 border-t border-line">
      <div className="px-4 py-16 sm:px-6 md:py-20 lg:px-8">
        <div className="max-w-[640px]">
          <p className="eyebrow">How it works</p>
          <h2 id="how-title" className="mt-3 text-balance font-display text-[clamp(1.75rem,3.4vw,2.5rem)] font-bold leading-[1.1] tracking-[-0.035em] text-fg">
            From file to finished in four steps.
          </h2>
          <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-fg-muted">
            You always know where things stand: Folio, our document helper, shows what is happening at every step.
          </p>
        </div>

        <ol className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card flex flex-col p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[12px] font-medium text-fg-subtle">0{i + 1}</span>
                <Mascot mood={s.mood} size={44} />
              </div>
              <h3 className="mt-6 text-[16px] font-semibold tracking-[-0.01em] text-fg">{s.title}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-fg-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
