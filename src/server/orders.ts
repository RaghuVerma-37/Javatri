import 'server-only'
import { randomInt } from 'node:crypto'
import { prisma } from '@/lib/db'
import { customerOrderEmail, kitchenOrderEmail, sendEmail, type OrderEmailData } from '@/lib/email'
import type { PricedLine } from '@/lib/pricing'

/**
 * Order creation and the state changes after it.
 *
 * The rule that runs through this file: an order is only ever confirmed by the Stripe webhook,
 * never by the browser coming back to a success URL. A customer who closes the tab mid-payment
 * still gets their food; a customer who forges a redirect does not.
 */

/** Unambiguous alphabet — no O/0, no I/1 — because this gets read out over a noisy phone line. */
const REFERENCE_ALPHABET = 'ACDEFGHJKLMNPQRTUVWXY3456789'

export function generateReference(prefix: string, length = 5): string {
  let out = ''
  for (let i = 0; i < length; i++) out += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)]
  return `${prefix}-${out}`
}

/** Retries on the astronomically unlikely collision rather than failing the customer's order. */
export async function uniqueOrderNumber(): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = generateReference('JV')
    const existing = await prisma.order.findUnique({ where: { orderNumber: candidate } })
    if (!existing) return candidate
  }
  return `JV-${Date.now().toString(36).toUpperCase().slice(-6)}`
}

export type CreateOrderInput = {
  branchId: string
  type: 'PICKUP' | 'DELIVERY' | 'DINE_IN'
  customerName: string
  customerEmail: string
  customerPhone: string
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
  postcode?: string | null
  deliveryNotes?: string | null
  partySize?: number | null
  requestedFor: Date
  isAsap: boolean
  allergyNotes?: string | null
  notes?: string | null
  subtotalInPence: number
  deliveryFeeInPence: number
  totalInPence: number
  lines: PricedLine[]
}

export async function createPendingOrder(input: CreateOrderInput) {
  const orderNumber = await uniqueOrderNumber()

  return prisma.order.create({
    data: {
      orderNumber,
      branchId: input.branchId,
      type: input.type,
      status: 'PENDING_PAYMENT',
      customerName: input.customerName,
      customerEmail: input.customerEmail.toLowerCase(),
      customerPhone: input.customerPhone,
      addressLine1: input.addressLine1 ?? null,
      addressLine2: input.addressLine2 ?? null,
      city: input.city ?? null,
      postcode: input.postcode ?? null,
      deliveryNotes: input.deliveryNotes ?? null,
      partySize: input.partySize ?? null,
      requestedFor: input.requestedFor,
      isAsap: input.isAsap,
      allergyNotes: input.allergyNotes ?? null,
      notes: input.notes ?? null,
      subtotalInPence: input.subtotalInPence,
      deliveryFeeInPence: input.deliveryFeeInPence,
      totalInPence: input.totalInPence,
      items: {
        create: input.lines.map((line) => ({
          itemId: line.itemId,
          // Snapshotted so a price change or a deleted dish next month cannot rewrite history.
          nameSnapshot: line.name,
          descriptionSnapshot: line.description || null,
          spiceLevelSnapshot: line.spiceLevel as 'NONE' | 'MILD' | 'HOT' | 'EXTRA_HOT',
          basePriceInPence: line.basePriceInPence,
          unitPriceInPence: line.unitPriceInPence,
          quantity: line.quantity,
          lineTotalInPence: line.lineTotalInPence,
          selectedVariants: line.selectedVariants,
          selectedModifiers: line.selectedModifiers,
          notes: line.notes,
        })),
      },
    },
    include: { items: true },
  })
}

export type OrderWithItems = Awaited<ReturnType<typeof createPendingOrder>>

/**
 * Mark an order paid. Idempotent by construction: the update is conditional on the order still
 * being PENDING_PAYMENT, so a second webhook delivery updates zero rows and sends no second email.
 */
export async function markOrderPaid(
  orderId: string,
  paymentIntentId: string,
): Promise<{ transitioned: boolean }> {
  const result = await prisma.order.updateMany({
    where: { id: orderId, status: 'PENDING_PAYMENT' },
    data: {
      status: 'PAID',
      paidAt: new Date(),
      stripePaymentIntentId: paymentIntentId,
    },
  })
  return { transitioned: result.count === 1 }
}

export async function markOrderFailed(orderId: string, reason: string) {
  await prisma.order.updateMany({
    where: { id: orderId, status: 'PENDING_PAYMENT' },
    data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: reason },
  })
}

export function toEmailData(order: {
  orderNumber: string
  publicId: string
  type: string
  customerName: string
  customerPhone: string
  customerEmail: string
  requestedFor: Date
  isAsap: boolean
  subtotalInPence: number
  deliveryFeeInPence: number
  totalInPence: number
  allergyNotes: string | null
  notes: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  postcode: string | null
  items: Array<{
    nameSnapshot: string
    quantity: number
    lineTotalInPence: number
    selectedVariants: unknown
    selectedModifiers: unknown
    notes: string | null
  }>
}): OrderEmailData {
  const optionNames = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.flatMap((entry) =>
          typeof entry === 'object' && entry !== null && 'name' in entry
            ? [String((entry as { name: unknown }).name)]
            : [],
        )
      : []

  return {
    orderNumber: order.orderNumber,
    publicId: order.publicId,
    type: order.type as OrderEmailData['type'],
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    requestedFor: order.requestedFor,
    isAsap: order.isAsap,
    subtotalInPence: order.subtotalInPence,
    deliveryFeeInPence: order.deliveryFeeInPence,
    totalInPence: order.totalInPence,
    allergyNotes: order.allergyNotes,
    notes: order.notes,
    address:
      order.type === 'DELIVERY'
        ? [order.addressLine1, order.addressLine2, order.city, order.postcode]
            .filter(Boolean)
            .join(', ')
        : null,
    items: order.items.map((item) => ({
      name: item.nameSnapshot,
      quantity: item.quantity,
      lineTotalInPence: item.lineTotalInPence,
      options: [...optionNames(item.selectedVariants), ...optionNames(item.selectedModifiers)],
      notes: item.notes,
    })),
  }
}

/**
 * Confirmation to the customer, ticket to the kitchen.
 *
 * Never throws and never blocks the caller's success path. The order is paid; a mail provider
 * having a bad minute must not turn that into a failed webhook and a Stripe retry storm.
 */
export async function sendOrderEmails(data: OrderEmailData): Promise<void> {
  const kitchenAddress = process.env.KITCHEN_EMAIL
  const customer = customerOrderEmail(data)
  const kitchen = kitchenOrderEmail(data)

  const results = await Promise.allSettled([
    sendEmail({ to: data.customerEmail, ...customer }),
    kitchenAddress
      ? sendEmail({ to: kitchenAddress, replyTo: data.customerEmail, ...kitchen })
      : Promise.resolve({ sent: false, reason: 'KITCHEN_EMAIL not set' as const }),
  ])

  for (const result of results) {
    if (result.status === 'rejected') console.error('[orders] email failed', result.reason)
  }
}
