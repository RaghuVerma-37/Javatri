'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { parsePriceInput } from '@/lib/money'
import { parseMinutes } from '@/lib/hours'
import { ALL_ALLERGENS } from '@/lib/allergens'
import type { Allergen } from '@/generated/prisma/enums'

/**
 * Everything staff can change without a developer.
 *
 * Two rules, applied without exception:
 *
 *   1. Every action starts with `requireStaff()`. A Server Action is a public HTTP endpoint with
 *      a generated name — being unreachable from the UI is not access control.
 *   2. Nothing here can change an order's money. Staff move an order through the kitchen; they
 *      cannot alter what was charged for it, because that number is the one the customer agreed
 *      to and Stripe took. Refunds happen in Stripe, where they leave a trail.
 */

async function requireStaff() {
  const session = await auth()
  if (!session?.user) throw new Error('You need to be signed in.')
  return session.user
}

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string }

function fail(error: unknown, fallback: string): ActionResult {
  console.error('[admin]', error)
  return { ok: false, error: error instanceof Error ? error.message : fallback }
}

// ---------------------------------------------------------------------------
// Branch
// ---------------------------------------------------------------------------

/** The "we're slammed, stop the tickets" button. The single most-used control in here. */
export async function toggleOrders(branchId: string, acceptsOrders: boolean): Promise<ActionResult> {
  try {
    await requireStaff()
    await prisma.branch.update({ where: { id: branchId }, data: { acceptsOrders } })
    revalidatePath('/admin', 'layout')
    revalidatePath('/order')
    revalidatePath('/')
    return {
      ok: true,
      message: acceptsOrders ? 'Online orders are back on.' : 'Online orders paused.',
    }
  } catch (error) {
    return fail(error, 'Could not change that.')
  }
}

const branchSettingsSchema = z.object({
  branchId: z.string().min(1),
  acceptsDelivery: z.boolean(),
  acceptsDineIn: z.boolean(),
  acceptsReservations: z.boolean(),
  deliveryRadiusMiles: z.number().min(0).max(50),
  minOrder: z.string(),
  deliveryFee: z.string(),
  freeDeliveryAbove: z.string(),
  pickupLeadMinutes: z.number().int().min(0).max(240),
  deliveryLeadMinutes: z.number().int().min(0).max(240),
  lastOrderMinutesBeforeClose: z.number().int().min(0).max(240),
})

