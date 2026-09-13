'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { Clock, TriangleAlert } from 'lucide-react'
import { useCart } from '@/components/cart/cart-context'
import { formatPence } from '@/lib/money'
import type { SlotOption } from '@/components/order/slot-picker'

const TYPE_LABEL: Record<string, string> = {
  PICKUP: 'Collection',
  DELIVERY: 'Delivery',
  DINE_IN: 'Eat in',
}

/** What you are paying for and when, priced by the server. Read-only — edits happen on /order. */
export function CheckoutSummary({ slots }: { slots: Record<string, SlotOption[]> }) {
  const { state, pricing, isPricing } = useCart()

  const slot = useMemo(() => {
    const list = slots[state.orderType] ?? []
    return list.find((s) => s.iso === state.requestedFor) ?? list[0] ?? null
  }, [slots, state.orderType, state.requestedFor])

  if (state.lines.length === 0) {
    return (
      <aside className="rounded-2xl border border-line bg-surface p-6 text-center">
        <p className="font-medium">Your basket is empty</p>
        <Link
          href="/order"
          className="mt-2 inline-block text-sm text-brand-text underline underline-offset-4"
        >
          Go and choose something
        </Link>
      </aside>
    )
  }

  return (
    <aside
      aria-label="Order summary"
      className="h-max overflow-hidden rounded-2xl border border-line bg-surface lg:sticky lg:top-24"
    >
      <div className="border-b border-line px-5 py-4">
        <h2 className="font-display text-lg font-semibold">Your order</h2>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
          <Clock aria-hidden className="size-3.5" />
          {TYPE_LABEL[state.orderType]}
          {slot ? ` · ${slot.dayLabel}, ${slot.time}` : ''}
        </p>
      </div>

      <ul className={isPricing ? 'divide-y divide-line opacity-70' : 'divide-y divide-line'}>
        {(pricing?.lines ?? []).map((line) => (
          <li key={line.lineId} className="flex gap-3 px-5 py-3.5 text-sm">
            <span className="shrink-0 tabular-nums text-muted">{line.quantity}×</span>
            <span className="min-w-0 flex-1">
              {line.name}
              {line.selectedVariants.length > 0 || line.selectedModifiers.length > 0 ? (
                <span className="block text-xs text-muted">
                  {[...line.selectedVariants, ...line.selectedModifiers].map((o) => o.name).join(', ')}
                </span>
              ) : null}
            </span>
            <span className="shrink-0 tabular-nums">{formatPence(line.lineTotalInPence)}</span>
          </li>
        ))}
      </ul>

      {pricing && pricing.problems.length > 0 ? (
        <div className="border-t border-line px-5 py-3">
          {pricing.problems.map((problem) => (
            <p key={`${problem.code}-${problem.lineId ?? ''}`} className="flex gap-2 text-sm text-warn">
              <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
              {problem.message}
            </p>
          ))}
        </div>
      ) : null}

      <dl className="space-y-2 border-t border-line px-5 py-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd className="tabular-nums">{pricing ? formatPence(pricing.subtotalInPence) : '—'}</dd>
        </div>
        {state.orderType === 'DELIVERY' ? (
          <div className="flex justify-between">
            <dt className="text-muted">Delivery</dt>
            <dd className="tabular-nums">
              {pricing
                ? pricing.deliveryFeeInPence === 0
                  ? 'Free'
                  : formatPence(pricing.deliveryFeeInPence)
                : '—'}
            </dd>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">{pricing ? formatPence(pricing.totalInPence) : '—'}</dd>
        </div>
      </dl>

      <p className="border-t border-line px-5 py-3 text-xs text-muted">
        Prices are confirmed against the kitchen&rsquo;s menu when you pay.{' '}
        <Link href="/order" className="underline underline-offset-2">
          Change your order
        </Link>
      </p>
    </aside>
  )
}
