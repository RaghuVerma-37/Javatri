/**
 * javatri-menu.json -> normalised, seedable data.
 *
 * This module does the thinking; prisma/seed.ts does the writing and scripts/generate-docs.ts
 * does the reporting. Keeping it separate means the transform can be exercised without a
 * database, and means the seed and the client-facing documents can never drift apart — they are
 * produced from one pass over the same source.
 *
 * Three rules govern everything below:
 *
 *   1. Nothing is invented. Where the scrape says VERIFY, PRICE CONFLICT, CONFLICTING, UNKNOWN
 *      or BROKEN, the scraped value is carried through unchanged and a question is recorded.
 *   2. Notes the scraper left in `description` are staff notes, not menu copy. "PRICE CONFLICT:
 *      listed at 8.50 on the Indian Street Food menu" must never be printed under a dish.
 *   3. Allergens and dietary claims are never guessed. Both can hurt someone.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { SpiceLevel } from '../src/generated/prisma/enums'
import { poundsToPence } from '../src/lib/money'
import { parseMinutes } from '../src/lib/hours'

// ---------------------------------------------------------------------------
// Shape of the source file
// ---------------------------------------------------------------------------

type SourceItem = {
  name: string
  price: number
  description?: string
  tags?: string[]
  contains_alcohol?: boolean
  requires_variant_choice?: string[]
}

type SourceCategory = {
  id: string
  name: string
  category_note?: string
  items: SourceItem[]
}

type SourceMenu = {
  id: string
  name: string
  service_note?: string
  status?: string
  categories: SourceCategory[]
}

type SourceFile = {
  _meta: Record<string, unknown>
  business: {
    name: string
    trading_as: string
    phone: string
    branches: Array<{ id: string; name: string; address: string; is_only_bookable_branch_today: boolean }>
    opening_hours_CONFLICTING: {
      homepage_block: Record<string, string>
      menu_header_text: string
      google_business_profile: Record<string, string>
      resolution_required: string
    }
    social: Record<string, string>
    third_party_ordering: string
    banqueting: {
      capacity: number
      package_from_per_person: number
      package_includes: string[]
      event_types: string[]
    }
  }
  menus: SourceMenu[]
}

export function loadSourceFile(root = process.cwd()): SourceFile {
  const file = path.join(root, 'javatri-menu.json')
  return JSON.parse(readFileSync(file, 'utf8')) as SourceFile
}

// ---------------------------------------------------------------------------
// Output shape
// ---------------------------------------------------------------------------

export type CopyChange = {
  where: string
  from: string
  to: string
  reason: string
}

export type ClientQuestion = {
  id: string
  area: 'Hours' | 'Prices' | 'Menu content' | 'Branches' | 'Delivery' | 'Allergens' | 'Links' | 'Dietary'
  severity: 'blocker' | 'important' | 'tidy-up'
  question: string
  detail: string
  weDidThisMeanwhile: string
}

export type SeedVariant = { name: string; slug: string; priceDeltaInPence: number; sortOrder: number }

export type SeedModifierGroup = {
  name: string
  slug: string
  minSelect: number
  maxSelect: number
  isRequired: boolean
  sortOrder: number
  modifiers: Array<{ name: string; slug: string; priceInPence: number; sortOrder: number }>
}

export type SeedItem = {
  name: string
  slug: string
  description: string
  priceInPence: number
  spiceLevel: SpiceLevel
  isVegetarian: boolean
  isVegan: boolean
  containsAlcohol: boolean
  isAvailable: boolean
  isOrderable: boolean
  staffNote: string | null
  sortOrder: number
  variants: SeedVariant[]
  modifierGroups: SeedModifierGroup[]
}

export type SeedCategory = {
  name: string
  slug: string
  note: string | null
  staffNote: string | null
  sortOrder: number
  items: SeedItem[]
}

export type SeedMenu = {
  name: string
  slug: string
  description: string | null
  serviceNote: string | null
  availableFrom: number | null
  availableTo: number | null
  daysAvailable: number[]
  isPublished: boolean
  isOrderable: boolean
  staffNote: string | null
  sortOrder: number
  categories: SeedCategory[]
}

export type SeedOpeningHours = { dayOfWeek: number; opensAt: number; closesAt: number }

export type SeedBranch = {
  name: string
  slug: string
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  postcode: string | null
  phone: string | null
  latitude: number | null
  longitude: number | null
  isActive: boolean
  acceptsOrders: boolean
  acceptsDelivery: boolean
  acceptsDineIn: boolean
  acceptsReservations: boolean
  deliveryRadiusMiles: number
  minOrderInPence: number
  deliveryFeeInPence: number
  freeDeliveryAboveInPence: number | null
  notes: string | null
  sortOrder: number
  openingHours: SeedOpeningHours[]
  menus: SeedMenu[]
}

export type AllergenTodoRow = {
  menu: string
  category: string
  item: string
  priceInPence: number
  hints: string[]
}

export type TransformResult = {
  branches: SeedBranch[]
  copyChanges: CopyChange[]
  questions: ClientQuestion[]
  allergenTodo: AllergenTodoRow[]
  counts: { menus: number; categories: number; items: number; variants: number }
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[\u2018\u2019\u02bc']/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function uniqueSlug(base: string, taken: Set<string>): string {
  let slug = base || 'item'
  let n = 2
  while (taken.has(slug)) slug = `${base}-${n++}`
  taken.add(slug)
  return slug
}

/**
 * Typos the audit found on the live site. The scrape has already corrected most of them, so most
 * of these will not fire — they are here so that a re-scrape of the old site cannot quietly
 * reintroduce one, and so COPY_CHANGES.md is generated rather than hand-written.
 */
