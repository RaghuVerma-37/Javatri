import { z } from 'zod'
import { MAX_QUANTITY_PER_LINE } from '@/lib/pricing'
import { looksLikeUkPostcode } from '@/lib/geo'

/**
 * One schema per request body, shared by the API route and the form that posts to it.
 *
 * Note what the cart schema does NOT contain: prices. A price arriving from a browser is not
 * validated, it is ignored — there is nowhere in this schema to put one.
 */

export const orderTypeSchema = z.enum(['PICKUP', 'DELIVERY', 'DINE_IN'])
export type OrderTypeValue = z.infer<typeof orderTypeSchema>

export const cartLineSchema = z.object({
  lineId: z.string().min(1).max(64),
  itemId: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_LINE),
  variantIds: z.array(z.string().min(1).max(64)).max(4).default([]),
  modifierIds: z.array(z.string().min(1).max(64)).max(20).default([]),
  notes: z.string().max(300).nullish(),
})

export const cartSchema = z.object({
  orderType: orderTypeSchema,
  lines: z.array(cartLineSchema).max(80),
  requestedFor: z.iso.datetime({ offset: true }).nullish(),
  postcode: z.string().max(12).nullish(),
})

const ukPostcode = z
  .string()
  .min(5, 'Enter a full postcode, including the last three characters.')
  .max(12)
  .refine(looksLikeUkPostcode, 'That does not look like a UK postcode.')

export const deliveryCheckSchema = z.object({
  postcode: ukPostcode,
})

const phone = z
  .string()
  .trim()
  .min(7, 'We need a phone number in case the driver or the kitchen has to call you.')
  .max(24)
  .regex(/^[+0-9()\-.\s]+$/, 'Use digits, spaces, brackets, + and - only.')

const name = z.string().trim().min(2, 'Please give us a name for the order.').max(80)
const email = z.email('We need a valid email address to send your receipt.').max(160)

export const checkoutSchema = z
  .object({
    orderType: orderTypeSchema,
    lines: z.array(cartLineSchema).min(1, 'Your basket is empty.').max(80),
    customerName: name,
    customerEmail: email,
    customerPhone: phone,
    requestedFor: z.iso.datetime({ offset: true }).nullish(),
    isAsap: z.boolean().default(true),
    addressLine1: z.string().trim().max(120).nullish(),
    addressLine2: z.string().trim().max(120).nullish(),
    city: z.string().trim().max(80).nullish(),
    postcode: z.string().trim().max(12).nullish(),
    deliveryNotes: z.string().trim().max(300).nullish(),
    partySize: z.number().int().min(1).max(30).nullish(),
    allergyNotes: z.string().trim().max(500).nullish(),
    notes: z.string().trim().max(500).nullish(),
  })
  .superRefine((value, ctx) => {
    if (value.orderType !== 'DELIVERY') return
    if (!value.addressLine1?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['addressLine1'], message: 'We need a street address to deliver to.' })
    }
    if (!value.postcode?.trim() || !looksLikeUkPostcode(value.postcode)) {
      ctx.addIssue({ code: 'custom', path: ['postcode'], message: 'Enter the delivery postcode.' })
    }
  })

export const reservationSchema = z.object({
  name,
  email,
  phone,
  partySize: z.number().int().min(1, 'How many of you are coming?').max(30),
  dateTime: z.iso.datetime({ offset: true }),
  occasion: z.string().trim().max(80).nullish(),
  allergyNotes: z.string().trim().max(500).nullish(),
  notes: z.string().trim().max(500).nullish(),
})

export const enquirySchema = z.object({
  name,
  email,
  phone,
  eventType: z.string().trim().min(2, 'What kind of event is it?').max(80),
  estimatedGuests: z.number().int().min(1).max(1000).nullish(),
  preferredDate: z.iso.date().nullish(),
  message: z.string().trim().max(2000).nullish(),
})

/** Turn a ZodError into `{ fieldName: 'message' }` for rendering next to inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_'
    if (!out[key]) out[key] = issue.message
  }
  return out
}
