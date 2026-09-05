import 'server-only'
import {
  DELIVERY_PLACEHOLDERS,
  transform,
  type SeedBranch,
  type SeedMenu,
} from '../../prisma/source-data'
// Imported rather than read from disk on purpose. `readFileSync(path.join(process.cwd(), …))` is
// not statically analysable, so Next's output file tracing would not know to bundle the JSON and
// this would work locally and 500 on the first serverless request. An import is traced.
import sourceJson from '../../javatri-menu.json'
import type { BranchWithHours } from '@/server/branch'
import type { MenuWithContent } from '@/server/menu'

/**
 * The site, without a database.
 *
 * When DATABASE_URL is absent — a first deploy, a preview, a clone somebody wants to look at —
 * the read-only half of the site is served straight from `javatri-menu.json` through the same
 * transform the seed uses. Menus, filters, the basket and server-side pricing all work exactly as
 * they do against Postgres, because they are handed the same shapes.
 *
 * What deliberately does NOT work is anything that has to remember something: checkout, bookings,
 * event enquiries and the admin area. Those say so plainly rather than pretending. The moment a
 * DATABASE_URL appears, every one of them starts working with no code change — this is a fallback
 * in the data-access layer, not a second implementation of the site.
 *
 * Ids are derived from slugs rather than generated, so they are stable across requests and across
 * server instances. A basket built in demo mode still prices correctly on the next request.
 */

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL)
}

const NOW = new Date('2026-09-05T00:00:00.000Z')

let cache: { branch: BranchWithHours; menus: MenuWithContent[] } | null = null

function build() {
  if (cache) return cache

  const { branches } = transform(sourceJson as unknown as Parameters<typeof transform>[0])
  const source = branches.find((b) => b.slug === 'littlewick-green') ?? branches[0]

  const branch = toBranch(source)
  const menus = source.menus.map((menu) => toMenu(branch.id, menu))

  cache = { branch, menus }
  return cache
}

export function staticBranch(): BranchWithHours {
  return build().branch
}

/** Every menu, published or not — callers filter, exactly as they do against the database. */
export function staticMenus(): MenuWithContent[] {
  return build().menus
}

// ---------------------------------------------------------------------------
// Shaping
// ---------------------------------------------------------------------------

function toBranch(source: SeedBranch): BranchWithHours {
  const id = `branch:${source.slug}`
  return {
    id,
    name: source.name,
    slug: source.slug,
    addressLine1: source.addressLine1,
    addressLine2: source.addressLine2,
    city: source.city,
    postcode: source.postcode,
    phone: source.phone,
    email: null,
    latitude: source.latitude,
    longitude: source.longitude,
    isActive: source.isActive,
    // The basket, the slot picker, the delivery check and the server-side pricing all work in
    // this mode — they are pure functions over the same data. The wall is at checkout, where an
    // order would have to be *stored*, and /order/checkout says so in as many words.
    acceptsOrders: true,
    acceptsDelivery: source.acceptsDelivery,
    acceptsDineIn: source.acceptsDineIn,
    acceptsReservations: source.acceptsReservations,
    deliveryRadiusMiles: DELIVERY_PLACEHOLDERS.deliveryRadiusMiles,
    minOrderInPence: DELIVERY_PLACEHOLDERS.minOrderInPence,
    deliveryFeeInPence: DELIVERY_PLACEHOLDERS.deliveryFeeInPence,
    freeDeliveryAboveInPence: DELIVERY_PLACEHOLDERS.freeDeliveryAboveInPence,
    pickupLeadMinutes: 25,
    deliveryLeadMinutes: 45,
    lastOrderMinutesBeforeClose: 30,
    slotIntervalMinutes: 15,
    timezone: 'Europe/London',
    notes: source.notes,
    sortOrder: source.sortOrder,
    createdAt: NOW,
    updatedAt: NOW,
    openingHours: source.openingHours.map((hours, index) => ({
      id: `hours:${source.slug}:${index}`,
      branchId: id,
      dayOfWeek: hours.dayOfWeek,
      opensAt: hours.opensAt,
      closesAt: hours.closesAt,
    })),
    holidays: [],
  }
}

function toMenu(branchId: string, source: SeedMenu): MenuWithContent {
  const menuId = `menu:${source.slug}`

  return {
    id: menuId,
    branchId,
    name: source.name,
    slug: source.slug,
    description: source.description,
    serviceNote: source.serviceNote,
    availableFrom: source.availableFrom,
    availableTo: source.availableTo,
    daysAvailable: source.daysAvailable,
    sortOrder: source.sortOrder,
    isPublished: source.isPublished,
    isOrderable: source.isOrderable,
    staffNote: source.staffNote,
    createdAt: NOW,
    updatedAt: NOW,
    categories: source.categories.map((category) => {
      const categoryId = `cat:${source.slug}:${category.slug}`
      return {
        id: categoryId,
        menuId,
        name: category.name,
        slug: category.slug,
        note: category.note,
        staffNote: category.staffNote,
        sortOrder: category.sortOrder,
        items: category.items.map((item) => {
          const itemId = `item:${source.slug}:${category.slug}:${item.slug}`
          return {
            id: itemId,
            categoryId,
            name: item.name,
            slug: item.slug,
            description: item.description,
            priceInPence: item.priceInPence,
            spiceLevel: item.spiceLevel,
            isVegetarian: item.isVegetarian,
            isVegan: item.isVegan,
            containsAlcohol: item.containsAlcohol,
            allergens: [],
            // Never true here. Allergen data is entered by the kitchen and stored in the
            // database; without one there is nothing confirmed, and the UI must say so.
            allergensConfirmed: false,
            imageUrl: null,
            isAvailable: item.isAvailable,
            isOrderable: item.isOrderable,
            sortOrder: item.sortOrder,
            staffNote: item.staffNote,
            createdAt: NOW,
            updatedAt: NOW,
            variants: item.variants.map((variant, index) => ({
              id: `var:${itemId}:${variant.slug}`,
              itemId,
              name: variant.name,
              slug: variant.slug,
              priceDeltaInPence: variant.priceDeltaInPence,
              isDefault: index === 0,
              isAvailable: true,
              sortOrder: variant.sortOrder,
            })),
            modifierGroups: item.modifierGroups.map((group) => {
              const groupId = `grp:${itemId}:${group.slug}`
              return {
                id: groupId,
                itemId,
                name: group.name,
                slug: group.slug,
                minSelect: group.minSelect,
                maxSelect: group.maxSelect,
                isRequired: group.isRequired,
                sortOrder: group.sortOrder,
                modifiers: group.modifiers.map((modifier) => ({
                  id: `mod:${groupId}:${modifier.slug}`,
                  groupId,
                  name: modifier.name,
                  slug: modifier.slug,
                  priceInPence: modifier.priceInPence,
                  isAvailable: true,
                  sortOrder: modifier.sortOrder,
                })),
              }
            }),
          }
        }),
      }
    }),
  }
}
