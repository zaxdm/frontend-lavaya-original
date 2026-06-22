/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        pathname: '/api/**',
      },
    ],
  },
  allowedDevOrigins: ['192.168.0.108'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://backend-lavaya.onrender.com/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
