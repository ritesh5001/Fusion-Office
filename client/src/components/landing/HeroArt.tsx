"use client";

import { Mascot, type Mood } from "../mascot/Mascot";
import { Tile } from "../tools/icons";

/** Hero: Folio in the middle, the file types it handles floating around it, and what it's thinking. */
export function HeroArt({ mood, message }: { mood: Mood; message: string }) {
  return (
    <div className="relative mx-auto h-[380px] w-full max-w-[400px]">
      <div className="absolute inset-4 rounded-full bg-[radial-gradient(circle,rgb(91_140_255/0.22),transparent_66%)] blur-2xl" aria-hidden="true" />
      {/* Soft rings Folio sits in. */}
      <div className="absolute left-1/2 top-[54%] h-[250px] w-[250px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand-200/60" aria-hidden="true" />
      <div className="absolute left-1/2 top-[54%] h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-brand-200/50" aria-hidden="true" />

      <div aria-hidden="true">
        <Tile swatch="red" letter="PDF" size="lg" className="float-a absolute left-[2%] top-[20%] h-11 w-[66px] rotate-[-8deg]" letterClassName="text-[17px]" />
        <Tile swatch="blue" letter="W" size="lg" className="float-b absolute right-[6%] top-[14%] h-14 w-14 rotate-[6deg]" />
        <Tile swatch="green" letter="X" size="lg" className="float-c absolute bottom-[12%] left-[6%] h-14 w-14 rotate-[-5deg]" />
        <Tile swatch="orange" letter="P" size="lg" className="float-slow absolute bottom-[6%] right-[14%] h-12 w-12 rotate-[8deg]" letterClassName="text-[24px]" />
        <Tile swatch="teal" icon="Image" size="md" className="float-a absolute right-[0%] top-[52%] rotate-[-6deg]" />
      </div>

      <div className="absolute left-1/2 top-[54%] -translate-x-1/2 -translate-y-1/2">
        <Mascot mood={mood} size={170} follow interactive />
      </div>

      {/* What Folio is thinking; announced politely to screen readers. */}
      <div className="absolute left-1/2 top-0 w-max max-w-[300px] -translate-x-1/2" aria-live="polite">
        <p key={message} className="m-bubble relative rounded-2xl bg-white px-4 py-2.5 text-center text-[14px] font-medium text-ink shadow-[0_12px_28px_-16px_rgb(36_71_230/0.5)] ring-1 ring-brand-100">
          {message}
          <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white ring-1 ring-brand-100 [clip-path:polygon(100%_0,100%_100%,0_100%)]" aria-hidden="true" />
        </p>
      </div>
    </div>
  );
}
