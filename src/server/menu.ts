import { cache } from 'react'
import { prisma } from '@/lib/db'
import type { Prisma } from '@/generated/prisma/client'
import { isMenuAvailableAt } from '@/lib/hours'
import type { CatalogueItem } from '@/lib/pricing'
import { isDatabaseConfigured, staticMenus } from '@/server/static-data'
import { DEFAULT_BRANCH_SLUG } from '@/lib/site'
import { hasVisibleContent, visibleCategoryWhere, visibleItemWhere } from '@/lib/menu-visibility'

/*
  `where` on the items rather than a filter after the fact, so a hidden dish never reaches the
  page, the pricing catalogue or the RSC payload. See src/lib/menu-visibility.ts — this is a
  temporary shortening of the menu and reverses with one boolean.
*/
const MENU_INCLUDE = {
  categories: {
    where: visibleCategoryWhere(),
    orderBy: { sortOrder: 'asc' },
    include: {
      items: {
        where: visibleItemWhere(),
        orderBy: { sortOrder: 'asc' },
        include: {
          variants: { orderBy: { sortOrder: 'asc' } },
          modifierGroups: {
            orderBy: { sortOrder: 'asc' },
            include: { modifiers: { orderBy: { sortOrder: 'asc' } } },
          },
        },
      },
    },
  },
} as const

/**
 * Every published menu for a branch, with everything needed to render a dish card.
 *
 * This is the single query behind both /menu and /order. There is deliberately no second path
 * that reads prices from somewhere else — that duplication is what let the old site show
 * £6.50 and £8.50 for the same paratha.
 */
/**
 * Which branch's menu rows this outlet actually serves.
 *
 * Javatri's two outlets serve the same food at the same prices. The obvious way to express that —
 * copy the 187 dishes onto the second branch — is the failure this rebuild was commissioned to
 * remove: the old site kept the menu in two disconnected copies that had already drifted apart,
 * the same paratha £6.50 on one and £8.50 on the other.
 *
 * So there is one copy, and an outlet that has none of its own reads it. Resolved in one place
 * rather than as a fallback repeated at each query, because the dangerous version of this bug is
 * the inconsistent one: browse the main branch's list and price the order against an empty one,
 * which is precisely how the old site came to accept orders against a menu with nothing in it.
 *
 * An outlet that later needs its own list gets one simply by having menu rows, and this stops
 * applying to it with no code change.
 */
const resolveMenuBranchId = cache(async (branchId: string): Promise<string> => {
  const own = await prisma.menu.count({ where: { branchId, isPublished: true } })
  if (own > 0) return branchId

  const fallback = await prisma.branch.findUnique({
    where: { slug: DEFAULT_BRANCH_SLUG },
    select: { id: true },
  })
  return fallback?.id ?? branchId
})

/**
 * The menus an outlet serves.
 *
 * Orders are unaffected by the sharing: OrderItem snapshots the name and price at checkout rather
 * than trusting the menu to stay still.
 */
export const getPublishedMenus = cache(async (branchId: string) => {
  if (!isDatabaseConfigured()) return staticMenus().filter((menu) => menu.isPublished)

  const menus = await prisma.menu.findMany({
    where: { branchId: await resolveMenuBranchId(branchId), isPublished: true },
    orderBy: { sortOrder: 'asc' },
    include: MENU_INCLUDE,
  })
  // A menu whose every dish is hidden is dropped rather than rendered as an empty page.
  return menus.filter(hasVisibleContent)
})

/**
 * Anchored to Prisma's payload type rather than to `getPublishedMenus`.
 *
 * `getPublishedMenus` can now return the file-backed fallback, which is itself typed as
 * `MenuWithContent` — inferring the type from that function would be circular, and TypeScript
 * resolves a circular inference to `any`, silently deleting the type safety of every menu
 * component. `MenuGetPayload` is the shape the query actually returns, stated directly.
 */
