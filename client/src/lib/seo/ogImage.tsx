import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

/** The social preview card: logo, an eyebrow line, the page's headline, the domain. */
export function renderOg({ eyebrow, title, tagline }: { eyebrow: string; title: string; tagline?: string }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#0a0c11",
          backgroundImage: "radial-gradient(70% 90% at 85% 0%, rgba(139,124,246,0.28), rgba(10,12,17,0) 70%)",
          color: "#eef0f5",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ position: "relative", display: "flex", width: 56, height: 56 }}>
            <div style={{ position: "absolute", left: 7, top: 12, width: 28, height: 37, borderRadius: 7, background: "#8b7cf6" }} />
            <div style={{ position: "absolute", left: 19, top: 5, width: 30, height: 39, borderRadius: 7, background: "#cdf564" }} />
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>Fusion Office</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 26, fontWeight: 600, color: "#cdf564", textTransform: "uppercase", letterSpacing: 2 }}>{eyebrow}</div>
          <div style={{ marginTop: 18, fontSize: title.length > 48 ? 64 : 78, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, maxWidth: 1000 }}>{title}</div>
          {tagline && <div style={{ marginTop: 22, fontSize: 30, color: "#a1a8b8", maxWidth: 980, lineHeight: 1.35 }}>{tagline}</div>}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#6c7385" }}>
          <div>fusionoffice.online</div>
          <div>Free · No sign-up · Private</div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