const TYPO_FIXES: Array<{ pattern: RegExp; replacement: string; reason: string }> = [
  { pattern: /\bOpennig\b/gi, replacement: 'Opening', reason: 'Spelling' },
  { pattern: /\bDrambiue\b/gi, replacement: 'Drambuie', reason: 'Brand name spelling' },
  { pattern: /\bApple Crambled\b/gi, replacement: 'Apple Crumble', reason: 'Spelling' },
  { pattern: /\bHandi Ghost\b/gi, replacement: 'Handi Gosht', reason: 'Spelling — "gosht" is meat; "ghost" is not' },
  { pattern: /\bflovoured\b/gi, replacement: 'flavoured', reason: 'Spelling' },
  { pattern: /\bsucclent\b/gi, replacement: 'succulent', reason: 'Spelling' },
  { pattern: /\bfravy\b/gi, replacement: 'gravy', reason: 'Spelling' },
  { pattern: /\bBrocolli\b/gi, replacement: 'Broccoli', reason: 'Spelling' },
  { pattern: /\bJavitri\b/g, replacement: 'Javatri', reason: 'Brand name — the site uses two spellings' },
]

function applyTypoFixes(text: string, where: string, log: CopyChange[]): string {
  let out = text
  for (const fix of TYPO_FIXES) {
    if (fix.pattern.test(out)) {
      fix.pattern.lastIndex = 0
      const before = out
      out = out.replace(fix.pattern, fix.replacement)
      log.push({ where, from: before, to: out, reason: fix.reason })
    }
    fix.pattern.lastIndex = 0
  }
  return out
}

/**
 * The scraper wrote its own annotations into `description`. Those are notes to us, not menu copy.
 * Split them out so a customer never reads "VERIFY PRICE" under their coffee.
 */
const STAFF_ANNOTATION = /^(PRICE CONFLICT|VERIFY|PRICING LOOKS WRONG|Listed on the live site|BROKEN ON LIVE SITE)/i

function splitAnnotation(description: string): { description: string; staffNote: string | null } {
  const trimmed = description.trim()
  if (!trimmed) return { description: '', staffNote: null }
  if (STAFF_ANNOTATION.test(trimmed)) return { description: '', staffNote: trimmed }
  return { description: trimmed, staffNote: null }
}

function spiceFromTags(tags: string[]): SpiceLevel {
  if (tags.includes('extra_hot')) return SpiceLevel.EXTRA_HOT
  if (tags.includes('hot')) return SpiceLevel.HOT
  if (tags.includes('mild')) return SpiceLevel.MILD
  return SpiceLevel.NONE
}

