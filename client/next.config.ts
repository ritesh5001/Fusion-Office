import type { NextConfig } from "next";

// Where the backend (../server) runs. The browser only ever talks to this
// Next app; /api/* is proxied so auth cookies stay same-origin.
const SERVER_URL = process.env.SERVER_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${SERVER_URL}/api/:path*` }];
  },
  // pdf.js optionally requires `canvas` (a Node addon) — never needed in the browser.
  webpack: (config) => {
    config.resolve.alias = { ...config.resolve.alias, canvas: false };
    return config;
  },
};

export default nextConfig;
