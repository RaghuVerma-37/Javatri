import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { prisma } from '@/lib/db'
import { getStripe } from '@/lib/stripe'
import { markOrderFailed, markOrderPaid, sendOrderEmails, toEmailData } from '@/server/orders'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Stripe webhook. This is where an order actually becomes real.
 *
 * Three things have to be right here, and all three are easy to get wrong:
 *
 *   1. **Signature.** The raw body is verified against STRIPE_WEBHOOK_SECRET before it is parsed.
 *      Without that, anyone who knows the URL can mark every order paid.
 *   2. **Idempotency.** Stripe retries, and can deliver the same event twice at once. The event id
 *      is inserted into StripeEvent first; a duplicate hits the primary key, and we stop. The
 *      status change is *also* conditional on the order still being PENDING_PAYMENT, so even a
 *      race that got past the ledger cannot send two confirmation emails.
 *   3. **Status codes.** A 500 makes Stripe retry. So a failure we cannot fix by retrying — an
 *      event for an order that no longer exists — returns 200, and only genuinely transient
 *      failures return 500.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 500 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature.' }, { status: 400 })
  }

  // Must be the raw body. Any parsing before this invalidates the signature.
  const payload = await request.text()

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret)
  } catch (error) {
    console.warn('[stripe-webhook] signature verification failed', error)
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  // The idempotency ledger. Inserting first means a duplicate delivery never reaches the handler.
  try {
    await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } })
  } catch {
    // Unique violation: we have processed this event already. That is a success, not an error —
    // returning anything but 200 would make Stripe retry it forever.
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handleSucceeded(event.data.object)
        break
      case 'payment_intent.payment_failed':
      case 'payment_intent.canceled':
        await handleFailed(event.data.object)
        break
      default:
        break
    }
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[stripe-webhook] handler failed', event.type, error)
    // Let Stripe retry. The ledger row is removed so the retry is not swallowed as a duplicate.
    await prisma.stripeEvent.delete({ where: { id: event.id } }).catch(() => undefined)
    return NextResponse.json({ error: 'Handler failed.' }, { status: 500 })
  }
}

async function handleSucceeded(intent: Stripe.PaymentIntent) {
  const orderId = intent.metadata?.orderId
  if (!orderId) {
    console.warn('[stripe-webhook] succeeded intent with no orderId', intent.id)
    return
  }

  const { transitioned } = await markOrderPaid(orderId, intent.id)
  if (!transitioned) {
    // Already paid, or cancelled. Either way there is nothing left to do and no email to send.
    return
  }

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } })
  if (!order) {
    console.error('[stripe-webhook] paid an order that has since vanished', orderId)
    return
  }

  await sendOrderEmails(toEmailData(order))
}

async function handleFailed(intent: Stripe.PaymentIntent) {
  const orderId = intent.metadata?.orderId
  if (!orderId) return
  await markOrderFailed(
    orderId,
    intent.last_payment_error?.message ?? 'Payment was not completed.',
  )
}