/** Categories whose own name says "vegetarian", used only to spot the scrape contradicting itself. */
function categoryClaimsVegetarian(name: string): boolean {
  return /\(veg\)|vegetarian|paneer/i.test(name) && !/non-?veg/i.test(name)
}

// ---------------------------------------------------------------------------
// Defaults that do not exist anywhere in the source, and are flagged as such
// ---------------------------------------------------------------------------

/**
 * The old site has no delivery of its own — delivery runs through Just Eat — so there is no
 * radius, minimum or fee to carry over. These are placeholders chosen to be unremarkable for a
 * Berkshire village Indian restaurant. Every one of them is in QUESTIONS_FOR_CLIENT.md and every
 * one is editable in /admin without a developer.
 */
export const DELIVERY_PLACEHOLDERS = {
  deliveryRadiusMiles: 4,
  minOrderInPence: 2000,
  deliveryFeeInPence: 349,
  freeDeliveryAboveInPence: 4500,
} as const

/** Verified against postcodes.io for SL6 3RX on 2026-09-05. */
export const LITTLEWICK_GREEN_LATLNG = { latitude: 51.513299, longitude: -0.804387 } as const

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

// ---------------------------------------------------------------------------
// The transform
// ---------------------------------------------------------------------------

export function transform(source: SourceFile): TransformResult {
  const copyChanges: CopyChange[] = []
  const questions: ClientQuestion[] = []
  const allergenTodo: AllergenTodoRow[] = []

  // --- hours ---------------------------------------------------------------
  // Three published sets disagree. We seed the homepage block: it is the most granular, it is
  // published on the restaurant's own site, and it is the one a customer is most likely to have
  // read. The disagreement is a blocker question, not something to average out.
  const homepage = source.business.opening_hours_CONFLICTING.homepage_block
  const openingHours: SeedOpeningHours[] = DAY_KEYS.flatMap((key, dayOfWeek) => {
    const value = homepage[key]
    if (!value || value.toLowerCase() === 'closed') return []
    const [open, close] = value.split('-')
    return [{ dayOfWeek, opensAt: parseMinutes(open), closesAt: parseMinutes(close) }]
  })

  questions.push({
    id: 'hours-conflict',
    area: 'Hours',
    severity: 'blocker',
    question: 'Which set of opening hours is correct?',
    detail: [
      'Three different sets are published right now:',
      `  • Homepage block: Mon–Thu ${homepage.mon}, Fri ${homepage.fri}, Sat ${homepage.sat}, Sun ${homepage.sun}`,
      `  • Menu header text: ${source.business.opening_hours_CONFLICTING.menu_header_text}`,
      '  • Google Business Profile: Mon 12:00–20:00, Tue–Fri 15:00–22:00, Sat 12:00–22:00, Sun 12:00–22:00',
      'The homepage and Google disagree about Monday and Sunday. The menu header and the homepage',
      'disagree about Sunday closing (22:00 vs 20:00).',
      'This is a blocker because the ordering system refuses orders outside opening hours — wrong',
      'hours means turning away money, or taking orders the kitchen is not there to cook.',
    ].join('\n'),
    weDidThisMeanwhile:
      'Seeded the homepage block. Staff can correct it at /admin/hours in under a minute — no developer needed. Please also update the Google Business Profile to match, since that is what most people actually see.',
  })

  // --- branches ------------------------------------------------------------
  const littlewick = source.business.branches.find((b) => b.id === 'littlewick-green')
  const farnham = source.business.branches.find((b) => b.id === 'farnham-common')

  const menus = buildMenus(source, copyChanges, questions, allergenTodo)

  const branches: SeedBranch[] = [
    {
      name: 'Javatri at The Bell and Bottle',
      slug: 'littlewick-green',
      addressLine1: 'The Bell and Bottle, Bath Road',
      addressLine2: 'Littlewick Green',
      city: 'Maidenhead',
      postcode: 'SL6 3RX',
      phone: source.business.phone,
      latitude: LITTLEWICK_GREEN_LATLNG.latitude,
      longitude: LITTLEWICK_GREEN_LATLNG.longitude,
      isActive: true,
      acceptsOrders: true,
      acceptsDelivery: true,
      acceptsDineIn: true,
      acceptsReservations: true,
      ...DELIVERY_PLACEHOLDERS,
      notes: littlewick?.address ?? null,
      sortOrder: 0,
      openingHours,
      menus,
    },
    {
      // Advertised on the old homepage and in the banqueting branch dropdown with no address,
      // no phone and no hours. Seeded inactive so it cannot be selected for anything, exactly as
      // the brief requires, but present so the client can fill it in rather than being rebuilt for.
      name: 'Javatri Farnham Common',
      slug: 'farnham-common',
      addressLine1: null,
      addressLine2: null,
      city: 'Farnham Common',
      postcode: null,
      phone: null,
      latitude: null,
      longitude: null,
      isActive: false,
      acceptsOrders: false,
      acceptsDelivery: false,
      acceptsDineIn: false,
      acceptsReservations: false,
      ...DELIVERY_PLACEHOLDERS,
      notes: farnham?.address ?? 'No address, phone or hours published anywhere.',
      sortOrder: 1,
      openingHours: [],
      menus: [],
    },
  ]

  questions.push(
    {
      id: 'farnham-common',
      area: 'Branches',
      severity: 'important',
      question: 'Is Javatri Farnham Common open, and what are its address, phone and hours?',
      detail:
        'The old site advertises it on the homepage and offers it in the banqueting enquiry form, but publishes no address, no phone number and no opening hours, and it cannot be selected for ordering or booking. A customer who picks it in the form has no way to find it.',
      weDidThisMeanwhile:
        'Seeded as an inactive branch. It does not appear as an option anywhere on the new site. Send us the details and it can be switched on in /admin without a rebuild — the schema already supports multiple branches.',
    },
    {
      id: 'delivery-terms',
      area: 'Delivery',
      severity: 'blocker',
      question: 'What are your delivery radius, minimum order, delivery fee and free-delivery threshold?',
      detail:
        'The old site has no delivery of its own — delivery goes through Just Eat — so there was nothing to carry over. These four numbers decide whether a delivery order is profitable, so we are not guessing them for you.',
      weDidThisMeanwhile: `Seeded placeholders: ${DELIVERY_PLACEHOLDERS.deliveryRadiusMiles} mile radius, £${(
        DELIVERY_PLACEHOLDERS.minOrderInPence / 100
      ).toFixed(2)} minimum, £${(DELIVERY_PLACEHOLDERS.deliveryFeeInPence / 100).toFixed(
        2,
      )} fee, free over £${(DELIVERY_PLACEHOLDERS.freeDeliveryAboveInPence / 100).toFixed(
        2,
      )}. All four are editable at /admin/branch. If you would rather not do your own delivery at all, switch delivery off there and the site offers collection and dine-in only.`,
    },
    {
      id: 'tiktok-link',
      area: 'Links',
      severity: 'tidy-up',
      question: 'Do you have a TikTok profile?',
      detail: `The TikTok icon on the old site links to ${source.business.social.tiktok_BROKEN}, which is a search results page for "javitri" — a misspelling of your own name — not a profile.`,
      weDidThisMeanwhile:
        'Left TikTok out of the new footer rather than shipping a broken icon. Send us the profile URL and it goes back in.',
    },
    {
      id: 'just-eat',
      area: 'Links',
      severity: 'important',
      question: 'Do you want to keep the Just Eat listing now that ordering works directly?',
      detail: `You currently also sell through ${source.business.third_party_ordering}. Every order placed there costs you commission; the same order placed on this site costs you Stripe's fee and nothing else.`,
      weDidThisMeanwhile:
        'Not linked from the new site. Direct ordering is the primary call to action everywhere. Tell us if you want the Just Eat link back as a secondary option.',
    },
    {
      id: 'allergens',
      area: 'Allergens',
      severity: 'blocker',
      question: 'We need the 14 FSA allergens for every dish before launch.',
      detail:
        'There is no allergen information anywhere on the current site. Under assimilated Regulation (EU) 1169/2011 this information has to be available for every dish sold, and for distance selling it has to be available both before the order is placed and again when it is delivered.',
      weDidThisMeanwhile:
        'Built the whole allergen system — a field on every dish, a filter on the menu, a display on every dish card, and the standard notice on the menu and at checkout — and left the data empty, because guessing an allergen is dangerous. Until an item is confirmed the site says "allergen information not yet confirmed, please call us", which is honest rather than reassuring. ALLERGEN_TODO.md is the list to work through; it can be filled in at /admin/menu.',
    },
  )

  const counts = {
    menus: menus.length,
    categories: menus.reduce((n, m) => n + m.categories.length, 0),
    items: menus.reduce((n, m) => n + m.categories.reduce((k, c) => k + c.items.length, 0), 0),
    variants: menus.reduce(
      (n, m) => n + m.categories.reduce((k, c) => k + c.items.reduce((v, i) => v + i.variants.length, 0), 0),
      0,
    ),
  }

  return { branches, copyChanges, questions, allergenTodo, counts }
}

