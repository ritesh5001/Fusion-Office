import type { NextConfig } from "next";

// Where the backend (../server) runs. By default the browser only ever talks to
// this Next app and /api/* is proxied, so auth cookies stay same-origin.
// On Render, SERVER_HOSTPORT is the backend's private-network "host:port".
const SERVER_URL =
  process.env.SERVER_URL ?? (process.env.SERVER_HOSTPORT ? `http://${process.env.SERVER_HOSTPORT}` : "http://localhost:4000");

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

const csp = [
  "default-src 'self'",
  // Next.js injects inline bootstrap scripts; dev mode also needs eval for fast refresh.
  // 'wasm-unsafe-eval' only permits WebAssembly (the in-browser OCR engine), not eval().
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Thumbnails, signatures and images placed on pages are data:/blob: URLs.
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // Files are stored by our own server, so no third-party origins are needed.
  `connect-src 'self' ${apiOrigin} blob: data:${isDev ? " ws: wss:" : ""}`,
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
  // Camera is allowed for this site only (Scan to PDF).
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Browsers ignore HSTS over plain http, so this is safe locally.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // PDFs are uploaded through the /api proxy. Next buffers proxied bodies and
    // caps them at 10 MB by default; match the server's upload limit instead.
    middlewareClientMaxBodySize: `${Number(process.env.MAX_UPLOAD_MB ?? 200) + 10}mb`,
    // Large uploads on slow connections take longer than the 30 s default.
    proxyTimeout: 5 * 60 * 1000,
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${SERVER_URL}/api/:path*` }];
  },
  async headers() {
    // /api/* responses come from the server, which sets its own headers.
    return [{ source: "/((?!api/).*)", headers: securityHeaders }];
  },
  webpack: (config, { isServer, webpack }) => {
    // pdf.js optionally requires `canvas` (a Node addon), which is never needed in the browser.
    config.resolve.alias = { ...config.resolve.alias, canvas: false };
    if (!isServer) {
      // Some libraries (pptxgenjs) import `node:fs`/`node:https` and declare them
      // unused in browsers via package.json "browser"; webpack needs the plain names.
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource: { request: string }) => {
          resource.request = resource.request.replace(/^node:/, "");
        }),
      );
      config.resolve.fallback = { ...config.resolve.fallback, fs: false, https: false, http: false, os: false, path: false, stream: false, zlib: false };
    }
    return config;
  },
};

export default nextConfig;
