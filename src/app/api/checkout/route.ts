import { NextResponse } from 'next/server'
import { checkDelivery } from '@/lib/delivery'
import { getStripe, isStripeConfigured } from '@/lib/stripe'
import { checkoutSchema, fieldErrors } from '@/lib/validation'
import { priceOrder } from '@/server/ordering'
import { createPendingOrder } from '@/server/orders'
import { isDatabaseConfigured } from '@/server/static-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Create the order and the payment intent.
 *
 * The whole point of this route is the third step. The browser sends what it *wants*; the server
 * decides what it *costs*, from the database, and hands that number — and only that number — to
 * Stripe. There is no code path here in which a value from the request body becomes an amount.
 *
 * The order is created as PENDING_PAYMENT and stays that way until Stripe's webhook says the money
 * arrived. It is never confirmed by the customer's browser returning to a success page.
 */
export async function POST(request: Request) {
  // No database means nowhere to record the order, and an order nobody has recorded must never
  // be charged for. This is checked before Stripe, because it is the more fundamental problem.
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        error:
          'This deployment has no database yet, so we cannot record your order. Nothing has been charged. Please call us on 01628 825753.',
      },
      { status: 503 },
    )
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: 'Online payment is not set up on this deployment yet. Please call us to order.' },
      { status: 503 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected JSON.' }, { status: 400 })
  }

  const parsed = checkoutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please check the details below.', fields: fieldErrors(parsed.error) },
      { status: 422 },
    )
  }

  const input = parsed.data

  try {
    // 1. Reprice from the database. The client's idea of the total is not consulted.
    const snapshot = await priceOrder(input.lines, input.orderType, input.requestedFor)

    if (!snapshot.canCheckout) {
      return NextResponse.json(
        {
          error:
            snapshot.blockedReason ??
            snapshot.pricing.problems[0]?.message ??
            'We cannot take that order right now.',
          problems: snapshot.pricing.problems,
        },
        { status: 409 },
      )
    }

    // 2. For delivery, prove the address is actually in range. The postcode gate on /order is a
    //    courtesy to the customer; this is the check that counts, because that one is skippable.
    if (input.orderType === 'DELIVERY') {
      const decision = await checkDelivery(snapshot.branch, input.postcode ?? '')
      if (!decision.ok) {
        return NextResponse.json(
          { error: decision.message, fields: { postcode: decision.message } },
          { status: 409 },
        )
      }
    }

    // 3. Record the order before taking money, so a payment can always be traced to an order.
    const order = await createPendingOrder({
      branchId: snapshot.branch.id,
      type: input.orderType,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      city: input.city,
      postcode: input.postcode,
      deliveryNotes: input.deliveryNotes,
      partySize: input.partySize,
      requestedFor: snapshot.requestedFor,
      isAsap: snapshot.isAsap,
      allergyNotes: input.allergyNotes,
      notes: input.notes,
      subtotalInPence: snapshot.pricing.subtotalInPence,
      deliveryFeeInPence: snapshot.pricing.deliveryFeeInPence,
      totalInPence: snapshot.pricing.totalInPence,
      lines: snapshot.pricing.lines,
    })

    // 4. The amount comes from the snapshot, which came from Postgres.
    const stripe = getStripe()
    const intent = await stripe.paymentIntents.create(
      {
        amount: snapshot.pricing.totalInPence,
        currency: 'gbp',
        automatic_payment_methods: { enabled: true },
        description: `Javatri order ${order.orderNumber}`,
        receipt_email: order.customerEmail,
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          orderType: order.type,
        },
      },
      // Stripe-side idempotency: a double-submitted form returns the same intent rather than
      // creating a second one against the same order.
      { idempotencyKey: `order_${order.id}` },
    )

    await import('@/lib/db').then(({ prisma }) =>
      prisma.order.update({
        where: { id: order.id },
        data: { stripePaymentIntentId: intent.id },
      }),
    )

    return NextResponse.json(
      {
        clientSecret: intent.client_secret,
        publicId: order.publicId,
        orderNumber: order.orderNumber,
        totalInPence: snapshot.pricing.totalInPence,
        requestedFor: snapshot.requestedFor.toISOString(),
      },
      { headers: { 'cache-control': 'no-store' } },
    )
  } catch (error) {
    console.error('[checkout]', error)
    return NextResponse.json(
      { error: 'Something went wrong setting up your payment. Nothing has been charged.' },
      { status: 500 },
    )
  }
}
