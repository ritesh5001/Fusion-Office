import type { Metadata, Viewport } from "next";
import { Inter, Dancing_Script, Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const signature = Dancing_Script({ subsets: ["latin"], variable: "--font-signature-face", weight: ["600"], display: "swap" });
const display = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-display-face", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-mono-face", weight: ["400", "500"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Fusion Office", template: "%s · Fusion Office" },
  description:
    "Free online tools for PDFs, Word, Excel, PowerPoint and images: edit, merge, compress, convert and sign. No sign-up, and most tools run in your browser so files stay on your device.",
};

export const viewport: Viewport = { themeColor: "#0a0c11", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${signature.variable} ${display.variable} ${mono.variable}`}>
      <body className="bg-app font-sans text-fg">{children}</body>
    </html>
  );
}
