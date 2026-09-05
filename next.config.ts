import path from 'node:path'
import type { NextConfig } from 'next'

/**
 * Every URL the old Wix site published lands somewhere useful.
 *
 * Google currently holds three ordering pages, two menu pages and a set of `?menu=` variants,
 * several of which render blank. Redirecting rather than 404-ing keeps whatever ranking those
 * URLs have earned and, more importantly, means a customer who clicks a search result for
 * "javatri pub menu" ends up on a working menu instead of an empty page.
 *
 * Order matters: the `has` query-matched rules must come before the bare-path rules, or the bare
 * rule swallows them.
 *
 * These are 301s rather than Next's default 308. Google treats the two identically, but 301 is
 * what every SEO tool, log analyser and CDN in the world understands without argument, and this
 * is link equity we are trying not to lose.
 */
const redirects: NonNullable<NextConfig['redirects']> = async () => [
  // /menu-1?menu=… and /menu-2?menu=… — the old per-menu deep links.
  ...[
    { from: 'food-menu', to: '/menu/food-menu' },
    { from: 'indian-street-food', to: '/menu/indian-street-food' },
    { from: 'dessert-menu', to: '/menu/dessert-menu' },
    // The Pub Menu and Drinks Delight are still indexed with prices but render empty on the old
    // site, and we could only partially recover them. They go to the full menu rather than to a
    // half-recovered page. See QUESTIONS_FOR_CLIENT.md.
    { from: 'pub-menu', to: '/menu' },
    { from: 'drinks-delight', to: '/menu' },
  ].flatMap(({ from, to }) =>
    ['/menu-1', '/menu-2'].map((source) => ({
      source,
      has: [{ type: 'query' as const, key: 'menu', value: from }],
      destination: to,
      statusCode: 301,
    })),
  ),

  // The three dead ordering pages. All of them, to the one that works.
  { source: '/online-ordering', destination: '/order', statusCode: 301 },
  { source: '/online-ordering-1', destination: '/order', statusCode: 301 },
  { source: '/online-ordering-ordering-page-2', destination: '/order', statusCode: 301 },
  { source: '/online-ordering-1/:path*', destination: '/order', statusCode: 301 },

  // Showcase menus.
  { source: '/menu-1', destination: '/menu', statusCode: 301 },
  { source: '/menu-2', destination: '/menu', statusCode: 301 },

  // Everything else the old site published.
  { source: '/reservation-1', destination: '/book', statusCode: 301 },
  { source: '/reservations', destination: '/book', statusCode: 301 },
  { source: '/banqueting', destination: '/events', statusCode: 301 },
  { source: '/contact-us', destination: '/contact', statusCode: 301 },
]

const nextConfig: NextConfig = {
  // Without this Turbopack walks up to the home directory looking for a lockfile.
  turbopack: { root: path.dirname(new URL(import.meta.url).pathname) },
  redirects,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    // The pg driver and Prisma's client are server-only; keep them out of the bundle graph.
    serverActions: { bodySizeLimit: '1mb' },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ]
  },
}

export default nextConfig
