/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
        ],
      },
      {
        source: '/login',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
      {
        source: '/register',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
      {
        source: '/profile',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
      {
        source: '/recommendations',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ];
  },
};

export default nextConfig;
