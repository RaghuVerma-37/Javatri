import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The Stripe webhook.
 *
 * This is the only thing in the system that can turn a payment into an order, so the tests are
 * about the three ways it can go wrong rather than the way it goes right:
 *
 *   1. An unsigned or badly signed request must be refused. Without that, anyone who finds the URL
 *      can mark every order paid.
 *   2. A duplicate delivery must do nothing. Stripe retries, and can deliver the same event twice
 *      concurrently; a second confirmation email — or worse, a second kitchen ticket — is a real
 *      cost.
 *   3. The status codes must be right. A 500 makes Stripe retry, so a problem retrying cannot fix
 *      has to return 200, and a transient one has to return 500.
 */

const constructEvent = vi.fn()
const stripeEventCreate = vi.fn()
const stripeEventDelete = vi.fn()
const orderFindUnique = vi.fn()
const markOrderPaid = vi.fn()
const markOrderFailed = vi.fn()
const sendOrderEmails = vi.fn()

vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({ webhooks: { constructEvent } }),
  isStripeConfigured: () => true,
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    stripeEvent: { create: stripeEventCreate, delete: stripeEventDelete },
    order: { findUnique: orderFindUnique },
  },
}))

vi.mock('@/server/orders', () => ({
  markOrderPaid: (...args: unknown[]) => markOrderPaid(...args),
  markOrderFailed: (...args: unknown[]) => markOrderFailed(...args),
  sendOrderEmails: (...args: unknown[]) => sendOrderEmails(...args),
  toEmailData: (order: unknown) => order,
}))

const { POST } = await import('@/app/api/webhooks/stripe/route')

function request(body = '{}', signature: string | null = 't=1,v1=deadbeef') {
  return new Request('https://javatri.com/api/webhooks/stripe', {
    method: 'POST',
    headers: signature ? { 'stripe-signature': signature } : {},
    body,
  })
}

const paidIntent = {
  id: 'pi_123',
  metadata: { orderId: 'order_1', orderNumber: 'JV-ABC12' },
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
  stripeEventCreate.mockResolvedValue({ id: 'evt_1' })
  stripeEventDelete.mockResolvedValue({})
  markOrderPaid.mockResolvedValue({ transitioned: true })
  markOrderFailed.mockResolvedValue(undefined)
  sendOrderEmails.mockResolvedValue(undefined)
  orderFindUnique.mockResolvedValue({
    id: 'order_1',
    orderNumber: 'JV-ABC12',
    customerEmail: 'someone@example.com',
    items: [],
  })
})

describe('signature verification', () => {
  it('refuses a request with no signature header', async () => {
    const response = await POST(request('{}', null))
    expect(response.status).toBe(400)
    expect(constructEvent).not.toHaveBeenCalled()
    expect(markOrderPaid).not.toHaveBeenCalled()
  })

  it('refuses a request whose signature does not verify', async () => {
    constructEvent.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature for payload')
    })
    const response = await POST(request())
    expect(response.status).toBe(400)
    expect(markOrderPaid).not.toHaveBeenCalled()
    // Nothing is written to the ledger either — an unverified event is not an event.
    expect(stripeEventCreate).not.toHaveBeenCalled()
  })

  it('verifies against the RAW body, not a re-serialised object', async () => {
    const raw = '{"id":"evt_1","type":"payment_intent.succeeded"}'
    constructEvent.mockReturnValue({
      id: 'evt_1',
      type: 'payment_intent.succeeded',
      data: { object: paidIntent },
    })
    await POST(request(raw))
    expect(constructEvent).toHaveBeenCalledWith(raw, 't=1,v1=deadbeef', 'whsec_test')
  })

  it('refuses to run at all without a configured secret', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET
    const response = await POST(request())
    expect(response.status).toBe(500)
    expect(constructEvent).not.toHaveBeenCalled()
  })
})

describe('payment_intent.succeeded', () => {
  beforeEach(() => {
    constructEvent.mockReturnValue({
      id: 'evt_1',
      type: 'payment_intent.succeeded',
      data: { object: paidIntent },
    })
  })

  it('marks the order paid and sends the emails exactly once', async () => {
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(markOrderPaid).toHaveBeenCalledExactlyOnceWith('order_1', 'pi_123')
    expect(sendOrderEmails).toHaveBeenCalledOnce()
  })

  it('records the event in the ledger before doing any work', async () => {
    await POST(request())
    expect(stripeEventCreate).toHaveBeenCalledWith({
      data: { id: 'evt_1', type: 'payment_intent.succeeded' },
    })
  })

  it('does nothing on a duplicate delivery', async () => {
    // The second insert hits the primary key.
    stripeEventCreate.mockRejectedValueOnce(new Error('Unique constraint failed on the fields: (`id`)'))
    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ received: true, duplicate: true })
    expect(markOrderPaid).not.toHaveBeenCalled()
    expect(sendOrderEmails).not.toHaveBeenCalled()
  })

  it('sends no second email when the order had already been paid', async () => {
    // Belt and braces: even if the ledger were bypassed, the conditional status transition
    // reports that it changed nothing, and the handler stops there.
    markOrderPaid.mockResolvedValue({ transitioned: false })
    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(sendOrderEmails).not.toHaveBeenCalled()
  })

  it('does not retry forever over an event whose order has vanished', async () => {
    markOrderPaid.mockResolvedValue({ transitioned: true })
    orderFindUnique.mockResolvedValue(null)
    const response = await POST(request())

    // 200, not 500: retrying will never find the order, and a permanent 500 makes Stripe hammer
    // the endpoint for days.
    expect(response.status).toBe(200)
    expect(sendOrderEmails).not.toHaveBeenCalled()
  })

  it('ignores an intent with no order attached', async () => {
    constructEvent.mockReturnValue({
      id: 'evt_2',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_stray', metadata: {} } },
    })
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(markOrderPaid).not.toHaveBeenCalled()
  })

  it('asks Stripe to retry when the handler genuinely fails, and clears the ledger first', async () => {
    markOrderPaid.mockRejectedValue(new Error('connection reset'))
    const response = await POST(request())

    expect(response.status).toBe(500)
    // Without this the retry would be swallowed as a duplicate and the order would never confirm.
    expect(stripeEventDelete).toHaveBeenCalledWith({ where: { id: 'evt_1' } })
  })
})

describe('failed and cancelled payments', () => {
  it.each(['payment_intent.payment_failed', 'payment_intent.canceled'])(
    'cancels the pending order on %s',
    async (type) => {
      constructEvent.mockReturnValue({
        id: 'evt_3',
        type,
        data: {
          object: {
            id: 'pi_456',
            metadata: { orderId: 'order_2' },
            last_payment_error: { message: 'Your card was declined.' },
          },
        },
      })

      const response = await POST(request())
      expect(response.status).toBe(200)
      expect(markOrderFailed).toHaveBeenCalledWith('order_2', 'Your card was declined.')
      expect(markOrderPaid).not.toHaveBeenCalled()
    },
  )
})

describe('other events', () => {
  it('acknowledges an event type it does not handle', async () => {
    constructEvent.mockReturnValue({
      id: 'evt_9',
      type: 'charge.updated',
      data: { object: {} },
    })
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(markOrderPaid).not.toHaveBeenCalled()
    expect(markOrderFailed).not.toHaveBeenCalled()
  })
})