// ---------------------------------------------------------------------------

/**
 * A spice preference is the one modifier group we add that the source does not contain. It costs
 * nothing, it uses the restaurant's own spice vocabulary rather than an invented one, and it is
 * flagged for sign-off. Everything else in the modifier system ships empty and is filled in by
 * staff — inventing an upsell menu with invented prices would be making up the client's business.
 */
function spicePreferenceGroup(sortOrder: number): SeedModifierGroup {
  return {
    name: 'Spice preference',
    slug: 'spice-preference',
    minSelect: 0,
    maxSelect: 1,
    isRequired: false,
    sortOrder,
    modifiers: [
      { name: 'As the kitchen makes it', slug: 'as-standard', priceInPence: 0, sortOrder: 0 },
      { name: 'Mild', slug: 'mild', priceInPence: 0, sortOrder: 1 },
      { name: 'Hot', slug: 'hot', priceInPence: 0, sortOrder: 2 },
      { name: 'Extra hot', slug: 'extra-hot', priceInPence: 0, sortOrder: 3 },
    ],
  }
}

const SPICE_CHOICE_CATEGORIES = new Set([
  'lamb',
  'chicken',
  'vegetarian-delights',
  'paneer',
  'lentils',
  'seafood',
  'biryani',
])

function buildMenus(
  source: SourceFile,
  copyChanges: CopyChange[],
  questions: ClientQuestion[],
  allergenTodo: AllergenTodoRow[],
): SeedMenu[] {
  const menus: SeedMenu[] = []
  const menuSlugs = new Set<string>()
  const priceIndex = new Map<string, Array<{ menu: string; pence: number }>>()

  source.menus.forEach((sourceMenu, menuIndex) => {
    const broken = typeof sourceMenu.status === 'string' && sourceMenu.status.startsWith('BROKEN')
    const menuName = applyTypoFixes(sourceMenu.name, `menu "${sourceMenu.name}"`, copyChanges)
    const menuSlug = uniqueSlug(slugify(sourceMenu.id || menuName), menuSlugs)

    const categorySlugs = new Set<string>()
    const categories: SeedCategory[] = sourceMenu.categories.map((sourceCategory, categoryIndex) => {
      const categoryName = applyTypoFixes(
        sourceCategory.name,
        `category "${sourceCategory.name}"`,
        copyChanges,
      )
      const categoryNote = sourceCategory.category_note ?? ''
      const split = splitAnnotation(categoryNote)

      const itemSlugs = new Set<string>()
      const items: SeedItem[] = sourceCategory.items.map((sourceItem, itemIndex) => {
        const where = `${menuName} › ${categoryName} › ${sourceItem.name}`
        const name = applyTypoFixes(sourceItem.name, where, copyChanges)

        // The scraper documented what the live site says. Record it as a copy change so the
        // owner can see exactly what we corrected without diffing two sites by hand.
        const liveTypo = /Listed on the live site as '([^']+)' - typo\./.exec(sourceItem.description ?? '')
        if (liveTypo) {
          copyChanges.push({
            where,
            from: liveTypo[1],
            to: name,
            reason: 'Spelling — corrected from the live site',
          })
        }

        // Split the annotation off the RAW text first. Running the typo fixer over
        // "Listed on the live site as 'Apple Crambled'" would correct the very misspelling the
        // note exists to record, and the owner would lose the evidence for the change.
        const rawSplit = splitAnnotation(sourceItem.description ?? '')
        const description = applyTypoFixes(rawSplit.description, where, copyChanges)
        const staffNote = rawSplit.staffNote

        const tags = sourceItem.tags ?? []
        const isVegan = tags.includes('vegan')
        // A vegan dish is vegetarian by definition. That is entailment, not a guess.
        const isVegetarian = isVegan || tags.includes('vegetarian')

        if (categoryClaimsVegetarian(categoryName) && !isVegetarian) {
          questions.push({
            id: `diet-${menuSlug}-${slugify(categoryName)}-${slugify(name)}`,
            area: 'Dietary',
            severity: 'important',
            question: `Is "${name}" vegetarian?`,
            detail: `It sits in "${categoryName}", which reads as a vegetarian section, but the live site carries no vegetarian tag on the dish itself. The two contradict each other.`,
            weDidThisMeanwhile:
              'Seeded exactly what the site says — no vegetarian tag — because labelling a dish vegetarian when it is not is as serious as getting an allergen wrong. It will not appear under the "Vegetarian" filter until you confirm it.',
          })
        }

        const priceInPence = poundsToPence(sourceItem.price)
        const key = slugify(name)
        priceIndex.set(key, [...(priceIndex.get(key) ?? []), { menu: menuName, pence: priceInPence }])

        const variants: SeedVariant[] = (sourceItem.requires_variant_choice ?? []).map(
          (variantName, i) => ({
            name: variantName,
            slug: slugify(variantName),
            // The source gives one price for the dish whichever option is chosen.
            priceDeltaInPence: 0,
            sortOrder: i,
          }),
        )

        const modifierGroups: SeedModifierGroup[] =
          !broken && SPICE_CHOICE_CATEGORIES.has(sourceCategory.id) ? [spicePreferenceGroup(0)] : []

        if (!broken) {
          allergenTodo.push({
            menu: menuName,
            category: categoryName,
            item: name,
            priceInPence,
            hints: buildAllergenHints(name, description, tags),
          })
        }

        return {
          name,
          slug: uniqueSlug(slugify(name), itemSlugs),
          description,
          priceInPence,
          spiceLevel: spiceFromTags(tags),
          isVegetarian,
          isVegan,
          containsAlcohol: sourceItem.contains_alcohol === true,
          isAvailable: true,
          // A menu recovered from a search-engine cache must not be sellable.
          isOrderable: !broken,
          staffNote,
          sortOrder: itemIndex,
          variants,
          modifierGroups,
        }
      })

      return {
        name: categoryName,
        slug: uniqueSlug(slugify(sourceCategory.id || categoryName), categorySlugs),
        note: split.description || null,
        staffNote: split.staffNote,
        sortOrder: categoryIndex,
        items,
      }
    })

    // A menu "service note" that simply restates the opening hours is a second copy of the
    // hours — precisely the duplication that let the old site publish three different answers.
    // It is dropped so the OpeningHours table is the only place hours are written down.
    const restatesHours = /^Served /i.test(sourceMenu.service_note ?? '')
    if (restatesHours) {
      copyChanges.push({
        where: `menu "${menuName}"`,
        from: sourceMenu.service_note ?? '',
        to: '(removed — the menu page now reads the opening hours from one place)',
        reason: 'Removed a second, hand-typed copy of the opening hours. It already disagreed with the homepage about Sunday.',
      })
    }
    const noDescriptions = /^No item descriptions/i.test(sourceMenu.service_note ?? '')
    if (noDescriptions) {
      questions.push({
        id: `descriptions-${menuSlug}`,
        area: 'Menu content',
        severity: 'important',
        question: `Would you like descriptions written for the ${menuName} dishes?`,
        detail:
          'The live site publishes these dishes as bare names and prices, with no descriptions at all, while every dish on the main food menu has one. A dosa with a sentence under it sells better than a dosa without.',
        weDidThisMeanwhile:
          'Seeded them with no description rather than writing copy and putting words in your mouth. They render cleanly without one, and descriptions can be added at /admin/menu at any time.',
      })
    }

    menus.push({
      name: menuName,
      slug: menuSlug,
      description: null,
      serviceNote: null,
      // The food menu's stated service window is simply "whenever we are open", so it carries no
      // window of its own rather than a duplicate of the branch hours that could drift from them.
      availableFrom: null,
      availableTo: null,
      daysAvailable: [],
      // The two menus the old site lost are seeded unpublished. Half a bar list recovered from a
      // search cache, with unverified prices, is worse than an honest "ask us".
      isPublished: !broken,
      isOrderable: !broken,
      staffNote: broken ? sourceMenu.status ?? null : null,
      sortOrder: menuIndex,
      categories,
    })

    if (broken) {
      questions.push({
        id: `broken-menu-${menuSlug}`,
        area: 'Menu content',
        severity: 'blocker',
        question: `Please re-supply the ${menuName}.`,
        detail: `${sourceMenu.status}\nGoogle still has this menu indexed with prices, so people search for it, click through and land on a blank page.`,
        weDidThisMeanwhile:
          'Seeded unpublished so nothing half-recovered goes on sale, and 301-redirected the old indexed URL to /menu so those visitors land on a working menu instead of an empty page. Send the list and it can be published from /admin.',
      })
    }
  })

  // --- price conflicts, found rather than assumed ---------------------------
  for (const [key, entries] of priceIndex) {
    const distinct = new Set(entries.map((e) => e.pence))
    if (distinct.size <= 1) continue
    const name = key.replace(/-/g, ' ')
    questions.push({
      id: `price-conflict-${key}`,
      area: 'Prices',
      severity: 'blocker',
      question: `What is the correct price for ${name}?`,
      detail: entries
        .map((e) => `  • £${(e.pence / 100).toFixed(2)} on the ${e.menu}`)
        .join('\n'),
      weDidThisMeanwhile:
        'Both prices were seeded as scraped, on their respective menus, so nothing was silently changed. This is exactly the failure the old two-copies-of-the-menu setup produced; on the new site there is one row per dish, so once you tell us the price it can only be right or wrong in one place.',
    })
  }

  return menus
}