export type MenuWithContent = Prisma.MenuGetPayload<{ include: typeof MENU_INCLUDE }>
export type CategoryWithItems = MenuWithContent['categories'][number]
export type ItemWithOptions = CategoryWithItems['items'][number]

export const getMenuBySlug = cache(async (branchId: string, slug: string) => {
  if (!isDatabaseConfigured()) {
    return staticMenus().find((menu) => menu.slug === slug && menu.isPublished) ?? null
  }
  return prisma.menu.findFirst({
    where: { branchId: await resolveMenuBranchId(branchId), slug, isPublished: true },
    include: MENU_INCLUDE,
  })
})

export const getOrderableMenus = cache(async (branchId: string) => {
  if (!isDatabaseConfigured()) {
    return staticMenus().filter((menu) => menu.isPublished && menu.isOrderable)
  }
  const menus = await prisma.menu.findMany({
    where: { branchId: await resolveMenuBranchId(branchId), isPublished: true, isOrderable: true },
    orderBy: { sortOrder: 'asc' },
    include: MENU_INCLUDE,
  })
  return menus.filter(hasVisibleContent)
})

/** Menus that exist but are not on sale, so the site can say why rather than render nothing. */
export const getUnpublishedMenuNotes = cache(async (branchId: string) => {
  if (!isDatabaseConfigured()) {
    return staticMenus()
      .filter((menu) => !menu.isPublished)
      .map((menu) => ({ name: menu.name, slug: menu.slug, staffNote: menu.staffNote }))
  }
  return prisma.menu.findMany({
    where: { branchId: await resolveMenuBranchId(branchId), isPublished: false },
    select: { name: true, slug: true, staffNote: true },
    orderBy: { sortOrder: 'asc' },
  })
})

/**
 * The catalogue the pricing engine is handed. Built fresh from the database on every checkout,
 * for the requested delivery/collection time — a cart built at 14:00 for a 21:00 slot is priced
 * against what is actually on sale at 21:00.
 */
export async function getCatalogue(
  branchId: string,
  requestedFor: Date,
  timezone: string,
): Promise<Map<string, CatalogueItem>> {
  const menus = isDatabaseConfigured()
    ? await prisma.menu.findMany({
        where: { branchId: await resolveMenuBranchId(branchId), isPublished: true },
        include: MENU_INCLUDE,
      })
    : staticMenus().filter((menu) => menu.isPublished)

  const catalogue = new Map<string, CatalogueItem>()

  for (const menu of menus) {
    const availableAtTime = isMenuAvailableAt(
      {
        daysAvailable: menu.daysAvailable,
        availableFrom: menu.availableFrom,
        availableTo: menu.availableTo,
      },
      requestedFor,
      timezone,
    )

    for (const category of menu.categories) {
      for (const item of category.items) {
        catalogue.set(item.id, {
          id: item.id,
          name: item.name,
          description: item.description,
          priceInPence: item.priceInPence,
          spiceLevel: item.spiceLevel,
          isAvailable: item.isAvailable,
          isOrderable: item.isOrderable,
          menuId: menu.id,
          menuName: menu.name,
          menuIsOrderable: menu.isOrderable,
          menuAvailableAtRequestedTime: availableAtTime,
          variants: item.variants.map((v) => ({
            id: v.id,
            name: v.name,
            priceDeltaInPence: v.priceDeltaInPence,
            isAvailable: v.isAvailable,
          })),
          modifierGroups: item.modifierGroups.map((g) => ({
            id: g.id,
            name: g.name,
            minSelect: g.minSelect,
            maxSelect: g.maxSelect,
            isRequired: g.isRequired,
            modifiers: g.modifiers.map((m) => ({
              id: m.id,
              name: m.name,
              priceInPence: m.priceInPence,
              isAvailable: m.isAvailable,
            })),
          })),
        })
      }
    }
  }

  return catalogue
}
