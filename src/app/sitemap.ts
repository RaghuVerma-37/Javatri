import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/lib/site'
import { getBranchSafe } from '@/server/branch'
import { getPublishedMenus } from '@/server/menu'

/**
 * The sitemap is generated from the database, so a menu the kitchen unpublishes disappears from
 * it. Nothing here is hand-maintained, because a hand-maintained sitemap is a list of URLs that
 * used to exist.
 *
 * /order/checkout, /order/[id] and /admin are deliberately absent — a checkout page has nothing
 * to index and an order status page is private.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const pages: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/menu'), lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: absoluteUrl('/order'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/events'), lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: absoluteUrl('/book'), lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: absoluteUrl('/contact'), lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
  ]

  const branch = await getBranchSafe()
  if (!branch) return pages

  const menus = await getPublishedMenus(branch.id)

  return [
    ...pages,
    ...menus.map((menu) => ({
      url: absoluteUrl(`/menu/${menu.slug}`),
      lastModified: menu.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
