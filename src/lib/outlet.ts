/**
 * Shared vocabulary for the outlet chooser.
 *
 * A cookie rather than localStorage, because the choice has to change what the *server* renders —
 * the menu, the hours, the delivery radius, the phone number on the contact page. localStorage is
 * invisible to a server component, so a choice kept only there would change the header and
 * nothing else, which is the kind of half-working that this rebuild exists to get rid of.
 */
export const OUTLET_COOKIE = 'javatri_outlet'

/** A year: long enough that a regular never sees the chooser twice. */
export const OUTLET_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

/**
 * The photograph shown for each outlet on the chooser.
 *
 * Keyed by slug with a fallback, so a new outlet added in /admin gets a sensible picture rather
 * than an empty card. These are stock interiors, not photographs of these rooms — see the note in
 * the README about replacing them.
 */
const OUTLET_IMAGES: Record<string, string> = {
  'littlewick-green': '/img/dining-room.webp',
  'farnham-common': '/img/evening.webp',
}

export function outletImage(slug: string): string {
  return OUTLET_IMAGES[slug] ?? '/img/hall.webp'
}

/**
 * The county an outlet sits in.
 *
 * A lookup rather than a column, deliberately: adding `region` to Branch means a migration
 * against the live database, and this is two rows of data that have never changed. If a third
 * outlet ever appears, that is the moment to make it a real field — see the note in the README.
 */
const OUTLET_REGIONS: Record<string, string> = {
  'littlewick-green': 'Berkshire',
  'farnham-common': 'Buckinghamshire',
}

export function outletRegion(slug: string): string | null {
  return OUTLET_REGIONS[slug] ?? null
}

/**
 * What people call the place: "Littlewick Green", not "Javatri at The Bell and Bottle".
 *
 * The card leads with this because it is the thing a customer is choosing between — the two
 * outlets share a brand and differ by where they are.
 */
export function outletLocality(branch: {
  slug: string
  name: string
  addressLine2?: string | null
  city?: string | null
}): string {
  return branch.addressLine2 ?? branch.city ?? branch.name
}

/** "The Bell and Bottle, Bath Road · Littlewick Green, Maidenhead · SL6 3RX" */
export function outletAddress(branch: {
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
  postcode?: string | null
}): string {
  return [
    branch.addressLine1,
    [branch.addressLine2, branch.city].filter(Boolean).join(', ') || null,
    branch.postcode,
  ]
    .filter(Boolean)
    .join(' · ')
}

/**
 * What you can actually do at an outlet, in one line.
 *
 * Delivery is the one that matters to somebody choosing: an outlet that only does collection is a
 * drive, and finding that out after picking it is the kind of dead end this rebuild exists to
 * remove. So it is stated on the choice itself rather than discovered at checkout.
 */
export function outletServices(outlet: {
  acceptsOrders: boolean
  acceptsDelivery: boolean
  deliveryRadiusMiles: number
}): { label: string; delivers: boolean } {
  if (outlet.acceptsDelivery) {
    return {
      label: `Collection and delivery within ${outlet.deliveryRadiusMiles} miles`,
      delivers: true,
    }
  }
  if (outlet.acceptsOrders) return { label: 'Collection only — no delivery', delivers: false }
  return { label: 'Dining in and events only', delivers: false }
}
