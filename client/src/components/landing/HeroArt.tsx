"use client";

import type { ReactNode } from "react";
import { Mascot, type Mood } from "../mascot/Mascot";
import { Tile } from "../tools/icons";

// Geometry (px, in a 400 × 440 box): Folio sits at the centre of two rings;
// the file tiles sit exactly on the outer ring, mirrored left/right, with the
// top of the ring left free for the speech bubble.
const W = 400;
const H = 440;
const CX = 200;
const CY = 250;
const OUTER = 160;
const INNER = 112;

/** A point on the outer ring; angle in degrees, 0 = right, 90 = down. */
const onRing = (deg: number) => ({
  left: CX + OUTER * Math.cos((deg * Math.PI) / 180),
  top: CY + OUTER * Math.sin((deg * Math.PI) / 180),
});

function Orbiting({ deg, float, children }: { deg: number; float: string; children: ReactNode }) {
  return (
    // The wrapper centres the tile on its ring point; the tile inside floats on its own.
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={onRing(deg)}>
      <div className={float}>{children}</div>
    </div>
  );
}

/** Hero artwork: Folio at the centre, the file types it handles on its orbit, and what it's thinking. */
export function HeroArt({ mood, message }: { mood: Mood; message: string }) {
  return (
    <div className="relative mx-auto" style={{ width: W, height: H }}>
      <div
        className="absolute rounded-full bg-[radial-gradient(circle,rgb(91_140_255/0.22),transparent_68%)] blur-2xl"
        style={{ left: CX - 190, top: CY - 190, width: 380, height: 380 }}
        aria-hidden="true"
      />
      <div
        className="absolute rounded-full border border-dashed border-brand-200"
        style={{ left: CX - OUTER, top: CY - OUTER, width: OUTER * 2, height: OUTER * 2 }}
        aria-hidden="true"
      />
      <div
        className="absolute rounded-full bg-white/60 ring-1 ring-brand-100"
        style={{ left: CX - INNER, top: CY - INNER, width: INNER * 2, height: INNER * 2 }}
        aria-hidden="true"
      />

      <div aria-hidden="true">
        <Orbiting deg={200} float="float-a">
          <Tile swatch="red" letter="PDF" size="lg" className="h-11 w-[64px] -rotate-6" letterClassName="text-[17px]" />
        </Orbiting>
        <Orbiting deg={340} float="float-b">
          <Tile swatch="blue" letter="W" size="lg" className="rotate-6" />
        </Orbiting>
        <Orbiting deg={155} float="float-c">
          <Tile swatch="green" letter="X" size="lg" className="-rotate-6" />
        </Orbiting>
        <Orbiting deg={25} float="float-slow">
          <Tile swatch="orange" letter="P" size="lg" className="rotate-6" />
        </Orbiting>
        <Orbiting deg={90} float="float-b">
          <Tile swatch="teal" icon="Image" size="md" />
        </Orbiting>
      </div>

      <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: CX, top: CY }}>
        <Mascot mood={mood} size={160} follow interactive />
      </div>

      {/* What Folio is thinking, attached above it; announced politely to screen readers. */}
      <div className="absolute left-1/2 top-4 w-[280px] -translate-x-1/2 text-center" aria-live="polite">
        <p
          key={message}
          className="m-bubble relative inline-block rounded-2xl bg-white px-4 py-2.5 text-[14px] font-medium leading-snug text-ink shadow-[0_12px_28px_-16px_rgb(36_71_230/0.5)] ring-1 ring-brand-100"
        >
          {message}
          <span
            className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white ring-1 ring-brand-100 [clip-path:polygon(100%_0,100%_100%,0_100%)]"
            aria-hidden="true"
          />
        </p>
      </div>
    </div>
  );
}
