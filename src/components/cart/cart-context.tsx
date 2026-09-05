'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { CartPricing } from '@/lib/pricing'
import type { OrderTypeValue } from '@/lib/validation'

/**
 * The cart.
 *
 * It holds item ids, quantities and chosen options. It does not hold prices — not even a cached
 * copy for display. Every number the customer sees comes back from POST /api/cart/price, which
 * reads the current rows out of Postgres. That means the basket total and the amount Stripe
 * charges are computed by the same code from the same data, and a tampered localStorage entry
 * changes what you asked for, never what you pay.
 *
 * The trade is a round trip on every quantity change. It is debounced, the previous total stays
 * on screen while it happens, and it is worth it.
 */

const STORAGE_KEY = 'javatri.cart.v1'
const REPRICE_DEBOUNCE_MS = 250

export type CartLine = {
  lineId: string
  itemId: string
  quantity: number
  variantIds: string[]
  modifierIds: string[]
  notes: string | null
}

export type CartState = {
  orderType: OrderTypeValue
  lines: CartLine[]
  /** Delivery postcode, once checked. */
  postcode: string | null
  /** ISO instant the customer asked for, or null for "as soon as you can". */
  requestedFor: string | null
}

const EMPTY: CartState = { orderType: 'PICKUP', lines: [], postcode: null, requestedFor: null }

type CartContextValue = {
  state: CartState
  pricing: CartPricing | null
  isPricing: boolean
  /** Total number of dishes, used for the header badge. Counted locally so it never lags. */
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

function readStorage(): CartState {
  if (typeof window === 'undefined') return EMPTY
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<CartState>
    return {
      orderType: parsed.orderType ?? 'PICKUP',
      lines: Array.isArray(parsed.lines) ? parsed.lines.filter(isLine) : [],
      postcode: typeof parsed.postcode === 'string' ? parsed.postcode : null,
      requestedFor: typeof parsed.requestedFor === 'string' ? parsed.requestedFor : null,
    }
  } catch {
    // A corrupt or unavailable store (private browsing, quota, a half-written value) must not
    // take the page down with it. An empty basket is a recoverable state.
    return EMPTY
  }
}

function isLine(value: unknown): value is CartLine {
  if (typeof value !== 'object' || value === null) return false
  const line = value as Record<string, unknown>
  return (
    typeof line.lineId === 'string' &&
    typeof line.itemId === 'string' &&
    typeof line.quantity === 'number' &&
    Array.isArray(line.variantIds) &&
    Array.isArray(line.modifierIds)
  )
}

/** Two identical dishes with identical options are one line; different options are two lines. */
function signature(line: Omit<CartLine, 'lineId'>): string {
  return [
    line.itemId,
    [...line.variantIds].sort().join('+'),
    [...line.modifierIds].sort().join('+'),
    line.notes ?? '',
  ].join('|')
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>(EMPTY)
  const [isHydrated, setIsHydrated] = useState(false)
  const [pricing, setPricing] = useState<CartPricing | null>(null)
  const [isPricing, setIsPricing] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // Read localStorage after mount, never during render: the server has no basket, so reading it
  // during render would produce markup the server could not have produced.
  useEffect(() => {
    setState(readStorage())
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage full or blocked — the basket still works for this session */
    }
  }, [state, isHydrated])

  // --- server repricing ----------------------------------------------------
  const linesKey = JSON.stringify(state.lines)
  useEffect(() => {
    if (!isHydrated) return

    if (state.lines.length === 0) {
      setPricing(null)
      setIsPricing(false)
      return
    }

    const timer = setTimeout(() => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setIsPricing(true)

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
        .then((data: { pricing: CartPricing }) => setPricing(data.pricing))
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') return
          // Leave the previous total on screen rather than flashing £0.00, and let the
          // checkout page be the thing that refuses to proceed.
          setPricing(null)
        })
        .finally(() => {
          if (abortRef.current === controller) setIsPricing(false)
        })
    }, REPRICE_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [linesKey, state.orderType, state.requestedFor, state.postcode, isHydrated, state.lines])

  const addLine = useCallback((line: Omit<CartLine, 'lineId'>) => {
    setState((current) => {
      const sig = signature(line)
      const existing = current.lines.find((l) => signature(l) === sig)
      if (existing) {
        return {
          ...current,
          lines: current.lines.map((l) =>
            l.lineId === existing.lineId ? { ...l, quantity: l.quantity + line.quantity } : l,
          ),
        }
      }
      const lineId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`
      return { ...current, lines: [...current.lines, { ...line, lineId }] }
    })
  }, [])

  const setQuantity = useCallback((lineId: string, quantity: number) => {
    setState((current) => ({
      ...current,
      lines:
        quantity <= 0
          ? current.lines.filter((l) => l.lineId !== lineId)
          : current.lines.map((l) => (l.lineId === lineId ? { ...l, quantity } : l)),
    }))
  }, [])

  const removeLine = useCallback((lineId: string) => {
    setState((current) => ({ ...current, lines: current.lines.filter((l) => l.lineId !== lineId) }))
  }, [])

  const clear = useCallback(() => {
    setState((current) => ({ ...current, lines: [], requestedFor: null }))
    setPricing(null)
  }, [])

  const setOrderType = useCallback((orderType: OrderTypeValue) => {
    setState((current) => ({ ...current, orderType }))
  }, [])

  const setPostcode = useCallback((postcode: string | null) => {
    setState((current) => ({ ...current, postcode }))
  }, [])

  const setRequestedFor = useCallback((requestedFor: string | null) => {
    setState((current) => ({ ...current, requestedFor }))
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
      isHydrated,
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
      isHydrated,
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
