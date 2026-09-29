import { Tile } from "../tools/icons";

/** A sheet of paper with a folded corner and a few text lines. */
function Sheet({ className, lines = 5 }: { className?: string; lines?: number }) {
  return (
    <div className={`absolute rounded-[18px] bg-white p-5 shadow-[0_24px_50px_-24px_rgb(36_71_230/0.45)] ring-1 ring-ink/5 ${className ?? ""}`}>
      <div className="absolute right-0 top-0 h-7 w-7 rounded-bl-[10px] rounded-tr-[18px] bg-gradient-to-bl from-slate-200 to-slate-100" />
      <div className="space-y-2.5 pt-8">
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className="h-2 rounded-full bg-slate-200" style={{ width: `${[92, 78, 86, 60, 72, 50][i % 6]}%` }} />
        ))}
      </div>
    </div>
  );
}

/** Hero illustration: the file types Fusion Office handles, floating together. */
export function HeroArt() {
  return (
    <div className="relative mx-auto h-[360px] w-full max-w-[400px]" aria-hidden="true">
      <div className="absolute inset-6 rounded-full bg-[radial-gradient(circle,rgb(91_140_255/0.28),transparent_68%)] blur-2xl" />
      <div className="absolute left-[18%] top-[8%] h-[250px] w-[190px] rotate-[-8deg] rounded-[22px] bg-brand-100/70" />

      <div className="float-slow absolute left-[20%] top-[4%] h-[260px] w-[200px]">
        <Sheet className="inset-0" lines={6} />
        <Tile swatch="red" letter="PDF" size="lg" className="absolute -left-7 top-7 h-12 w-[72px] rotate-[-6deg]" letterClassName="text-[19px]" />
      </div>

      <div className="float-a absolute right-[4%] top-[10%]">
        <Sheet className="relative h-[120px] w-[108px] !p-4" lines={3} />
        <Tile swatch="blue" letter="W" size="lg" className="absolute -bottom-4 -left-5 h-[58px] w-[58px] rotate-[4deg]" />
      </div>

      <Tile swatch="green" letter="X" size="lg" className="float-b absolute left-[40%] top-[40%] h-[84px] w-[84px] rounded-[22px] rotate-[-4deg]" letterClassName="text-[42px]" />

      <div className="float-c absolute bottom-[10%] left-[8%] flex h-[70px] w-[70px] items-center justify-center rounded-full bg-white shadow-xl ring-1 ring-ink/5">
        <svg viewBox="0 0 24 24" className="h-9 w-9 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 12a8 8 0 1 1-2.34-5.66" />
          <path d="M20 4v5h-5" />
        </svg>
      </div>

      <Tile swatch="orange" letter="P" size="lg" className="float-a absolute bottom-[6%] left-[40%] h-16 w-16 rotate-[6deg]" letterClassName="text-[32px]" />
      <Tile swatch="teal" icon="Image" size="lg" className="float-b absolute bottom-[16%] right-[4%] h-[72px] w-[72px] rotate-[-6deg] [&_svg]:h-9 [&_svg]:w-9" />
    </div>
  );
}
