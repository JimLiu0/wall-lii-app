import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    // Unversioned public icons can change on deploy; avoid immutable caching here.
    // The navbar's static import gets a content hash and Next's one-year cache.
    return [
      '/favicon.ico',
      '/favicon-16x16.png',
      '/favicon-32x32.png',
      '/apple-touch-icon.png',
      '/android-chrome-192x192.png',
      '/android-chrome-512x512.png',
      '/icons/:path*',
      '/og-image.jpg',
      '/og-image-news.jpg',
    ].map(source => ({
      source,
      headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
    }));
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
