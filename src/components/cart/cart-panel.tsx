'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { TriangleAlert, Trash2 } from 'lucide-react'
import { useCart } from '@/components/cart/cart-context'
import { Tiffin } from '@/components/cart/tiffin'
import { Button, buttonClass } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatPence } from '@/lib/money'

/**
 * The basket.
 *
 * Every number here came back from the server. When a price is in flight the previous total stays
 * on screen, dimmed, rather than flashing to zero — and the checkout button is disabled until the
 * server says the basket is orderable. There is no path through this component that invents a
 * total from data held in the browser.
 */

function CartContents({ onNavigate }: { onNavigate?: () => void }) {
  const { state, pricing, isPricing, setQuantity, removeLine, clear } = useCart()

  if (state.lines.length === 0) {
    return (
      <div className="px-5 py-10 text-center">
        <Tiffin count={0} className="mx-auto size-11 text-muted/60" />
        <p className="mt-3 font-medium text-ink">Your basket is empty</p>
        <p className="mt-1 text-sm text-muted">Add something from the menu below.</p>
      </div>
    )
  }

  const problems = pricing?.problems.filter((p) => p.code !== 'empty_cart') ?? []

  return (
    <>
      <ul className={cn('divide-y divide-line', isPricing && 'opacity-70 transition-opacity')}>
        {state.lines.map((line) => {
          const priced = pricing?.lines.find((l) => l.lineId === line.lineId)
          const problem = problems.find((p) => p.lineId === line.lineId)

          return (
            <li key={line.lineId} className="flex gap-3 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-snug text-ink">
                  {priced?.name ?? 'Loading…'}
                </p>

                {priced && (priced.selectedVariants.length > 0 || priced.selectedModifiers.length > 0) ? (
                  <p className="mt-0.5 text-xs text-muted">
                    {[...priced.selectedVariants, ...priced.selectedModifiers]
                      .map((option) => option.name)
                      .join(' · ')}
                  </p>
                ) : null}

                {line.notes ? (
                  <p className="mt-0.5 text-xs italic text-muted">&ldquo;{line.notes}&rdquo;</p>
                ) : null}

                {problem ? (
                  <p className="mt-1.5 flex items-start gap-1.5 text-xs text-danger">
                    <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
                    {problem.message}
                  </p>
                ) : null}

                <div className="mt-2.5 flex items-center gap-3">
                  <div className="flex items-center rounded-full border border-line-strong">
                    <button
                      type="button"
                      onClick={() => setQuantity(line.lineId, line.quantity - 1)}
                      className="flex size-9 items-center justify-center rounded-l-full hover:bg-surface-2"
                    >
                      <span aria-hidden>&minus;</span>
                      <span className="sr-only">
                        One fewer {priced?.name ?? 'item'}
                      </span>
                    </button>
                    <span className="w-7 text-center text-sm tabular-nums">{line.quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(line.lineId, line.quantity + 1)}
                      className="flex size-9 items-center justify-center rounded-r-full hover:bg-surface-2"
                    >
                      <span aria-hidden>+</span>
                      <span className="sr-only">One more {priced?.name ?? 'item'}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeLine(line.lineId)}
                    className="rounded-lg p-1.5 text-muted transition-colors hover:text-danger"
                  >
                    <Trash2 aria-hidden className="size-4" />
                    <span className="sr-only">Remove {priced?.name ?? 'item'}</span>
                  </button>
                </div>
              </div>

              <p className="shrink-0 text-sm font-medium tabular-nums text-ink">
                {priced ? formatPence(priced.lineTotalInPence) : '—'}
              </p>
            </li>
          )
        })}
      </ul>

      {problems.some((p) => !p.lineId) ? (
        <div className="border-t border-line px-5 py-3">
          {problems
            .filter((p) => !p.lineId)
            .map((problem) => (
              <p key={problem.code} className="flex items-start gap-2 text-sm text-warn">
                <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                {problem.message}
              </p>
            ))}
        </div>
      ) : null}

      <div className="space-y-2 border-t border-line px-5 py-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">Subtotal</span>
          <span className="tabular-nums">{pricing ? formatPence(pricing.subtotalInPence) : '—'}</span>
        </div>
        {state.orderType === 'DELIVERY' ? (
          <div className="flex justify-between">
            <span className="text-muted">Delivery</span>
            <span className="tabular-nums">
              {pricing
                ? pricing.deliveryFeeInPence === 0
                  ? 'Free'
                  : formatPence(pricing.deliveryFeeInPence)
                : '—'}
            </span>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
          <span>Total</span>
          <span className="tabular-nums" aria-live="polite">
            {pricing ? formatPence(pricing.totalInPence) : '—'}
          </span>
        </div>
      </div>

      <div className="space-y-2 border-t border-line px-5 py-4">
        <Link
          href="/order/checkout"
          onClick={onNavigate}
          aria-disabled={!pricing?.isOrderable}
          tabIndex={pricing?.isOrderable ? undefined : -1}
          className={cn(
            buttonClass({ size: 'lg' }),
            'w-full',
            !pricing?.isOrderable && 'pointer-events-none opacity-55',
          )}
        >
          Go to checkout
        </Link>
        <Button variant="quiet" size="sm" onClick={clear} className="w-full">
          Empty basket
        </Button>
      </div>
    </>
  )
}

/** Desktop: a column that follows you down the menu. */
export function CartPanel() {
  const { itemCount, isHydrated } = useCart()

  return (
    <aside
      aria-label="Your basket"
      // `self-start` matters: a grid item stretches to the row height by default, and a sticky
      // element that already fills its container has nothing to stick within — the panel would
      // simply scroll away. This is the difference between a basket that follows you down a
      // 171-dish menu and one you have to scroll back up to find.
      className="sticky top-24 hidden self-start overflow-hidden rounded-2xl border border-line bg-surface lg:block"
    >
      <h2 className="flex items-center gap-2.5 border-b border-line px-5 py-4 font-display text-lg font-semibold">
        <Tiffin count={isHydrated ? itemCount : 0} className="size-6 text-brand-text" />
        Your basket{isHydrated && itemCount > 0 ? ` (${itemCount})` : ''}
      </h2>
      {/* A twenty-line basket must not push the checkout button below the fold. */}
      <div className="max-h-[calc(100svh-11rem)] overflow-y-auto">
        <CartContents />
      </div>
    </aside>
  )
}

/** Mobile: a bar pinned to the bottom that opens the basket in a sheet. */
export function CartBar() {
  const { itemCount, pricing, isHydrated } = useCart()
  const [isOpen, setIsOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen && !dialog.open) dialog.showModal()
    if (!isOpen && dialog.open) dialog.close()
  }, [isOpen])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const onClose = () => setIsOpen(false)
    dialog.addEventListener('close', onClose)
    return () => dialog.removeEventListener('close', onClose)
  }, [])

  if (!isHydrated || itemCount === 0) return null

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 p-3 backdrop-blur-md lg:hidden">
        <Button size="lg" className="w-full" onClick={() => setIsOpen(true)}>
          <Tiffin count={itemCount} className="size-5" />
          View basket ({itemCount})
          <span className="ml-auto tabular-nums">
            {pricing ? formatPence(pricing.totalInPence) : ''}
          </span>
        </Button>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="cart-sheet-title"
        className="m-0 mt-auto max-h-[85vh] w-full max-w-none rounded-t-3xl border border-line bg-surface p-0 text-ink backdrop:bg-black/45"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="cart-sheet-title" className="font-display text-lg font-semibold">
            Your basket ({itemCount})
          </h2>
          <Button variant="quiet" size="sm" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </div>
        <div className="overflow-y-auto">
          <CartContents onNavigate={() => setIsOpen(false)} />
        </div>
      </dialog>

      {/* Keeps the last dish clear of the fixed bar. */}
      <div aria-hidden className="h-20 lg:hidden" />
    </>
  )
}