/**
 * Hints for the person filling in ALLERGEN_TODO.md. Deliberately phrased as questions about
 * ingredients that are usually present in a dish of this kind, and deliberately NOT written into
 * the database. A hint is a prompt for a human; it is not a declaration.
 */
function buildAllergenHints(name: string, description: string, tags: string[]): string[] {
  const haystack = `${name} ${description} ${tags.join(' ')}`.toLowerCase()
  const hints: string[] = []
  const ask = (re: RegExp, hint: string) => {
    if (re.test(haystack)) hints.push(hint)
  }
  ask(/naan|parantha|paratha|roti|puri|bhature|samosa|pakora|pakoda|batter|gram flour|noodle|dosa|bread|cake|crumble|pie|cheesecake|gateau|brownie|momo|spring roll|chowmein|pav|upma|vada|uttapam/, 'gluten?')
  ask(/yoghurt|yogurt|curd|cream|malai|paneer|butter|cheese|kulfi|ice cream|milk|raita|korma|cheesecake|latte|cappuccino|chocolate/, 'milk?')
  ask(/nut|almond|badami|cashew|peshwari|korma|malai|kulfi|halwa/, 'nuts / peanuts?')
  ask(/prawn|fish|squid|salmon|sea food|seafood|jhinga|moliee/, 'fish / crustaceans / molluscs?')
  ask(/egg|mayonnaise|meringue|cake|brownie|gateau/, 'egg?')
  ask(/mustard/, 'mustard?')
  ask(/sesame|til/, 'sesame?')
  ask(/soya|soy|manchurian|chowmein|hakka|noodle|chilli chicken|chilli paneer/, 'soya?')
  ask(/celery|stock/, 'celery?')
  ask(/wine|beer|cider|liqueur|rum|bailey|amaretto|drambuie|tia maria|southern comfort/, 'sulphites?')
  return hints
}
