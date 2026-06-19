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
      // Kejuaraan lama → Performance
      {
        source: '/konida/kejuaraan/kabbandung',
        destination: '/konida/performance/kabbandung',
        permanent: true,
      },
      {
        source: '/konida/kejuaraan/kabbandung/:cabor_slug',
        destination: '/konida/performance/kabbandung/:cabor_slug',
        permanent: true,
      },
      {
        source: '/konida/kejuaraan/kabbandung/:cabor_slug/:atlet_id',
        destination: '/konida/performance/kabbandung/:cabor_slug/:atlet_id',
        permanent: true,
      },
    ]
  },
}
module.exports = nextConfig