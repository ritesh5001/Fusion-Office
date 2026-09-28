import type { Metadata, Viewport } from "next";
import { Inter, Dancing_Script, Schibsted_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const signature = Dancing_Script({ subsets: ["latin"], variable: "--font-signature-face", weight: ["600"], display: "swap" });
const display = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-display-face", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-mono-face", weight: ["400", "500"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Fusion Office", template: "%s · Fusion Office" },
  description: "Edit any PDF in your browser. Add text, sign, redact for real and reorder pages. Your file never has to leave your computer.",
};

export const viewport: Viewport = { themeColor: "#f4f5f6" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${signature.variable} ${display.variable} ${mono.variable}`}>
      <head>
        {/* Scroll-reveal styles only apply when JS runs, so content never stays hidden. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
