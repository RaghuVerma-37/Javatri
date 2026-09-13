'use client'

import { useMemo } from 'react'
import { Clock } from 'lucide-react'
import { useCart } from '@/components/cart/cart-context'
import { cn } from '@/lib/cn'
import type { OrderTypeValue } from '@/lib/validation'

/**
 * When would you like it?
 *
 * This is the component that answers the old site's worst failure. `/online-ordering-1` rendered
 * the entire menu and then said "Not Accepting Orders", full stop — no reason, no next step, no
 * way to order for later. Here, being closed simply means the first available slot is tomorrow,
 * and the order goes through.
 *
 * The times are formatted on the server in Europe/London and sent as strings, so the browser's
 * own timezone — a phone that is still on holiday time, say — cannot shift them.
 */

export type SlotOption = {
  /** The instant, which is what actually gets stored. */
  iso: string
  /** "19:15", already in London time. */
  time: string
  dayKey: string
  /** "Today", "Tomorrow", "Saturday 12 September". */
  dayLabel: string
}

export function SlotPicker({
  slotsByType,
  isClosedNow,
}: {
  slotsByType: Record<OrderTypeValue, SlotOption[]>
  isClosedNow: boolean
}) {
  const { state, setRequestedFor } = useCart()
  // Memoised because `?? []` produces a new array identity on every render, which would make the
  // grouping below re-run each time.
  const slots = useMemo(() => slotsByType[state.orderType] ?? [], [slotsByType, state.orderType])

  const days = useMemo(() => {
    const grouped = new Map<string, { label: string; slots: SlotOption[] }>()
    for (const slot of slots) {
      const existing = grouped.get(slot.dayKey)
      if (existing) existing.slots.push(slot)
      else grouped.set(slot.dayKey, { label: slot.dayLabel, slots: [slot] })
    }
    return [...grouped.entries()].map(([key, value]) => ({ key, ...value }))
  }, [slots])

  if (slots.length === 0) {
    return (
      <div className="rounded-2xl border border-warn/30 bg-warn-wash p-4 text-sm leading-relaxed sm:p-5">
        <p className="font-semibold text-ink">We have no times available in the next few days.</p>
        <p className="mt-1 text-ink/85">
          That is unusual — please give us a call on{' '}
          <a href="tel:+441628825753" className="font-medium underline underline-offset-2">
            01628 825753
          </a>{' '}
          and we will sort something out.
        </p>
      </div>
    )
  }

  const first = slots[0]
  const isAsap = state.requestedFor === null
  const selected = slots.find((slot) => slot.iso === state.requestedFor) ?? null

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">When would you like it?</h2>
        {isClosedNow ? (
          <p className="text-xs text-muted">
            The kitchen is closed right now — order ahead for {first.dayLabel.toLowerCase()}.
          </p>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setRequestedFor(null)}
          aria-pressed={isAsap}
          className={cn(
            'inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm transition-colors',
            isAsap ? 'border-brand bg-brand text-on-brand' : 'border-line-strong hover:bg-surface-2',
          )}
        >
          <Clock aria-hidden className="size-4" />
          {isClosedNow ? `First available — ${first.dayLabel}, ${first.time}` : `As soon as you can — about ${first.time}`}
        </button>
      </div>

      <details className="group mt-3" open={!isAsap}>
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg py-1 text-sm font-medium text-brand-text underline underline-offset-4">
          {selected ? `Scheduled for ${selected.dayLabel}, ${selected.time}` : 'Choose a different time'}
        </summary>

        <div className="mt-4 space-y-5">
          {days.map((day) => (
            <div key={day.key}>
              <h3 className="text-sm font-medium text-muted">
                {day.label}
              </h3>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {day.slots.map((slot) => {
                  const isSelected = state.requestedFor === slot.iso
                  return (
                    <li key={slot.iso}>
                      <button
                        type="button"
                        onClick={() => setRequestedFor(slot.iso)}
                        aria-pressed={isSelected}
                        className={cn(
                          'min-h-10 rounded-full border px-3.5 text-sm tabular-nums transition-colors',
                          isSelected
                            ? 'border-brand bg-brand text-on-brand'
                            : 'border-line-strong hover:bg-surface-2',
                        )}
                      >
                        {slot.time}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}
