import type { Metadata } from 'next'
import { NotConfigured } from '@/components/not-configured'
import Link from 'next/link'
import { CheckoutForm } from '@/components/checkout/checkout-form'
import { CheckoutSummary } from '@/components/checkout/checkout-summary'
import { getBranchSafe, getSelectedBranchSlug } from '@/server/branch'
import { slotOptionsByType } from '@/server/ordering'
import { isDatabaseConfigured } from '@/server/static-data'
import { DemoNotice } from '@/components/demo-notice'

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function CheckoutPage() {
  const branch = await getBranchSafe(await getSelectedBranchSlug())
  if (!branch) return <NotConfigured />
  const slots = slotOptionsByType(branch)

  return (
    <div className="container-page py-10 sm:py-14">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/order" className="hover:text-brand-text">
          ← Back to the menu
        </Link>
      </nav>

      <h1 className="mt-5 text-4xl sm:text-5xl">Checkout</h1>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14">
        <div className="min-w-0">
          {isDatabaseConfigured() ? (
            <CheckoutForm slots={slots} />
          ) : (
            <DemoNotice context="checkout" />
          )}
        </div>
        <CheckoutSummary slots={slots} />
      </div>
    </div>
  )
}
