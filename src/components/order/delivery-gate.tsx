'use client'

import { useState, type FormEvent } from 'react'
import { Check, MapPin, TriangleAlert } from 'lucide-react'
import { useCart } from '@/components/cart/cart-context'
import { Button } from '@/components/ui'
import { formatPence } from '@/lib/money'

/**
 * "Do you deliver to me?" — asked before the basket, not after it.
 *
 * Discovering you are out of the delivery area after picking a meal is the kind of thing a
 * customer only forgives once. The answer also states the minimum and the fee up front, so
 * nothing at checkout is a surprise.
 */

type Decision =
  | { ok: true; postcode: string; distanceMiles: number; minOrderInPence: number; deliveryFeeInPence: number; freeDeliveryAboveInPence: number | null }
  | { ok: false; reason: string; message: string }

export function DeliveryGate() {
  const { state, setPostcode, setOrderType } = useCart()
  const [input, setInput] = useState(state.postcode ?? '')
  const [decision, setDecision] = useState<Decision | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  if (state.orderType !== 'DELIVERY') return null

  const check = async (event: FormEvent) => {
    event.preventDefault()
    setIsChecking(true)
    setDecision(null)
    try {
      const response = await fetch('/api/delivery/check', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ postcode: input }),
      })
      const result = (await response.json()) as Decision
      setDecision(result)
      setPostcode(result.ok ? result.postcode : null)
    } catch {
      setDecision({
        ok: false,
        reason: 'lookup_failed',
        message: 'We could not check that just now. Please try again, or give us a call.',
      })
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <form onSubmit={check}>
        <label htmlFor="delivery-postcode" className="text-sm font-semibold text-ink">
          Where are we delivering to?
        </label>
        <p className="mt-1 text-sm text-muted">
          We will check you are in range before you start choosing.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <div className="relative min-w-0 flex-1">
            <MapPin
              aria-hidden
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
            />
            <input
              id="delivery-postcode"
              name="postcode"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              autoComplete="postal-code"
              inputMode="text"
              spellCheck={false}
              placeholder="SL6 3RX"
              aria-describedby="delivery-result"
              className="min-h-11 w-full rounded-full border border-line-strong bg-bg pl-10 pr-4 uppercase placeholder:normal-case placeholder:text-muted/70"
            />
          </div>
          <Button type="submit" disabled={isChecking || input.trim().length < 5}>
            {isChecking ? 'Checking…' : 'Check postcode'}
          </Button>
        </div>
      </form>

      <div id="delivery-result" aria-live="polite" className="mt-3 empty:mt-0">
        {decision?.ok ? (
          <p className="flex gap-2.5 rounded-xl border border-ok/25 bg-ok-wash p-3.5 text-sm leading-relaxed">
            <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-ok" />
            <span>
              <strong className="font-semibold">Yes, we deliver to {decision.postcode}.</strong> About{' '}
              {decision.distanceMiles} miles. Minimum order {formatPence(decision.minOrderInPence)},
              delivery {formatPence(decision.deliveryFeeInPence)}
              {decision.freeDeliveryAboveInPence !== null
                ? `, free over ${formatPence(decision.freeDeliveryAboveInPence)}`
                : ''}
              .
            </span>
          </p>
        ) : decision ? (
          <div className="flex gap-2.5 rounded-xl border border-warn/30 bg-warn-wash p-3.5 text-sm leading-relaxed">
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warn" />
            <div>
              <p>{decision.message}</p>
              {decision.reason === 'out_of_range' || decision.reason === 'no_delivery' ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 -ml-2"
                  onClick={() => setOrderType('PICKUP')}
                >
                  Switch to collection
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
