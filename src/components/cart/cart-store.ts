import type { OrderTypeValue } from '@/lib/validation'

/**
 * The basket, as an external store.
 *
 * The basket genuinely lives in localStorage, not in React — it has to survive a refresh, and it
 * is shared between every tab the customer has open. Modelling it as React state and syncing it
 * in an effect gets both of those subtly wrong: the first render disagrees with the server, and
 * two tabs quietly diverge until one overwrites the other.
 *
 * So it is a store, read through `useSyncExternalStore`. The server snapshot is empty (the server
 * has no basket), the client hydrates on subscribe, and a `storage` event from another tab is
 * just another update.
 *
 * It holds item ids and quantities. It does not hold prices — see cart-context.tsx.
 */

const STORAGE_KEY = 'javatri.cart.v1'

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
  postcode: string | null
  requestedFor: string | null
  /** False until localStorage has been read, so the UI can avoid flashing an empty basket. */
  isHydrated: boolean
}

export const EMPTY_CART: CartState = {
  orderType: 'PICKUP',
  lines: [],
  postcode: null,
  requestedFor: null,
  isHydrated: false,
}

/**
 * The one object `getSnapshot` returns. It is replaced, never mutated: React compares snapshots
 * by identity, so mutating this in place would render nothing, and rebuilding it on every call
 * would loop forever.
 */
let snapshot: CartState = EMPTY_CART
const listeners = new Set<() => void>()

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

function readStorage(): CartState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...EMPTY_CART, isHydrated: true }
    const parsed = JSON.parse(raw) as Partial<CartState>
    return {
      orderType: parsed.orderType ?? 'PICKUP',
      lines: Array.isArray(parsed.lines) ? parsed.lines.filter(isLine) : [],
      postcode: typeof parsed.postcode === 'string' ? parsed.postcode : null,
      requestedFor: typeof parsed.requestedFor === 'string' ? parsed.requestedFor : null,
      isHydrated: true,
    }
  } catch {
    // A corrupt value, a private window, a browser with storage disabled. An empty basket is a
    // recoverable state; taking the page down over it is not.
    return { ...EMPTY_CART, isHydrated: true }
  }
}

function writeStorage(state: CartState) {
  try {
    // `isHydrated` is a fact about this session, not about the basket, so it is not persisted.
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        orderType: state.orderType,
        lines: state.lines,
        postcode: state.postcode,
        requestedFor: state.requestedFor,
      }),
    )
  } catch {
    /* quota, or storage blocked — the basket still works for this session */
  }
}

function emit() {
  for (const listener of listeners) listener()
}

function setSnapshot(next: CartState) {
  snapshot = next
  emit()
}

export const cartStore = {
  subscribe(listener: () => void) {
    listeners.add(listener)

    // First subscriber reads localStorage. Doing it here rather than in an effect is what keeps
    // the first client render identical to the server's.
    if (!snapshot.isHydrated) setSnapshot(readStorage())

    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== STORAGE_KEY) return
      setSnapshot(readStorage())
    }
    window.addEventListener('storage', onStorage)

    return () => {
      listeners.delete(listener)
      if (listeners.size === 0) window.removeEventListener('storage', onStorage)
    }
  },

  getSnapshot(): CartState {
    return snapshot
  },

  /** The server has no basket. */
  getServerSnapshot(): CartState {
    return EMPTY_CART
  },

  update(next: (current: CartState) => CartState) {
    const updated = next(snapshot)
    writeStorage(updated)
    setSnapshot(updated)
  },
}

/** Two identical dishes with identical options are one line; different options are two lines. */
export function lineSignature(line: Omit<CartLine, 'lineId'>): string {
  return [
    line.itemId,
    [...line.variantIds].sort().join('+'),
    [...line.modifierIds].sort().join('+'),
    line.notes ?? '',
  ].join('|')
}

export function newLineId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}
