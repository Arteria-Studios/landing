const {
  getMediaImageHostsFromEnv,
  getMediaRemotePatterns,
} = require('./lib/s3-image-hosts.cjs')

/**
 * The public site is the static frontend in /public (plain HTML, CSS and JS).
 * Next.js serves it as is and adds the API (/api/*), the admin (/admin) and
 * /data.js, the database content the static pages read before rendering.
 */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    domains: getMediaImageHostsFromEnv(),
    remotePatterns: getMediaRemotePatterns(),
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
    {
      // Versioned with ?v=N in the HTML, so they can be cached for long.
      source: '/assets/:path*',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
  ],
  redirects: async () => [
    { source: '/home', destination: '/', permanent: true },
  ],
  rewrites: async () => ({
    beforeFiles: [
      // public/data.js is a static fallback (SITE_DATA = null) for hosts without
      // the API, such as GitHub Pages; here the live content replaces it.
      { source: '/data.js', destination: '/api/site-data?format=js' },
    ],
    afterFiles: [
      { source: '/', destination: '/index.html' },
      { source: '/works', destination: '/works.html' },
      { source: '/about', destination: '/about.html' },
      { source: '/project', destination: '/project.html' },
      // 404.html links with the GitHub Pages base path (/landing/...).
      { source: '/landing', destination: '/index.html' },
      { source: '/landing/:path*', destination: '/:path*' },
    ],
    fallback: [{ source: '/:path*', destination: '/404.html' }],
  }),
}

module.exports = nextConfig
