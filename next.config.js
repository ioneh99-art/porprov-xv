/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      // Baseline lama → Performance
      {
        source: '/konida/cabor-baseline',
        destination: '/konida/performance/kabbandung',
        permanent: true,
      },
      {
        source: '/konida/cabor-baseline/:path*',
        destination: '/konida/performance/kabbandung',
        permanent: true,
      },
    ]
  },
}
module.exports = nextConfig