import type { Metadata } from 'next'
import { NotConfigured } from '@/components/not-configured'
import Link from 'next/link'
import { AllergenNotice } from '@/components/menu/allergen-notice'
import { MenuFilters } from '@/components/menu/menu-filters'
import { MenuJumpNav } from '@/components/menu/menu-jump-nav'
import {
  MenuSections,
  countDishes,
  countUnconfirmedAllergens,
} from '@/components/menu/menu-sections'
import { OpenStatus } from '@/components/open-status'
import { ButtonLink } from '@/components/ui'
import { breadcrumbSchema, JsonLd, menuSchema } from '@/lib/jsonld'
import { absoluteUrl } from '@/lib/site'
import { getServiceState, getBranchSafe } from '@/server/branch'
import { getPublishedMenus, getUnpublishedMenuNotes } from '@/server/menu'

export const metadata: Metadata = {
  title: 'Menu',
  description:
    'The full Javatri menu — chaat, tandoor, biryani, curries, dosas and desserts, with prices. Indian food in Littlewick Green, Maidenhead. Order online for collection or delivery.',
  alternates: { canonical: '/menu' },
  openGraph: {
    title: 'Menu · Javatri',
    description: 'Chaat, tandoor, biryani, curries and dosas. Littlewick Green, Maidenhead.',
    url: absoluteUrl('/menu'),
  },
}

/** Menus change when staff edit them, not on a request-by-request basis. */
export const revalidate = 300

export default async function MenuPage() {
  const branch = await getBranchSafe()
  if (!branch) return <NotConfigured />
  const [menus, unpublished] = await Promise.all([
    getPublishedMenus(branch.id),
    getUnpublishedMenuNotes(branch.id),
  ])

  const dishes = countDishes(menus)
  const unconfirmed = countUnconfirmedAllergens(menus)
  const state = getServiceState(branch)

  return (
    <>
      <JsonLd data={menuSchema(menus, absoluteUrl('/menu'))} />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Menu', path: '/menu' },
        ])}
      />

      <div className="container-page py-10 sm:py-14">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-text">
            Littlewick Green, Maidenhead
          </p>
          <h1 className="mt-2 text-4xl sm:text-5xl">Our menu</h1>
          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
            Everything we cook, in one place, with prices. This is the same list the ordering
            system uses — there is no second copy that can disagree with it.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <OpenStatus branch={branch} state={state} />
            <ButtonLink href="/order" size="sm">
              Order online
            </ButtonLink>
            <ButtonLink href="/book" variant="secondary" size="sm">
              Book a table
            </ButtonLink>
          </div>
        </header>

        <div className="mt-8">
          <MenuJumpNav menus={menus} />
        </div>

        <AllergenNotice id="allergens" className="mt-6 max-w-3xl scroll-mt-24" phone={branch.phone ?? undefined} />

        <div className="sticky top-16 z-30 -mx-5 mt-6 bg-bg/95 px-5 py-3 backdrop-blur-sm sm:top-18 sm:mx-0 sm:px-0">
          <MenuFilters rootId="menu-root" totalDishes={dishes} unconfirmedAllergenCount={unconfirmed} />
        </div>

        <div id="menu-root" className="mt-10">
          <MenuSections menus={menus} />
        </div>

        {/*
          Under the menu rather than above it: it is a caveat, not a headline. But it is on the
          page, because a photograph next to a price implies a promise, and these photographs
          cannot keep it — they are library images of the dish, not of our plate.
        */}
        <p className="mt-8 max-w-3xl text-xs leading-relaxed text-muted">
          The dish photographs are serving suggestions — library photographs of each kind of dish
          rather than of the plate we will bring you. Every one is{' '}
          <Link href="/photo-credits" className="underline underline-offset-2 hover:text-brand-text">
            credited to its photographer
          </Link>
          .
        </p>

        {unpublished.length > 0 ? (
          <section aria-labelledby="unpublished-heading" className="mt-16 max-w-3xl rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <h2 id="unpublished-heading" className="text-xl">
              Not listed here yet
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {unpublished.map((menu) => menu.name).join(' and ')}{' '}
              {unpublished.length === 1 ? 'is' : 'are'} served in the bar but not published online
              yet — we would rather show you nothing than show you a price we cannot stand behind.
              Please{' '}
              <Link href="/contact" className="underline underline-offset-2 hover:text-brand-text">
                call or ask at the bar
              </Link>
              .
            </p>
          </section>
        ) : null}
      </div>
    </>
  )
}
