'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/components/cart/cart-context'

/**
 * Two jobs on the order status page.
 *
 * First, empty the basket once the order is real — and only then. The customer's basket must
 * survive a card being declined, so it is cleared on confirmation, not on reaching this page.
 *
 * Second, refresh while payment is still settling. Stripe redirects the browser back here the
 * instant the card is authorised, which is usually a moment before the webhook lands, so without
 * this the customer would stare at "waiting for payment" until they reloaded by hand.
 */
export function OrderStatusLive({ status }: { status: string }) {
  const router = useRouter()
  const { clear } = useCart()

  const isSettled = status !== 'PENDING_PAYMENT'

  useEffect(() => {
    if (isSettled && status !== 'CANCELLED') clear()
  }, [isSettled, status, clear])

  useEffect(() => {
    if (isSettled) return
    let attempts = 0
    const timer = window.setInterval(() => {
      attempts += 1
      router.refresh()
      // Give up after a minute rather than polling a dead order forever.
      if (attempts >= 20) window.clearInterval(timer)
    }, 3000)
    return () => window.clearInterval(timer)
  }, [isSettled, router])

  return null
}
