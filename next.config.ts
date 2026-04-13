import type { NextConfig } from "next";

if (process.env.NODE_ENV === 'development') {
  // Setup Cloudflare bindings for local dev server
  import('@cloudflare/next-on-pages/next-dev').then(({ setupDevPlatform }) => {
    setupDevPlatform();
  });
}

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
