import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // The staff area, the checkout and individual order pages. An order URL is unguessable,
        // but there is no reason for it to be in an index either.
        disallow: ['/admin', '/api/', '/order/checkout', '/order/'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  }
}
