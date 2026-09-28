import type { NextConfig } from "next";

// Where the backend (../server) runs. By default the browser only ever talks to
// this Next app and /api/* is proxied, so auth cookies stay same-origin.
const SERVER_URL = process.env.SERVER_URL ?? "http://localhost:4000";

const isDev = process.env.NODE_ENV !== "production";
const originOf = (url?: string) => {
  try {
    return url ? new URL(url).origin : "";
  } catch {
    return "";
  }
};
// Direct-API mode (see src/lib/api.ts): the browser calls this origin itself.
const apiOrigin = originOf(process.env.NEXT_PUBLIC_API_URL);
// Presigned upload/download links point at the bucket. Set this to lock
// connect-src to it (e.g. https://<account>.r2.cloudflarestorage.com);
// otherwise any https origin is allowed for those requests.
const storageOrigin = originOf(process.env.NEXT_PUBLIC_STORAGE_ORIGIN) || "https:";

const csp = [
  "default-src 'self'",
  // Next.js injects inline bootstrap scripts; dev mode also needs eval for fast refresh.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Thumbnails, signatures and images placed on pages are data:/blob: URLs.
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin} ${storageOrigin} blob: data:${isDev ? " ws: wss:" : ""}`,
  // PDF.js runs in a worker served from /public.
  "worker-src 'self' blob:",
  // Printing loads the exported PDF into a blob: iframe.
  "frame-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  // Auth.js sign-in forms post here and then redirect to the OAuth providers.
  `form-action 'self' ${apiOrigin} https://github.com https://accounts.google.com`,
  "frame-ancestors 'none'",
]
  .join("; ")
  .replace(/\s{2,}/g, " ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Browsers ignore HSTS over plain http, so this is safe locally.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${SERVER_URL}/api/:path*` }];
  },
  async headers() {
    // /api/* responses come from the server, which sets its own headers.
    return [{ source: "/((?!api/).*)", headers: securityHeaders }];
  },
  // pdf.js optionally requires `canvas` (a Node addon), which is never needed in the browser.
  webpack: (config) => {
    config.resolve.alias = { ...config.resolve.alias, canvas: false };
    return config;
  },
};

export default nextConfig;
