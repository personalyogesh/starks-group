import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Firebase-hosted upload URLs are reliable when fetched directly by the browser,
    // but local Next image optimization has been failing on this machine.
    unoptimized: true,
  },
};

export default nextConfig;
