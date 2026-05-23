/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['next-auth'],
  },
  async rewrites() {
    return {
      beforeFiles: [
        // PWA icon PNGs served via API route
        { source: '/icons/icon-192.png', destination: '/api/icons/192' },
        { source: '/icons/icon-512.png', destination: '/api/icons/512' },
        { source: '/icons/apple-touch-icon.png', destination: '/api/icons/192' },

        // NOTE: `/` is handled by app/page.tsx (signed-in → /home, else → /landing.html).
        // Don't rewrite `/` here — it would skip the auth check.

        // Clean URLs for marketing & legal pages — no .html visible to users
        { source: '/pricing', destination: '/pricing.html' },
        { source: '/about', destination: '/about.html' },
        { source: '/careers', destination: '/careers.html' },
        { source: '/blog', destination: '/blog.html' },
        { source: '/press', destination: '/press.html' },
        { source: '/security', destination: '/security.html' },
        { source: '/status', destination: '/status.html' },
        { source: '/terms', destination: '/terms.html' },
        { source: '/privacy', destination: '/privacy.html' },
        { source: '/help', destination: '/help.html' },
        { source: '/contact', destination: '/contact.html' },
        { source: '/changelog', destination: '/changelog.html' },
        { source: '/signed-out', destination: '/signed-out.html' },
        { source: '/api-docs', destination: '/api.html' }, // /api/* is reserved for backend
        { source: '/mobile-preview', destination: '/mobile.html' },
        { source: '/pages', destination: '/all-pages.html' },

        // App pages that still live as static HTML (will be ported to React later)
        // NOTE: /inbox now has a real React page; the static prototype html stays at /inbox.html for reference.
        // /find-time now has a real React page; the static prototype html stays at /find-time.html for reference.
        // /search now has a real React page; the static prototype html stays at /search.html for reference.
        { source: '/recurring', destination: '/recurring.html' },
        // /timezones now has a real React management page; the static prototype html stays at /timezones.html for reference.
        // /integrations now has a real React page; the static prototype html stays at /integrations.html for reference.
        { source: '/empty', destination: '/empty.html' },
        { source: '/verify-email', destination: '/verify-email.html' },
        { source: '/forgot-password', destination: '/forgot-password.html' },
        { source: '/oauth-callback', destination: '/oauth-callback.html' },
        // /invite/[token] now has a real React page — static prototype stays at /invite.html for reference.
        { source: '/checkout', destination: '/checkout.html' },
      ],
    };
  },
};

export default nextConfig;
