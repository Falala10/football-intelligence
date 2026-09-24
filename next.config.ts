import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  // Live data is either requested at view time or cached briefly with `use cache`.
  cacheComponents: true,
  // Keep the development badge clear of the sidebar's theme button.
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