export async function updateBranchSettings(formData: FormData): Promise<ActionResult> {
  try {
    await requireStaff()

    const parsed = branchSettingsSchema.parse({
      branchId: formData.get('branchId'),
      acceptsDelivery: formData.get('acceptsDelivery') === 'on',
      acceptsDineIn: formData.get('acceptsDineIn') === 'on',
      acceptsReservations: formData.get('acceptsReservations') === 'on',
      deliveryRadiusMiles: Number(formData.get('deliveryRadiusMiles')),
      minOrder: String(formData.get('minOrder') ?? ''),
      deliveryFee: String(formData.get('deliveryFee') ?? ''),
      freeDeliveryAbove: String(formData.get('freeDeliveryAbove') ?? ''),
      pickupLeadMinutes: Number(formData.get('pickupLeadMinutes')),
      deliveryLeadMinutes: Number(formData.get('deliveryLeadMinutes')),
      lastOrderMinutesBeforeClose: Number(formData.get('lastOrderMinutesBeforeClose')),
    })

    await prisma.branch.update({
      where: { id: parsed.branchId },
      data: {
        acceptsDelivery: parsed.acceptsDelivery,
        acceptsDineIn: parsed.acceptsDineIn,
        acceptsReservations: parsed.acceptsReservations,
        deliveryRadiusMiles: parsed.deliveryRadiusMiles,
        minOrderInPence: parsePriceInput(parsed.minOrder),
        deliveryFeeInPence: parsePriceInput(parsed.deliveryFee),
        freeDeliveryAboveInPence: parsed.freeDeliveryAbove.trim()
          ? parsePriceInput(parsed.freeDeliveryAbove)
          : null,
        pickupLeadMinutes: parsed.pickupLeadMinutes,
        deliveryLeadMinutes: parsed.deliveryLeadMinutes,
        lastOrderMinutesBeforeClose: parsed.lastOrderMinutesBeforeClose,
      },
    })

    revalidatePath('/admin/branch')
    revalidatePath('/order')
    return { ok: true, message: 'Saved.' }
  } catch (error) {
    return fail(error, 'Could not save those settings.')
  }
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

/** "Sold out tonight." One tap, no form. */
export async function toggleItemAvailability(itemId: string, isAvailable: boolean): Promise<ActionResult> {
  try {
    await requireStaff()
    const item = await prisma.menuItem.update({
      where: { id: itemId },
      data: { isAvailable },
      select: { name: true },
    })
    revalidatePath('/admin/menu')
    revalidatePath('/menu', 'layout')
    revalidatePath('/order')
    return { ok: true, message: `${item.name} is ${isAvailable ? 'back on' : 'sold out'}.` }
  } catch (error) {
    return fail(error, 'Could not change that.')
  }
}

const itemSchema = z.object({
  itemId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(600),
  price: z.string(),
  spiceLevel: z.enum(['NONE', 'MILD', 'HOT', 'EXTRA_HOT']),
  isVegetarian: z.boolean(),
  isVegan: z.boolean(),
  containsAlcohol: z.boolean(),
  isAvailable: z.boolean(),
  allergensConfirmed: z.boolean(),
  allergens: z.array(z.enum(ALL_ALLERGENS as [Allergen, ...Allergen[]])),
})

export async function updateMenuItem(formData: FormData): Promise<ActionResult> {
  try {
    await requireStaff()

    const parsed = itemSchema.parse({
      itemId: formData.get('itemId'),
      name: formData.get('name'),
      description: formData.get('description') ?? '',
      price: String(formData.get('price') ?? ''),
      spiceLevel: formData.get('spiceLevel'),
      isVegetarian: formData.get('isVegetarian') === 'on',
      isVegan: formData.get('isVegan') === 'on',
      containsAlcohol: formData.get('containsAlcohol') === 'on',
      isAvailable: formData.get('isAvailable') === 'on',
      allergensConfirmed: formData.get('allergensConfirmed') === 'on',
      allergens: formData.getAll('allergens').map(String),
    })

    await prisma.menuItem.update({
      where: { id: parsed.itemId },
      data: {
        name: parsed.name,
        description: parsed.description,
        priceInPence: parsePriceInput(parsed.price),
        spiceLevel: parsed.spiceLevel,
        // A vegan dish is vegetarian. Enforced here so the two flags cannot contradict each other
        // however the form is submitted.
        isVegetarian: parsed.isVegan || parsed.isVegetarian,
        isVegan: parsed.isVegan,
        containsAlcohol: parsed.containsAlcohol,
        isAvailable: parsed.isAvailable,
        allergens: parsed.allergens,
        allergensConfirmed: parsed.allergensConfirmed,
      },
    })

    revalidatePath('/admin/menu')
    revalidatePath('/menu', 'layout')
    revalidatePath('/order')
    return { ok: true, message: 'Saved.' }
  } catch (error) {
    return fail(error, 'Could not save that dish.')
  }
}

// ---------------------------------------------------------------------------
// Hours
// ---------------------------------------------------------------------------

/**
 * Replaces the whole week in one transaction.
 *
 * Rewriting all seven days together rather than patching individual rows means the schedule can
 * never be left half-applied — the state the ordering system reads is either entirely the old week
 * or entirely the new one.
 */
export async function updateOpeningHours(formData: FormData): Promise<ActionResult> {
  try {
    await requireStaff()
    const branchId = String(formData.get('branchId') ?? '')
    if (!branchId) throw new Error('Missing branch.')

    const rows: Array<{ branchId: string; dayOfWeek: number; opensAt: number; closesAt: number }> = []

    for (let day = 0; day < 7; day++) {
      if (formData.get(`closed-${day}`) === 'on') continue
      const opens = String(formData.get(`opens-${day}`) ?? '').trim()
      const closes = String(formData.get(`closes-${day}`) ?? '').trim()
      if (!opens || !closes) continue

      const opensAt = parseMinutes(opens)
      let closesAt = parseMinutes(closes)
      // A closing time earlier than the opening time means "after midnight", not a typo.
      if (closesAt <= opensAt) closesAt += 1440

      rows.push({ branchId, dayOfWeek: day, opensAt, closesAt })
    }

    await prisma.$transaction([
      prisma.openingHours.deleteMany({ where: { branchId } }),
      ...(rows.length > 0 ? [prisma.openingHours.createMany({ data: rows })] : []),
    ])

    revalidatePath('/admin/hours')
    revalidatePath('/', 'layout')
    return { ok: true, message: 'Opening hours updated.' }
  } catch (error) {
    return fail(error, 'Could not save those hours.')
  }
}

export async function addHoliday(formData: FormData): Promise<ActionResult> {
  try {
    await requireStaff()
    const branchId = String(formData.get('branchId') ?? '')
    const date = String(formData.get('date') ?? '')
    if (!branchId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Pick a date.')

    const isClosed = formData.get('isClosed') === 'on'
    const opens = String(formData.get('opensAt') ?? '').trim()
    const closes = String(formData.get('closesAt') ?? '').trim()

    const data = {
      isClosed,
      opensAt: !isClosed && opens ? parseMinutes(opens) : null,
      closesAt: !isClosed && closes ? parseMinutes(closes) : null,
      note: String(formData.get('note') ?? '').trim() || null,
    }

    await prisma.holidayOverride.upsert({
      where: { branchId_date: { branchId, date: new Date(`${date}T00:00:00.000Z`) } },
      create: { branchId, date: new Date(`${date}T00:00:00.000Z`), ...data },
      update: data,
    })

    revalidatePath('/admin/hours')
    revalidatePath('/', 'layout')
    return { ok: true, message: 'Saved.' }
  } catch (error) {
    return fail(error, 'Could not save that closure.')
  }
}

export async function deleteHoliday(id: string): Promise<ActionResult> {
  try {
    await requireStaff()
    await prisma.holidayOverride.delete({ where: { id } })
    revalidatePath('/admin/hours')
    revalidatePath('/', 'layout')
    return { ok: true, message: 'Removed.' }
  } catch (error) {
    return fail(error, 'Could not remove that.')
  }
}

// ---------------------------------------------------------------------------
// Orders, reservations, enquiries
// ---------------------------------------------------------------------------

const KITCHEN_STATUSES = ['ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'] as const

export async function setOrderStatus(
  orderId: string,
  status: (typeof KITCHEN_STATUSES)[number],
): Promise<ActionResult> {
  try {
    await requireStaff()

    const now = new Date()
    const timestamps: Record<string, Partial<Record<string, Date>>> = {
      ACCEPTED: { acceptedAt: now },
      READY: { readyAt: now },
      COMPLETED: { completedAt: now },
      CANCELLED: { cancelledAt: now },
    }

    // An order that has not been paid for is not a kitchen ticket. Guarding the transition here
    // stops a mis-click on a stale page moving an unpaid order into the kitchen.
    const result = await prisma.order.updateMany({
      where: {
        id: orderId,
        status: { in: ['PAID', 'ACCEPTED', 'PREPARING', 'READY'] },
      },
      data: { status, ...(timestamps[status] ?? {}) },
    })

    if (result.count === 0) {
      return { ok: false, error: 'That order has already moved on — refresh the page.' }
    }

    revalidatePath('/admin/orders')
    return { ok: true }
  } catch (error) {
    return fail(error, 'Could not update that order.')
  }
}

export async function setReservationStatus(
  id: string,
  status: 'REQUESTED' | 'CONFIRMED' | 'SEATED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW',
): Promise<ActionResult> {
  try {
    await requireStaff()
    await prisma.reservation.update({ where: { id }, data: { status } })
    revalidatePath('/admin/reservations')
    return { ok: true }
  } catch (error) {
    return fail(error, 'Could not update that booking.')
  }
}

export async function setEnquiryStatus(
  id: string,
  status: 'NEW' | 'CONTACTED' | 'QUOTED' | 'WON' | 'LOST',
): Promise<ActionResult> {
  try {
    await requireStaff()
    await prisma.eventEnquiry.update({ where: { id }, data: { status } })
    revalidatePath('/admin/enquiries')
    return { ok: true }
  } catch (error) {
    return fail(error, 'Could not update that enquiry.')
  }
}
