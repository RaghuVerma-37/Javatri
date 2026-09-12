import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { OutletChooser } from '@/components/outlet/outlet-chooser'
import { getActiveBranches } from '@/server/branch'
import { OUTLET_COOKIE } from '@/lib/outlet'
import { SITE } from '@/lib/site'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Choose your Javatri',
  description: 'Javatri has more than one kitchen. Pick the one you are visiting.',
  // A junction, not a destination: it should never outrank the pages it sends people to.
  robots: { index: false, follow: true },
}

/**
 * The outlet chooser, as a page of its own.
 *
 * The small dialog on the live site asks the same question for a first-time visitor; this is the
 * addressable version of it — linkable, bookmarkable, back-button-able — for the header's "change
 * outlet" route and for anyone sent the link directly.
 *
 * It also decides its own relevance. With fewer than two outlets switched on there is no question
 * to ask, so it sends the visitor straight on to wherever they were going rather than showing a
 * choice of one.
 */
export default async function OutletsPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  // Only ever an in-site path: an open redirect here would let somebody send a Javatri link that
  // lands on their own site.
  const destination = next && next.startsWith('/') && !next.startsWith('//') ? next : '/'

  const active = await getActiveBranches()

  if (active.length < 2) {
    const store = await cookies()
    if (!store.get(OUTLET_COOKIE)?.value && active[0]) {
      // Not settable from a server component render, so the chooser client component writes it on
      // arrival instead. Redirecting straight through is the important half.
    }
    redirect(destination)
  }

  const outlets = active.map((branch) => ({
    slug: branch.slug,
    name: branch.name,
    addressLine1: branch.addressLine1,
    addressLine2: branch.addressLine2,
    city: branch.city,
    postcode: branch.postcode,
    phone: branch.phone,
    acceptsOrders: branch.acceptsOrders,
    acceptsDelivery: branch.acceptsDelivery,
    deliveryRadiusMiles: branch.deliveryRadiusMiles,
  }))

  return <OutletChooser outlets={outlets} destination={destination} siteName={SITE.name} />
}
