import 'server-only'
import { availableSlots, isMenuAvailableAt, type Slot } from '@/lib/hours'
import { priceCart, type CartLineInput, type CartPricing, type PricingContext } from '@/lib/pricing'
import { getCatalogue } from '@/server/menu'
import { getBranchSafe, getServiceState, toSchedule, type BranchWithHours } from '@/server/branch'
import type { OrderTypeValue } from '@/lib/validation'

/**
 * Everything the ordering flow needs to answer "can this order be placed, when, and for how much".
 *
 * The important property: the server computes the time and the price. The browser proposes a slot
 * and a list of dishes; this module decides whether that slot is real and what those dishes cost.
 */

/** Four days is as far ahead as anyone books a curry, and it keeps the slot list small. */
export const SLOT_HORIZON_DAYS = 4

export function leadMinutesFor(branch: BranchWithHours, orderType: OrderTypeValue): number {
  return orderType === 'DELIVERY' ? branch.deliveryLeadMinutes : branch.pickupLeadMinutes
}

export function slotsFor(
  branch: BranchWithHours,
  orderType: OrderTypeValue,
  from: Date = new Date(),
): Slot[] {
  return availableSlots(toSchedule(branch), {
    from,
    leadMinutes: leadMinutesFor(branch, orderType),
    intervalMinutes: branch.slotIntervalMinutes,
    lastOrderMinutesBeforeClose: branch.lastOrderMinutesBeforeClose,
    horizonDays: SLOT_HORIZON_DAYS,
  })
}

export type ResolvedTime = {
  requestedFor: Date
  isAsap: boolean
  /** Set when the browser asked for a time we cannot honour. */
  rejected: 'not_a_slot' | 'no_slots' | null
}

/**
 * Turn "as soon as possible", or a time the browser proposed, into an instant we will commit to.
 *
 * A proposed time is only accepted if it is one of the slots we actually offer. Not "inside
 * opening hours", not "in the future" — one of the slots. Anything looser and a crafted request
 * books the kitchen for 04:00 on Christmas Day.
 */
export function resolveRequestedTime(
  branch: BranchWithHours,
  orderType: OrderTypeValue,
  requestedForIso: string | null | undefined,
  now: Date = new Date(),
): ResolvedTime {
  const slots = slotsFor(branch, orderType, now)

  if (slots.length === 0) {
    return { requestedFor: now, isAsap: true, rejected: 'no_slots' }
  }

  if (!requestedForIso) {
    return { requestedFor: slots[0].at, isAsap: true, rejected: null }
  }

  const requested = new Date(requestedForIso)
  if (Number.isNaN(requested.getTime())) {
    return { requestedFor: slots[0].at, isAsap: true, rejected: 'not_a_slot' }
  }

  const match = slots.find((slot) => slot.at.getTime() === requested.getTime())
  if (!match) {
    return { requestedFor: slots[0].at, isAsap: true, rejected: 'not_a_slot' }
  }

  return { requestedFor: match.at, isAsap: false, rejected: null }
}

export function pricingContextFor(branch: BranchWithHours, orderType: OrderTypeValue): PricingContext {
  return {
    orderType,
    minOrderInPence: branch.minOrderInPence,
    deliveryFeeInPence: branch.deliveryFeeInPence,
    freeDeliveryAboveInPence: branch.freeDeliveryAboveInPence,
  }
}

export type OrderingSnapshot = {
  branch: BranchWithHours
  pricing: CartPricing
  requestedFor: Date
  isAsap: boolean
  timeRejected: ResolvedTime['rejected']
  slots: Slot[]
  canCheckout: boolean
  /** Why not, in a sentence a customer can act on. */
  blockedReason: string | null
}

/**
 * The single function both /api/cart/price and /api/checkout go through, so the total shown in
 * the basket and the total charged by Stripe cannot come out different — they are the same call.
 */
export async function priceOrder(
  lines: CartLineInput[],
  orderType: OrderTypeValue,
  requestedForIso: string | null | undefined,
  now: Date = new Date(),
): Promise<OrderingSnapshot> {
  const branch = await getBranchSafe()
  if (!branch) throw new Error('No branch available — the database is unreachable.')
  const time = resolveRequestedTime(branch, orderType, requestedForIso, now)
  const catalogue = await getCatalogue(branch.id, time.requestedFor, branch.timezone)
  const pricing = priceCart(lines, catalogue, pricingContextFor(branch, orderType))
  const slots = slotsFor(branch, orderType, now)
  const state = getServiceState(branch, now)

  let blockedReason: string | null = null
  if (!branch.isActive) {
    blockedReason = 'Online ordering is switched off at the moment.'
  } else if (!branch.acceptsOrders) {
    blockedReason = state.isOpen
      ? 'The kitchen has paused online orders — we are very busy. Please call us and we will see what we can do.'
      : 'We are not taking online orders at the moment.'
  } else if (orderType === 'DELIVERY' && !branch.acceptsDelivery) {
    blockedReason = 'We are not delivering at the moment. Collection and dining in are both available.'
  } else if (time.rejected === 'no_slots') {
    blockedReason = 'We have no times available in the next few days. Please give us a call.'
  } else if (time.rejected === 'not_a_slot') {
    blockedReason = 'That time is no longer available — we have moved you to the next one. Please check before paying.'
  }

  return {
    branch,
    pricing,
    requestedFor: time.requestedFor,
    isAsap: time.isAsap,
    timeRejected: time.rejected,
    slots,
    canCheckout: pricing.isOrderable && blockedReason === null,
    blockedReason,
  }
}

