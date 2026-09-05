import type { Metadata } from 'next'
import Link from 'next/link'
import { Check, MapPin, Phone, Users } from 'lucide-react'
import { DishMarquee } from '@/components/home/dish-marquee'
import { Hero } from '@/components/home/hero'
import { TiltCard } from '@/components/home/tilt-card'
import { ButtonLink, SectionHeading } from '@/components/ui'
import { JsonLd, restaurantSchema } from '@/lib/jsonld'
import { formatPenceCompact } from '@/lib/money'
import { summariseWeek } from '@/lib/hours'
import { SITE, absoluteUrl } from '@/lib/site'
import { getServiceState, requireBranch } from '@/server/branch'
import { getPublishedMenus } from '@/server/menu'
import { slotOptionsByType } from '@/server/ordering'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  openGraph: { url: absoluteUrl('/') },
}

export const revalidate = 300

/** Package inclusions, as published on the old banqueting page. */
const BANQUETING_INCLUDES = [
  'Three courses — four starters, four mains, two desserts',
  'Unlimited soft drinks and juices',
  'Cutlery, crockery, linen and glassware',
  'Chair covers with sashes',
  'Multicolour uplighting',
  'Bar and professional banquet staff',
  'Car parking',
]

export default async function HomePage() {
  const branch = await requireBranch()
  const menus = await getPublishedMenus(branch.id)
  const state = getServiceState(branch)

  // The earliest time the kitchen could actually hand food over, derived from the opening hours
  // and its lead time — not a marketing claim.
  const slots = slotOptionsByType(branch)
  const tonight = {
    earliestPickup: slots.PICKUP[0]?.time ?? null,
    earliestPickupDay: slots.PICKUP[0]?.dayLabel ?? null,
    earliestDelivery: slots.DELIVERY[0]?.time ?? null,
    earliestDeliveryDay: slots.DELIVERY[0]?.dayLabel ?? null,
  }

  // Real dish names for the marquee, spread across the menu rather than taken from the top of it.
  const allDishes = menus.flatMap((menu) => menu.categories.flatMap((c) => c.items))
  const step = Math.max(1, Math.floor(allDishes.length / 22))
  const marqueeDishes = allDishes.filter((_, index) => index % step === 0).slice(0, 22).map((i) => i.name)

  const dishCount = allDishes.length
  const categoryCount = menus.reduce((n, menu) => n + menu.categories.length, 0)

  return (
    <>
      <JsonLd data={restaurantSchema(branch)} />

      <Hero branch={branch} state={state} tonight={tonight} />

      <DishMarquee dishes={marqueeDishes} />

      {/* One card per revenue line. Nothing here links to a page that does not exist, and every
          "order" route on this site goes to exactly one place. */}
      <section aria-labelledby="ways-heading" className="container-page py-16 sm:py-24">
        <h2 id="ways-heading" className="sr-only">
          Ways to eat with us
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <TiltCard
            href="/order"
            eyebrow="Collection & delivery"
            title="Order online"
            cta="Start an order"
            accent="#d99a2b"
            data-reveal
          >
            The whole menu, priced, with a time you choose. Closed right now? Pick a slot for
            tomorrow and it still goes through.
          </TiltCard>

          <TiltCard
            href="/book"
            eyebrow="Dine in"
            title="Book a table"
            cta="Choose a time"
            accent="#b8341f"
            data-reveal
          >
            Sunday lunch, a birthday, or a Tuesday when nobody wants to cook. Tell us when and how
            many and we will confirm by phone.
          </TiltCard>

          <TiltCard
            href="/events"
            eyebrow="Up to 150 guests"
            title="Weddings & events"
            cta="Plan an event"
            accent="#7a1533"
            data-reveal
          >
            A banqueting hall from {formatPenceCompact(SITE.banqueting.fromPerPersonInPence)} a head,
            with staff, uplighting and parking included.
          </TiltCard>
        </div>
      </section>

      {/* The menu, summarised honestly: real counts, real section names. */}
      <section
        aria-labelledby="menu-heading"
        data-reveal
        className="border-y border-line bg-surface py-16 sm:py-24"
      >
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading
              eyebrow="The food"
              id="menu-heading"
              title={`${dishCount} dishes, ${categoryCount} sections, one list`}
              lead="Chaat and street food, the charcoal grill, biryanis cooked on dum, South Indian dosas, and a dessert list that ends in kulfi. The ordering system reads this same list — there is no second copy that can disagree with it."
            />
            <ButtonLink href="/menu" variant="secondary">
              See the full menu
            </ButtonLink>
          </div>

          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {menus.flatMap((menu) =>
              menu.categories.slice(0, 6).map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/menu/${menu.slug}#category-${menu.slug}-${category.slug}`}
                    className="group flex items-baseline justify-between gap-4 rounded-xl border border-line px-4 py-3.5 transition-colors hover:border-line-strong hover:bg-surface-2"
                  >
                    <span className="font-display text-[1.0625rem] text-ink">{category.name}</span>
                    <span className="shrink-0 text-sm tabular-nums text-muted">
                      {category.items.length}
                    </span>
                  </Link>
                </li>
              )),
            )}
          </ul>
        </div>
      </section>

      {/* Events get the space they earn: it is the highest-margin line and the old site buried it. */}
      <section aria-labelledby="events-heading" className="container-page py-16 sm:py-24">
        <div data-reveal className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="Banqueting"
              id="events-heading"
              title="A hall for 150, and someone else does the washing up"
              lead="Pre-wedding and wedding functions, corporate days, private parties and exhibitions. Packages start at £40 a head and include the things that usually turn up as extras."
            />
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/events">Plan an event</ButtonLink>
              <ButtonLink href="/contact" variant="secondary">
                Talk to us
              </ButtonLink>
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
            <p className="flex items-center gap-2 text-sm font-semibold text-brand-text">
              <Users aria-hidden className="size-4" />
              Included from {formatPenceCompact(SITE.banqueting.fromPerPersonInPence)} per person
            </p>
            <ul className="mt-5 space-y-3">
              {BANQUETING_INCLUDES.map((line) => (
                <li key={line} className="flex gap-3 text-[0.9375rem] leading-relaxed">
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-ok" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Hours and address, read from the database — the one place they are written down. */}
      <section
        aria-labelledby="find-heading"
        data-reveal
        className="border-t border-line bg-surface py-16 sm:py-24"
      >
        <div className="container-page grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="Find us"
              id="find-heading"
              title="On the Bath Road, five minutes from the M4"
              lead="The Bell and Bottle sits on the A4 between Maidenhead and Knowl Hill, with parking outside."
            />

            <address className="mt-7 space-y-4 text-[0.9375rem] not-italic">
              <p className="flex gap-3">
                <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
                <span>
                  {branch.addressLine1}
                  <br />
                  {branch.addressLine2}, {branch.city}
                  <br />
                  {branch.postcode}
                </span>
              </p>
              <p className="flex gap-3">
                <Phone aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
                <a href={`tel:${branch.phone?.replace(/\s/g, '')}`} className="hover:text-brand-text">
                  {branch.phone}
                </a>
              </p>
            </address>

            <ButtonLink
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                `${branch.addressLine1}, ${branch.postcode}`,
              )}`}
              variant="secondary"
              size="sm"
              className="mt-6"
              target="_blank"
              rel="noreferrer noopener"
            >
              Get directions
            </ButtonLink>
          </div>

          <div>
            <h3 className="text-xl">Opening hours</h3>
            <dl className="mt-5 divide-y divide-line rounded-2xl border border-line">
              {summariseWeek(branch.openingHours).map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-4 px-5 py-3.5">
                  <dt className="text-muted">{row.label}</dt>
                  <dd className="font-medium tabular-nums">{row.hours}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm text-muted">
              Last online orders {branch.lastOrderMinutesBeforeClose} minutes before we close.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
