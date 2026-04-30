/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['cdn.discordapp.com', 'revolt.tr'],
    unoptimized: true,
  },
  output: 'standalone',
};

export default nextConfig;
