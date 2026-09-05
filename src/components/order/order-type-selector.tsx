'use client'

import { Bike, ShoppingBag, UtensilsCrossed } from 'lucide-react'
import { useCart } from '@/components/cart/cart-context'
import { cn } from '@/lib/cn'
import { formatPence } from '@/lib/money'
import type { OrderTypeValue } from '@/lib/validation'

/**
 * Pickup / Delivery / Dine-in, chosen once and remembered.
 *
 * The choice changes the price (delivery fee), the lead time and the fields at checkout, so it is
 * asked first rather than sprung on the customer at the end.
 */
export function OrderTypeSelector({
  acceptsDelivery,
  acceptsDineIn,
  minOrderInPence,
  deliveryFeeInPence,
  freeDeliveryAboveInPence,
  pickupLeadMinutes,
  deliveryLeadMinutes,
}: {
  acceptsDelivery: boolean
  acceptsDineIn: boolean
  minOrderInPence: number
  deliveryFeeInPence: number
  freeDeliveryAboveInPence: number | null
  pickupLeadMinutes: number
  deliveryLeadMinutes: number
}) {
  const { state, setOrderType } = useCart()

  const options: Array<{
    value: OrderTypeValue
    label: string
    detail: string
    icon: typeof ShoppingBag
    disabled?: boolean
  }> = [
    {
      value: 'PICKUP',
      label: 'Collection',
      detail: `Ready in about ${pickupLeadMinutes} minutes`,
      icon: ShoppingBag,
    },
    {
      value: 'DELIVERY',
      label: 'Delivery',
      detail: acceptsDelivery
        ? `${formatPence(minOrderInPence)} minimum · ${formatPence(deliveryFeeInPence)} · about ${deliveryLeadMinutes} minutes`
        : 'Not available today',
      icon: Bike,
      disabled: !acceptsDelivery,
    },
    {
      value: 'DINE_IN',
      label: 'Eat in',
      detail: acceptsDineIn ? 'Order ahead, eat with us' : 'Not available today',
      icon: UtensilsCrossed,
      disabled: !acceptsDineIn,
    },
  ]

  return (
    <fieldset>
      <legend className="text-sm font-semibold text-ink">How would you like your food?</legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {options.map((option) => {
          const selected = state.orderType === option.value
          const Icon = option.icon
          return (
            <label
              key={option.value}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors',
                selected
                  ? 'border-brand bg-brand-wash ring-1 ring-brand'
                  : 'border-line bg-surface hover:border-line-strong',
                option.disabled && 'cursor-not-allowed opacity-55 hover:border-line',
              )}
            >
              <input
                type="radio"
                name="order-type"
                className="sr-only"
                checked={selected}
                disabled={option.disabled}
                onChange={() => setOrderType(option.value)}
              />
              <Icon
                aria-hidden
                className={cn('mt-0.5 size-5 shrink-0', selected ? 'text-brand-text' : 'text-muted')}
              />
              <span className="min-w-0">
                <span
                  className={cn(
                    'block font-medium',
                    selected ? 'text-brand-text' : 'text-ink',
                  )}
                >
                  {option.label}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted">{option.detail}</span>
              </span>
            </label>
          )
        })}
      </div>
      {acceptsDelivery && freeDeliveryAboveInPence !== null ? (
        <p className="mt-2.5 text-sm text-muted">
          Delivery is free on orders over {formatPence(freeDeliveryAboveInPence)}.
        </p>
      ) : null}
    </fieldset>
  )
}
