import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // argon2, @prisma/client, prisma are already in Next.js's auto-opt-out list,
  // but listing them explicitly keeps things clear.
  serverExternalPackages: ['argon2', '@prisma/client', 'prisma'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
}

export default nextConfig
