import type { Metadata } from 'next'
import { NotConfigured } from '@/components/not-configured'
import Link from 'next/link'
import { PauseCircle } from 'lucide-react'
import { CartBar, CartPanel } from '@/components/cart/cart-panel'
import { AllergenNotice } from '@/components/menu/allergen-notice'
import { MenuFilters } from '@/components/menu/menu-filters'
import { MenuSectionNav } from '@/components/menu/menu-section-nav'
import {
  MenuSections,
  countDishes,
  countUnconfirmedAllergens,
} from '@/components/menu/menu-sections'
import { DeliveryGate } from '@/components/order/delivery-gate'
import { OrderTypeSelector } from '@/components/order/order-type-selector'
import { SlotPicker } from '@/components/order/slot-picker'
import { OpenStatus } from '@/components/open-status'
import { DemoNotice } from '@/components/demo-notice'
import { absoluteUrl } from '@/lib/site'
import { getServiceState, getBranchSafe } from '@/server/branch'
import { isDatabaseConfigured } from '@/server/static-data'
import { getOrderableMenus } from '@/server/menu'
import { slotOptionsByType } from '@/server/ordering'

export const metadata: Metadata = {
  title: 'Order online',
  description:
    'Order Indian food from Javatri in Littlewick Green, Maidenhead — collection, delivery or eat in. Pay online, choose your time.',
  alternates: { canonical: '/order' },
  openGraph: { title: 'Order online · Javatri', url: absoluteUrl('/order') },
}

/** Availability changes minute to minute, so nothing here is cached. */
export const dynamic = 'force-dynamic'

/**
 * The single ordering route.
 *
 * The old site had three, and none of them completed an order: one said ordering was no longer
 * available, one showed the whole menu and refused orders, and one accepted orders against an
 * empty menu. Everything now arrives here, and here is the only place a basket is built.
 */
export default async function OrderPage() {
  const now = new Date()
  const branch = await getBranchSafe()
  if (!branch) return <NotConfigured />
  const menus = await getOrderableMenus(branch.id)
  const state = getServiceState(branch, now)
  const slots = slotOptionsByType(branch, now)
  const canTakeOrders = isDatabaseConfigured()

  const dishes = countDishes(menus)
  const unconfirmed = countUnconfirmedAllergens(menus)

  return (
    <div className="container-page py-8 sm:py-12">
      <header className="max-w-3xl">
        <h1 className="text-4xl sm:text-5xl">Order online</h1>
        <p className="mt-3 text-base leading-relaxed text-muted sm:text-lg">
          Collection, delivery or eat in. Pay by card, choose your time, and we will have it ready.
        </p>
        <div className="mt-4">
          <OpenStatus branch={branch} state={state} />
        </div>
      </header>

      {!canTakeOrders ? <DemoNotice context="order" className="mt-6 max-w-3xl" /> : null}

      {canTakeOrders && state.isPaused ? (
        <div className="mt-6 flex max-w-3xl gap-3 rounded-2xl border border-warn/30 bg-warn-wash p-4 sm:p-5">
          <PauseCircle aria-hidden className="mt-0.5 size-5 shrink-0 text-warn" />
          <div className="text-sm leading-relaxed">
            <p className="font-semibold text-ink">We have paused online orders</p>
            <p className="mt-1 text-ink/85">
              The kitchen is at capacity. You can still{' '}
              <a href="tel:+441628825753" className="font-medium underline underline-offset-2">
                call us on 01628 825753
              </a>
              , or{' '}
              <Link href="/book" className="font-medium underline underline-offset-2">
                book a table
              </Link>
              .
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
        <div className="min-w-0">
          <div className="space-y-4">
            <OrderTypeSelector
              acceptsDelivery={branch.acceptsDelivery}
              acceptsDineIn={branch.acceptsDineIn}
              minOrderInPence={branch.minOrderInPence}
              deliveryFeeInPence={branch.deliveryFeeInPence}
              freeDeliveryAboveInPence={branch.freeDeliveryAboveInPence}
              pickupLeadMinutes={branch.pickupLeadMinutes}
              deliveryLeadMinutes={branch.deliveryLeadMinutes}
            />
            <DeliveryGate />
            <SlotPicker slotsByType={slots} isClosedNow={!state.isOpen} />
          </div>

          <AllergenNotice className="mt-6" phone={branch.phone ?? undefined} />

          {/*
            The order page never had a way to reach a section. Someone who knows they want a
            biryani should not have to scroll past a hundred and thirty other dishes to order one.
          */}
          <div className="mt-6">
            <MenuSectionNav menus={menus} />
          </div>

          <div className="sticky top-16 z-30 -mx-5 mt-4 bg-bg/95 px-5 py-3 backdrop-blur-sm sm:top-18 sm:mx-0 sm:px-0">
            <MenuFilters
              rootId="order-menu-root"
              totalDishes={dishes}
              unconfirmedAllergenCount={unconfirmed}
            />
          </div>

          <div id="order-menu-root" className="mt-8">
            <MenuSections menus={menus} orderable />
          </div>
        </div>

        <CartPanel />
      </div>

      <CartBar />
    </div>
  )
}
