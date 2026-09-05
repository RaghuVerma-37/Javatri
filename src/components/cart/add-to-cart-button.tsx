'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { useCart } from '@/components/cart/cart-context'
import { Button } from '@/components/ui'
import { formatPence } from '@/lib/money'

/**
 * Add to basket, with the options dialog when a dish has any.
 *
 * Built on the native <dialog> element rather than a div-with-a-backdrop: focus trapping, Escape
 * to close, inertness of the page behind, and the correct role all come free and correct, which
 * is more than most hand-rolled modals manage.
 */

export type AddToCartItem = {
  id: string
  name: string
  priceInPence: number
  isAvailable: boolean
  variants: Array<{ id: string; name: string; priceDeltaInPence: number; isAvailable: boolean }>
  modifierGroups: Array<{
    id: string
    name: string
    minSelect: number
    maxSelect: number
    isRequired: boolean
    modifiers: Array<{ id: string; name: string; priceInPence: number; isAvailable: boolean }>
  }>
}

export function AddToCartButton({ item }: { item: AddToCartItem }) {
  const { addLine } = useCart()
  const [justAdded, setJustAdded] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const hasOptions = item.variants.length > 0 || item.modifierGroups.length > 0

  useEffect(() => {
    if (!justAdded) return
    const timer = setTimeout(() => setJustAdded(false), 1800)
    return () => clearTimeout(timer)
  }, [justAdded])

  if (!item.isAvailable) {
    return (
      <Button size="sm" variant="secondary" disabled>
        Sold out
      </Button>
    )
  }

  const addSimple = () => {
    addLine({ itemId: item.id, quantity: 1, variantIds: [], modifierIds: [], notes: null })
    setJustAdded(true)
  }

  return (
    <>
      <Button
        size="sm"
        variant={justAdded ? 'secondary' : 'primary'}
        onClick={hasOptions ? () => setIsDialogOpen(true) : addSimple}
        // A live region announces the addition; the icon change alone is invisible to a screen reader.
        aria-live="polite"
      >
        {justAdded ? (
          <>
            <Check aria-hidden className="size-4" /> Added
          </>
        ) : (
          <>
            <Plus aria-hidden className="size-4" /> {hasOptions ? 'Choose' : 'Add'}
          </>
        )}
        <span className="sr-only"> {item.name}</span>
      </Button>

      {hasOptions && isDialogOpen ? (
        <OptionsDialog
          item={item}
          onClose={() => setIsDialogOpen(false)}
          onAdded={() => {
            setIsDialogOpen(false)
            setJustAdded(true)
          }}
        />
      ) : null}
    </>
  )
}