/** Menus that can actually be ordered from at a given moment. */
export function menuIsServedAt(
  menu: { daysAvailable: number[]; availableFrom: number | null; availableTo: number | null },
  at: Date,
  timezone: string,
): boolean {
  return isMenuAvailableAt(menu, at, timezone)
}

// ---------------------------------------------------------------------------
// Presentation helpers
// ---------------------------------------------------------------------------

import { formatInLondon, localDateKey } from '@/lib/hours'
import type { SlotOption } from '@/components/order/slot-picker'
import type { OrderTypeValue as OrderType } from '@/lib/validation'

/**
 * Format slots on the server, in London, and send strings.
 *
 * If the browser formatted these, a phone left on holiday time would offer the customer a
 * collection slot an hour out from the one the kitchen has.
 */
export function toSlotOptions(slots: Slot[], timezone: string, now: Date = new Date()): SlotOption[] {
  const today = localDateKey(now, timezone)
  const tomorrow = localDateKey(new Date(now.getTime() + 86_400_000), timezone)

  return slots.map((slot) => ({
    iso: slot.at.toISOString(),
    time: formatInLondon(slot.at, 'HH:mm', timezone),
    dayKey: slot.date,
    dayLabel:
      slot.date === today
        ? 'Today'
        : slot.date === tomorrow
          ? 'Tomorrow'
          : formatInLondon(slot.at, 'EEEE d MMMM', timezone),
  }))
}

/** All three order types' slots, so the picker can switch without another round trip. */
export function slotOptionsByType(
  branch: BranchWithHours,
  now: Date = new Date(),
): Record<OrderType, SlotOption[]> {
  return {
    PICKUP: toSlotOptions(slotsFor(branch, 'PICKUP', now), branch.timezone, now),
    DELIVERY: toSlotOptions(slotsFor(branch, 'DELIVERY', now), branch.timezone, now),
    DINE_IN: toSlotOptions(slotsFor(branch, 'DINE_IN', now), branch.timezone, now),
  }
}

// ---------------------------------------------------------------------------
// Table reservations
// ---------------------------------------------------------------------------

import { windowsForDate, zonedTimeToInstant, formatMinutes } from '@/lib/hours'

/** Nobody wants to be seated ten minutes before the kitchen shuts. */
export const LAST_SEATING_MINUTES_BEFORE_CLOSE = 60
export const RESERVATION_INTERVAL_MINUTES = 30
export const RESERVATION_LEAD_MINUTES = 60
export const RESERVATION_HORIZON_DAYS = 90

export type ReservationTime = { iso: string; label: string }

/**
 * Times a table can be booked for on a given local date.
 *
 * Returns an empty list for a day the restaurant is closed, which is the honest answer — the form
 * then says "we are closed that day" rather than accepting a booking nobody will be there for.
 */
export function reservationTimesFor(
  branch: BranchWithHours,
  dateKey: string,
  now: Date = new Date(),
): ReservationTime[] {
  const schedule = toSchedule(branch)
  const earliest = now.getTime() + RESERVATION_LEAD_MINUTES * 60_000
  const times: ReservationTime[] = []

  for (const window of windowsForDate(schedule, dateKey)) {
    const last = window.closesAt - LAST_SEATING_MINUTES_BEFORE_CLOSE
    for (let minutes = window.opensAt; minutes <= last; minutes += RESERVATION_INTERVAL_MINUTES) {
      const at = zonedTimeToInstant(dateKey, minutes, schedule.timezone)
      if (at.getTime() < earliest) continue
      times.push({ iso: at.toISOString(), label: formatMinutes(minutes) })
    }
  }

  return times
}

/** True when the instant is one we would actually offer — the server-side check on submission. */
export function isValidReservationTime(
  branch: BranchWithHours,
  iso: string,
  now: Date = new Date(),
): boolean {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return false
  if (at.getTime() > now.getTime() + RESERVATION_HORIZON_DAYS * 86_400_000) return false
  const dateKey = localDateKey(at, branch.timezone)
  return reservationTimesFor(branch, dateKey, now).some((time) => time.iso === at.toISOString())
}
