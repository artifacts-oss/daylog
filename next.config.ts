import type { NextConfig } from 'next';
import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'unsplash.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    // For limitations with Image component from Next.js
    // https://nextjs.org/docs/app/api-reference/components/image#reference
    // cannot use optimized images with urls that requires authentication from headers...
    // however api/v1/images and api/v1/storage are optimized with Sharp https://github.com/lovell/sharp
    unoptimized: true,
  },
  // CORS is handled in middleware.ts, which validates the request Origin
  // against SECURITY_CONFIG.CORS.ALLOWED_ORIGINS. A static wildcard
  // (Access-Control-Allow-Origin: *) here would override that and is unsafe.
  experimental: {
    serverActions: {
      bodySizeLimit: '64mb',
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins = [...config.plugins, new PrismaPlugin()];
    }
    return config;
  },
};

export default withNextIntl(nextConfig);