function OptionsDialog({
  item,
  onClose,
  onAdded,
}: {
  item: AddToCartItem
  onClose: () => void
  onAdded: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const { addLine } = useCart()

  const [variantId, setVariantId] = useState<string | null>(
    item.variants.find((v) => v.isAvailable)?.id ?? null,
  )
  const [modifierIds, setModifierIds] = useState<string[]>([])
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    // `close` fires for Escape and for the backdrop, so one listener covers every exit.
    const handleClose = () => onClose()
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [onClose])

  const selectedVariant = item.variants.find((v) => v.id === variantId)
  const selectedModifiers = item.modifierGroups
    .flatMap((g) => g.modifiers)
    .filter((m) => modifierIds.includes(m.id))

  const unitPrice =
    item.priceInPence +
    (selectedVariant?.priceDeltaInPence ?? 0) +
    selectedModifiers.reduce((sum, m) => sum + m.priceInPence, 0)

  const missingRequired = item.modifierGroups.filter(
    (g) => g.isRequired && !g.modifiers.some((m) => modifierIds.includes(m.id)),
  )
  const canAdd = (item.variants.length === 0 || variantId !== null) && missingRequired.length === 0

  const submit = () => {
    if (!canAdd) return
    addLine({
      itemId: item.id,
      quantity,
      variantIds: variantId ? [variantId] : [],
      modifierIds,
      notes: notes.trim() || null,
    })
    onAdded()
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="dish-options-title"
      className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/45"
    >
      <form
        method="dialog"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <div className="border-b border-line px-5 py-4">
          <h2 id="dish-options-title" className="font-display text-xl font-semibold">
            {item.name}
          </h2>
        </div>

        <div className="max-h-[60vh] space-y-6 overflow-y-auto px-5 py-5">
          {item.variants.length > 0 ? (
            <fieldset>
              <legend className="text-sm font-semibold text-ink">
                Choose one <span className="font-normal text-muted">(required)</span>
              </legend>
              <div className="mt-3 space-y-1">
                {item.variants.map((variant) => (
                  <label
                    key={variant.id}
                    className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-2 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
                  >
                    <input
                      type="radio"
                      name="variant"
                      value={variant.id}
                      checked={variantId === variant.id}
                      disabled={!variant.isAvailable}
                      onChange={() => setVariantId(variant.id)}
                      className="size-4 accent-[var(--brand)]"
                    />
                    <span className="flex-1 text-[0.9375rem]">{variant.name}</span>
                    {variant.priceDeltaInPence !== 0 ? (
                      <span className="text-sm tabular-nums text-muted">
                        {variant.priceDeltaInPence > 0 ? '+' : ''}
                        {formatPence(variant.priceDeltaInPence)}
                      </span>
                    ) : null}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          {item.modifierGroups.map((group) => {
            const single = group.maxSelect === 1
            return (
              <fieldset key={group.id}>
                <legend className="text-sm font-semibold text-ink">
                  {group.name}{' '}
                  <span className="font-normal text-muted">
                    {group.isRequired ? '(required)' : '(optional)'}
                  </span>
                </legend>
                <div className="mt-3 space-y-1">
                  {group.modifiers.map((modifier) => {
                    const checked = modifierIds.includes(modifier.id)
                    return (
                      <label
                        key={modifier.id}
                        className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-2 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
                      >
                        <input
                          type={single ? 'radio' : 'checkbox'}
                          name={group.id}
                          checked={checked}
                          disabled={!modifier.isAvailable}
                          onChange={(event) => {
                            setModifierIds((current) => {
                              const withoutGroup = current.filter(
                                (id) => !group.modifiers.some((m) => m.id === id),
                              )
                              if (single) return event.target.checked ? [...withoutGroup, modifier.id] : withoutGroup
                              const others = current.filter((id) => id !== modifier.id)
                              if (!event.target.checked) return others
                              const inGroup = others.filter((id) =>
                                group.modifiers.some((m) => m.id === id),
                              )
                              // Enforce maxSelect in the UI as well as on the server, so the
                              // customer is stopped before they get an error at checkout.
                              if (inGroup.length >= group.maxSelect) return current
                              return [...others, modifier.id]
                            })
                          }}
                          className="size-4 accent-[var(--brand)]"
                        />
                        <span className="flex-1 text-[0.9375rem]">{modifier.name}</span>
                        {modifier.priceInPence !== 0 ? (
                          <span className="text-sm tabular-nums text-muted">
                            +{formatPence(modifier.priceInPence)}
                          </span>
                        ) : null}
                      </label>
                    )
                  })}
                </div>
              </fieldset>
            )
          })}

          <div>
            <label htmlFor="dish-notes" className="text-sm font-semibold text-ink">
              Anything the kitchen should know?{' '}
              <span className="font-normal text-muted">(optional)</span>
            </label>
            <textarea
              id="dish-notes"
              value={notes}
              maxLength={300}
              rows={2}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="e.g. no coriander"
              className="mt-2 w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-[0.9375rem] placeholder:text-muted/70"
            />
            <p className="mt-1.5 text-xs text-muted">
              Not the place for allergies — tell us about those in the box at checkout, and call us
              if it is serious.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-line px-5 py-4">
          <div className="flex items-center rounded-full border border-line-strong">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex size-10 items-center justify-center rounded-l-full text-lg hover:bg-surface-2"
            >
              <span aria-hidden>&minus;</span>
              <span className="sr-only">One fewer</span>
            </button>
            <span aria-live="polite" className="w-8 text-center text-[0.9375rem] tabular-nums">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(50, q + 1))}
              className="flex size-10 items-center justify-center rounded-r-full text-lg hover:bg-surface-2"
            >
              <span aria-hidden>+</span>
              <span className="sr-only">One more</span>
            </button>
          </div>

          <Button type="submit" disabled={!canAdd} className="flex-1">
            Add {formatPence(unitPrice * quantity)}
          </Button>
        </div>

        {missingRequired.length > 0 ? (
          <p role="status" className="px-5 pb-4 text-sm text-danger">
            Choose {missingRequired.map((g) => g.name.toLowerCase()).join(' and ')} first.
          </p>
        ) : null}
      </form>
    </dialog>
  )
}
