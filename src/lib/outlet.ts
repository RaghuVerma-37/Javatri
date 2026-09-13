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

type AddressFields = {
  slug: string
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
  postcode?: string | null
}

type NamedAddress = AddressFields & { name: string }

/** A blank or whitespace-only field is a missing field. */
const clean = (value?: string | null) => value?.trim() || null

/**
 * What people call the place: "Littlewick Green", not "Javatri at The Bell and Bottle".
 *
 * The card leads with this because it is the thing a customer is choosing between — the two
 * outlets share a brand and differ by where they are.
 */
export function outletLocality(branch: NamedAddress): string {
  return clean(branch.addressLine2) ?? clean(branch.city) ?? branch.name
}

/**
 * The trading name, with the place added only when the name does not already say it:
 * "Javatri at The Bell and Bottle, Littlewick Green", but "Javatri Farnham Common" — not
 * "Javatri Farnham Common, Farnham Common".
 */
export function outletTitle(branch: NamedAddress): string {
  const place = outletLocality(branch)
  return branch.name.toLowerCase().includes(place.toLowerCase()) ? branch.name : `${branch.name}, ${place}`
}

/** "Littlewick Green, Maidenhead" — a town that repeats the locality is said once. */
function localityLine(branch: AddressFields): string | null {
  const parts = [clean(branch.addressLine2), clean(branch.city)].filter((part): part is string => part !== null)
  const unique = parts.filter(
    (part, index) => parts.findIndex((other) => other.toLowerCase() === part.toLowerCase()) === index,
  )
  return unique.join(', ') || null
}

/**
 * An outlet's address as lines, built only from the parts that exist.
 *
 *   Littlewick Green   The Bell and Bottle, Bath Road / Littlewick Green, Maidenhead / SL6 3RX
 *   Farnham Common     Farnham Common, Buckinghamshire
 *
 * Without a postcode an address does not pin a place down, so the county is added to say where
 * it is. Nothing is ever printed for a missing part — no empty line, no stray comma.
 */
export function outletAddressLines(branch: AddressFields): string[] {
  const street = clean(branch.addressLine1)
  const locality = localityLine(branch)
  const postcode = clean(branch.postcode)
  const lines: string[] = []

  if (street) lines.push(street)
  if (postcode) {
    if (locality) lines.push(locality)
    lines.push(postcode)
  } else {
    const place = [locality, outletRegion(branch.slug)].filter(Boolean).join(', ')
    if (place) lines.push(place)
  }

  return lines
}

/** The same address on one line: "The Bell and Bottle, Bath Road, Littlewick Green, Maidenhead, SL6 3RX". */
export function outletAddress(branch: AddressFields): string {
  return outletAddressLines(branch).join(', ')
}

/** Town and postcode where there is a postcode, otherwise the place: "Maidenhead, SL6 3RX". */
export function outletShortAddress(branch: AddressFields): string {
  const postcode = clean(branch.postcode)
  if (postcode) return [clean(branch.city) ?? localityLine(branch), postcode].filter(Boolean).join(', ')
  return outletAddressLines(branch).at(-1) ?? ''
}

/**
 * Directions in Google Maps. A street and postcode is the most exact destination there is; without
 * them, the trading name and the place, which Maps resolves to the restaurant or the village.
 */
export function outletMapsUrl(branch: NamedAddress): string {
  const street = clean(branch.addressLine1)
  const postcode = clean(branch.postcode)
  const destination =
    street && postcode ? `${street}, ${postcode}` : [branch.name, outletAddress(branch)].filter(Boolean).join(', ')
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
}

type OutletWords = {
  /** The second line of the homepage headline, a word at a time: "on the Bath Road". */
  heroPlace: string[]
  /** The paragraph under the homepage headline. */
  heroLead: string
  /** The heading of the homepage's "Find us" section. */
  findUsTitle: string
  findUsLead: string | null
  /** The line under "Find us" on /contact. */
  contactLead: string | null
  /** The sentence under the name in the footer. */
  footerBlurb: string
}

/*
  Directions written by hand, for the outlet they describe and no other. An outlet without an entry
  here gets wording built from its own locality and county — never another outlet's road or
  motorway junction.
*/
const OUTLET_WORDS: Record<string, OutletWords> = {
  'littlewick-green': {
    heroPlace: ['on', 'the', 'Bath', 'Road'],
    heroLead:
      'Chaat, charcoal and slow-cooked curries in a Berkshire village pub. Collect it, have it delivered, book a table — or fill the banqueting hall with a hundred and fifty guests.',
    findUsTitle: 'On the Bath Road, five minutes from the M4',
    findUsLead: 'The Bell and Bottle sits on the A4 between Maidenhead and Knowl Hill, with parking outside.',
    contactLead:
      'On the A4 between Maidenhead and Knowl Hill, about five minutes from junction 8/9 of the M4, with parking outside.',
    footerBlurb: 'Indian kitchen and banqueting hall at The Bell and Bottle, on the Bath Road in Littlewick Green.',
  },
}

export function outletWords(branch: NamedAddress): OutletWords {
  const written = OUTLET_WORDS[branch.slug]
  if (written) return written
  const locality = outletLocality(branch)
  const place = [locality, outletRegion(branch.slug)].filter(Boolean).join(', ')
  return {
    heroPlace: ['in', ...locality.split(/\s+/)],
    // Only what every open outlet offers. Delivery and the banqueting hall are claims to write
    // into an entry above once they are true of the outlet, not to assume.
    heroLead: `Chaat, charcoal and slow-cooked curries in ${place}. Order online for collection, or book a table.`,
    findUsTitle: `In ${place}`,
    findUsLead: null,
    contactLead: null,
    footerBlurb: `Indian kitchen in ${place}.`,
  }
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
