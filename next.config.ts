import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  // skipWaiting is a Workbox option, not a top-level one; the previous
  // top-level placement was silently ignored (the require() import was
  // untyped). Placing it here activates a new service worker immediately.
  workboxOptions: {
    skipWaiting: true,
  },
});

const nextConfig: NextConfig = {};

export default withPWA(nextConfig);
