import type { Metadata, Viewport } from "next";
import { Inter, Dancing_Script } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const signature = Dancing_Script({ subsets: ["latin"], variable: "--font-signature-face", weight: ["600"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Fusion Office", template: "%s · Fusion Office" },
  description: "A document workspace. Edit, annotate, sign and organize PDFs right in your browser.",
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${signature.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
