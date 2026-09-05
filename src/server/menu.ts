import { cache } from 'react'
import { prisma } from '@/lib/db'
import { isMenuAvailableAt } from '@/lib/hours'
import type { CatalogueItem } from '@/lib/pricing'
import { isDatabaseConfigured, staticMenus } from '@/server/static-data'

const MENU_INCLUDE = {
  categories: {
    orderBy: { sortOrder: 'asc' },
    include: {
      items: {
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
export const getPublishedMenus = cache(async (branchId: string) => {
  if (!isDatabaseConfigured()) return staticMenus().filter((menu) => menu.isPublished)
  return prisma.menu.findMany({
    where: { branchId, isPublished: true },
    orderBy: { sortOrder: 'asc' },
    include: MENU_INCLUDE,
  })
})

/**
 * Anchored to the Prisma query rather than to `getPublishedMenus`.
 *
 * `getPublishedMenus` can now return the file-backed fallback, which is itself typed as
 * `MenuWithContent` — inferring the type from that function would be circular, and TypeScript
 * resolves a circular inference to `any`, silently deleting the type safety of every menu
 * component. This private query is the one true shape.
 */
const menusQuery = (branchId: string) =>
  prisma.menu.findMany({ where: { branchId }, include: MENU_INCLUDE })

export type MenuWithContent = Awaited<ReturnType<typeof menusQuery>>[number]
export type CategoryWithItems = MenuWithContent['categories'][number]
export type ItemWithOptions = CategoryWithItems['items'][number]

export const getMenuBySlug = cache(async (branchId: string, slug: string) => {
  if (!isDatabaseConfigured()) {
    return staticMenus().find((menu) => menu.slug === slug && menu.isPublished) ?? null
  }
  return prisma.menu.findFirst({
    where: { branchId, slug, isPublished: true },
    include: MENU_INCLUDE,
  })
})

export const getOrderableMenus = cache(async (branchId: string) => {
  if (!isDatabaseConfigured()) {
    return staticMenus().filter((menu) => menu.isPublished && menu.isOrderable)
  }
  return prisma.menu.findMany({
    where: { branchId, isPublished: true, isOrderable: true },
    orderBy: { sortOrder: 'asc' },
    include: MENU_INCLUDE,
  })
})

/** Menus that exist but are not on sale, so the site can say why rather than render nothing. */
export const getUnpublishedMenuNotes = cache(async (branchId: string) => {
  if (!isDatabaseConfigured()) {
    return staticMenus()
      .filter((menu) => !menu.isPublished)
      .map((menu) => ({ name: menu.name, slug: menu.slug, staffNote: menu.staffNote }))
  }
  return prisma.menu.findMany({
    where: { branchId, isPublished: false },
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
    ? await prisma.menu.findMany({ where: { branchId, isPublished: true }, include: MENU_INCLUDE })
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
