'use client'

import { createContext, useCallback, useContext, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { OUTLET_COOKIE, OUTLET_COOKIE_MAX_AGE } from '@/lib/outlet'

export type Outlet = {
  slug: string
  name: string
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  postcode: string | null
  phone: string | null
  acceptsOrders: boolean
  acceptsDelivery: boolean
  deliveryRadiusMiles: number
}

type OutletState = {
  outlets: Outlet[]
  current: Outlet | null
  /** Whether this visitor has already picked a kitchen. Decided on the server from the cookie. */
  hasChosen: boolean
  choose: (slug: string) => void
}

const OutletContext = createContext<OutletState | null>(null)

export function OutletProvider({
  outlets,
  selectedSlug,
  hasChosen,
  children,
}: {
  outlets: Outlet[]
  selectedSlug: string
  hasChosen: boolean
  children: React.ReactNode
}) {
  const router = useRouter()

  const choose = useCallback(
    (slug: string) => {
      /*
        Written here rather than through a server action: the cookie is the only state, the server
        reads it on the next render, and `router.refresh()` is what re-renders every server
        component against the new outlet. A round trip to set one cookie would be slower and no
        more correct.

        No Secure flag hard-coded — that would drop the cookie on http://localhost during
        development, and the browser applies HTTPS rules from the page's own origin anyway.
      */
      document.cookie = `${OUTLET_COOKIE}=${encodeURIComponent(slug)}; path=/; max-age=${OUTLET_COOKIE_MAX_AGE}; samesite=lax`
      router.refresh()
    },
    [router],
  )

  const value = useMemo<OutletState>(
    () => ({
      outlets,
      current: outlets.find((outlet) => outlet.slug === selectedSlug) ?? outlets[0] ?? null,
      hasChosen,
      choose,
    }),
    [outlets, selectedSlug, hasChosen, choose],
  )

  return <OutletContext.Provider value={value}>{children}</OutletContext.Provider>
}

/** Null outside the provider, so a component can render in isolation without blowing up. */
export function useOutlet(): OutletState | null {
  return useContext(OutletContext)
}
