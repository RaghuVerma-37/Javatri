import 'server-only'
import Stripe from 'stripe'

/**
 * Stripe, lazily. Importing this module must not throw when the key is absent — the marketing
 * pages build and render perfectly well without payments configured, and the error should appear
 * when someone tries to pay, with a message that says what to do.
 */

let client: Stripe | null = null

export function getStripe(): Stripe {
  if (client) return client
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY is not set. Online payment is disabled until it is — see README.md.',
    )
  }
  client = new Stripe(key, {
    // Pinned. An unpinned API version means Stripe can change the shape of a webhook payload
    // under a running restaurant.
    apiVersion: '2026-08-26.dahlia',
    typescript: true,
    appInfo: { name: 'Javatri', version: '1.0.0' },
  })
  return client
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
}
