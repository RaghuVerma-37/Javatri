'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import {
  cartStore,
  lineSignature,
  newLineId,
  type CartLine,
  type CartState,
} from '@/components/cart/cart-store'
import type { CartPricing } from '@/lib/pricing'
import type { OrderTypeValue } from '@/lib/validation'

/**
 * The basket, and its prices.
 *
 * The basket itself lives in localStorage and is read through `useSyncExternalStore` (see
 * cart-store.ts). It holds item ids, quantities and chosen options — and no prices, not even a
 * cached copy for display.
 *
 * Every number the customer sees comes back from POST /api/cart/price, which reads the current
 * rows out of Postgres. So the basket total and the amount Stripe charges are computed by the
 * same code from the same data, and a tampered localStorage entry changes what you asked for,
 * never what you pay.
 *
 * The trade is a round trip on every quantity change. It is debounced, the previous total stays
 * on screen while it happens, and it is worth it.
 */

const REPRICE_DEBOUNCE_MS = 250

export type { CartLine, CartState }

type CartContextValue = {
  state: CartState
  pricing: CartPricing | null
  isPricing: boolean
  /** Counted locally from the basket, so the header badge never lags behind a tap. */
  itemCount: number
  isHydrated: boolean
  addLine: (line: Omit<CartLine, 'lineId'>) => void
  setQuantity: (lineId: string, quantity: number) => void
  removeLine: (lineId: string) => void
  clear: () => void
  setOrderType: (orderType: OrderTypeValue) => void
  setPostcode: (postcode: string | null) => void
  setRequestedFor: (iso: string | null) => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getSnapshot,
    cartStore.getServerSnapshot,
  )

  const [fetchedPricing, setFetchedPricing] = useState<CartPricing | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const isEmpty = state.lines.length === 0
  const linesKey = JSON.stringify(state.lines)

  useEffect(() => {
    if (!state.isHydrated || isEmpty) return

    const timer = setTimeout(() => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setIsFetching(true)

      fetch('/api/cart/price', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          orderType: state.orderType,
          lines: state.lines,
          requestedFor: state.requestedFor,
          postcode: state.postcode,
        }),
      })
        .then((response) => (response.ok ? response.json() : Promise.reject(new Error('price failed'))))
        .then((data: { pricing: CartPricing }) => setFetchedPricing(data.pricing))
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') return
          // Drop the stale total rather than showing a number we can no longer stand behind.
          // The checkout button is gated on `pricing.isOrderable`, so this blocks payment.
          setFetchedPricing(null)
        })
        .finally(() => {
          if (abortRef.current === controller) setIsFetching(false)
        })
    }, REPRICE_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [linesKey, state.orderType, state.requestedFor, state.postcode, state.isHydrated, state.lines, isEmpty])

  // Derived, not stored. An empty basket has no price by definition, so there is nothing to
  // synchronise and no reason to set state from inside the effect above.
  const pricing = isEmpty ? null : fetchedPricing
  const isPricing = !isEmpty && isFetching

  const addLine = useCallback((line: Omit<CartLine, 'lineId'>) => {
    cartStore.update((current) => {
      const signature = lineSignature(line)
      const existing = current.lines.find((l) => lineSignature(l) === signature)
      if (existing) {
        return {
          ...current,
          lines: current.lines.map((l) =>
            l.lineId === existing.lineId ? { ...l, quantity: l.quantity + line.quantity } : l,
          ),
        }
      }
      return { ...current, lines: [...current.lines, { ...line, lineId: newLineId() }] }
    })
  }, [])

  const setQuantity = useCallback((lineId: string, quantity: number) => {
    cartStore.update((current) => ({
      ...current,
      lines:
        quantity <= 0
          ? current.lines.filter((l) => l.lineId !== lineId)
          : current.lines.map((l) => (l.lineId === lineId ? { ...l, quantity } : l)),
    }))
  }, [])

  const removeLine = useCallback((lineId: string) => {
    cartStore.update((current) => ({
      ...current,
      lines: current.lines.filter((l) => l.lineId !== lineId),
    }))
  }, [])

  const clear = useCallback(() => {
    cartStore.update((current) => ({ ...current, lines: [], requestedFor: null }))
  }, [])

  const setOrderType = useCallback((orderType: OrderTypeValue) => {
    cartStore.update((current) => ({ ...current, orderType }))
  }, [])

  const setPostcode = useCallback((postcode: string | null) => {
    cartStore.update((current) => ({ ...current, postcode }))
  }, [])

  const setRequestedFor = useCallback((requestedFor: string | null) => {
    cartStore.update((current) => ({ ...current, requestedFor }))
  }, [])

  const itemCount = useMemo(
    () => state.lines.reduce((sum, line) => sum + line.quantity, 0),
    [state.lines],
  )

  const value = useMemo<CartContextValue>(
    () => ({
      state,
      pricing,
      isPricing,
      itemCount,
      isHydrated: state.isHydrated,
      addLine,
      setQuantity,
      removeLine,
      clear,
      setOrderType,
      setPostcode,
      setRequestedFor,
    }),
    [
      state,
      pricing,
      isPricing,
      itemCount,
      addLine,
      setQuantity,
      removeLine,
      clear,
      setOrderType,
      setPostcode,
      setRequestedFor,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used inside <CartProvider>')
  return context
}
