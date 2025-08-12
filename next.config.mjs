/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['cdn.discordapp.com'],
  },
  output: 'standalone',
  // Disable telemetry for production
  telemetry: false,
  // Enable compression
  compress: true,
  // Optimize for production
  swcMinify: true,
};

export default nextConfig;
