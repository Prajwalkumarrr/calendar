/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      beforeFiles: [
        // Landing page lives as static HTML in /public, served at root
        { source: '/', destination: '/landing.html' },
      ],
      // `fallback` runs AFTER dynamic routes, so /api/auth/[...nextauth] wins
      // and unmatched /api/* requests get proxied to the Express backend.
      fallback: [
        {
          source: '/api/:path*',
          destination:
            process.env.NODE_ENV === 'production'
              ? `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`
              : 'http://localhost:4000/api/:path*',
        },
      ],
    };
  },
};

export default nextConfig;
