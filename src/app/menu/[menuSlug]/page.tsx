import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AllergenNotice } from '@/components/menu/allergen-notice'
import { MenuFilters } from '@/components/menu/menu-filters'
import { MenuJumpNav } from '@/components/menu/menu-jump-nav'
import {
  MenuSections,
  countDishes,
  countUnconfirmedAllergens,
} from '@/components/menu/menu-sections'
import { ButtonLink } from '@/components/ui'
import { breadcrumbSchema, JsonLd, menuSchema } from '@/lib/jsonld'
import { absoluteUrl } from '@/lib/site'
import { getBranchSafe, getSelectedBranchSlug } from '@/server/branch'
import { getMenuBySlug, getPublishedMenus } from '@/server/menu'

export const revalidate = 300

type Params = { params: Promise<{ menuSlug: string }> }

/**
 * Pre-rendered so each menu is a real, indexable URL. The old site's per-menu links were
 * `?menu=` query strings that resolved to the wrong menu — asking for street food served the
 * dessert list — which is both a bug and an SEO dead end.
 */
export async function generateStaticParams() {
  try {
    const branch = await getBranchSafe(await getSelectedBranchSlug())
    if (!branch) return []
    const menus = await getPublishedMenus(branch.id)
    return menus.map((menu) => ({ menuSlug: menu.slug }))
  } catch {
    // No database at build time (a preview build, a fresh clone). The pages still render on
    // demand; there is no reason to fail the build over it.
    return []
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { menuSlug } = await params
  const branch = await getBranchSafe(await getSelectedBranchSlug())
  if (!branch) return {}
  const menu = await getMenuBySlug(branch.id, menuSlug)
  if (!menu) return {}

  const dishes = menu.categories.reduce((n, c) => n + c.items.length, 0)
  const description = `${menu.name} at Javatri, Littlewick Green, Maidenhead — ${dishes} dishes with prices. ${menu.categories
    .slice(0, 4)
    .map((c) => c.name)
    .join(', ')}.`

  return {
    title: menu.name,
    description,
    alternates: { canonical: `/menu/${menu.slug}` },
    openGraph: {
      title: `${menu.name} · Javatri`,
      description,
      url: absoluteUrl(`/menu/${menu.slug}`),
    },
  }
}

export default async function SingleMenuPage({ params }: Params) {
  const { menuSlug } = await params
  const branch = await getBranchSafe(await getSelectedBranchSlug())
  if (!branch) notFound()
  const [menu, allMenus] = await Promise.all([
    getMenuBySlug(branch.id, menuSlug),
    getPublishedMenus(branch.id),
  ])

  if (!menu) notFound()

  const menus = [menu]
  const dishes = countDishes(menus)
  const unconfirmed = countUnconfirmedAllergens(menus)

  return (
    <>
      <JsonLd data={menuSchema(menus, absoluteUrl(`/menu/${menu.slug}`))} />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Menu', path: '/menu' },
          { name: menu.name, path: `/menu/${menu.slug}` },
        ])}
      />

      <div className="container-page py-10 sm:py-14">
        <nav aria-label="Breadcrumb" className="text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-brand-text">
                Home
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href="/menu" className="hover:text-brand-text">
                Menu
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-ink">
              {menu.name}
            </li>
          </ol>
        </nav>

        <header className="mt-6 max-w-3xl">
          <h1 className="text-4xl sm:text-5xl">{menu.name}</h1>
          {menu.serviceNote ? <p className="mt-3 text-muted">{menu.serviceNote}</p> : null}
          <p className="mt-4 text-muted">
            {dishes} {dishes === 1 ? 'dish' : 'dishes'} across {menu.categories.length}{' '}
            {menu.categories.length === 1 ? 'section' : 'sections'}.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonLink href="/order" size="sm">
              Order online
            </ButtonLink>
            <ButtonLink href="/menu" variant="secondary" size="sm">
              See every menu
            </ButtonLink>
          </div>
        </header>

        <div className="mt-8">
          <MenuJumpNav menus={allMenus} currentSlug={menu.slug} />
        </div>

        <AllergenNotice id="allergens" className="mt-6 max-w-3xl scroll-mt-24" phone={branch.phone ?? undefined} />

        <div className="sticky top-16 z-30 -mx-5 mt-6 bg-bg/95 px-5 py-3 backdrop-blur-sm sm:top-18 sm:mx-0 sm:px-0">
          <MenuFilters rootId="menu-root" totalDishes={dishes} unconfirmedAllergenCount={unconfirmed} />
        </div>

        <div id="menu-root" className="mt-10">
          <MenuSections menus={menus} />
        </div>
      </div>
    </>
  )
}
