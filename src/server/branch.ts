import { cache } from 'react'
import { prisma } from '@/lib/db'
import {
  isOpenAt,
  nextOpeningAt,
  closingTimeAfter,
  type Schedule,
  type ServiceWindow,
} from '@/lib/hours'
import { DEFAULT_BRANCH_SLUG } from '@/lib/site'

/**
 * `cache` dedupes these within a single request, so a page that renders the header, an open/closed
 * badge and an hours table hits Postgres once rather than three times.
 */
export const getBranch = cache(async (slug: string = DEFAULT_BRANCH_SLUG) => {
  const from = new Date()
  from.setUTCDate(from.getUTCDate() - 1)

  return prisma.branch.findUnique({
    where: { slug },
    include: {
      openingHours: { orderBy: [{ dayOfWeek: 'asc' }, { opensAt: 'asc' }] },
      holidays: { where: { date: { gte: from } }, orderBy: { date: 'asc' } },
    },
  })
})

export type BranchWithHours = NonNullable<Awaited<ReturnType<typeof getBranch>>>

export const requireBranch = cache(async (slug: string = DEFAULT_BRANCH_SLUG) => {
  const branch = await getBranch(slug)
  if (!branch) {
    throw new Error(
      `Branch "${slug}" is not in the database. Run \`npm run db:seed\` — see README.md.`,
    )
  }
  return branch
})

export function toSchedule(branch: BranchWithHours): Schedule {
  return {
    timezone: branch.timezone,
    windows: branch.openingHours.map(
      (h): ServiceWindow => ({ dayOfWeek: h.dayOfWeek, opensAt: h.opensAt, closesAt: h.closesAt }),
    ),
    holidays: branch.holidays.map((h) => ({
      // `@db.Date` comes back as midnight UTC, so slicing the ISO string is the correct read.
      date: h.date.toISOString().slice(0, 10),
      isClosed: h.isClosed,
      opensAt: h.opensAt,
      closesAt: h.closesAt,
    })),
  }
}

export type ServiceState = {
  /** The kitchen's hours say we are open. */
  isOpen: boolean
  /** Hours say open AND a manager has not paused online orders. */
  isAcceptingOrders: boolean
  /** Set when a manager has hit "pause orders" while the restaurant is otherwise open. */
  isPaused: boolean
  closesAt: Date | null
  nextOpensAt: Date | null
}

/**
 * The answer the old site got wrong in three different ways.
 *
 * Note that "we are closed" and "we have paused orders" are different states with different
 * messages, and neither is a dead end: both still let the customer schedule for a later slot.
 */
export function getServiceState(branch: BranchWithHours, at: Date = new Date()): ServiceState {
  const schedule = toSchedule(branch)
  const isOpen = isOpenAt(schedule, at)
  const isPaused = isOpen && branch.isActive && !branch.acceptsOrders

  return {
    isOpen,
    isAcceptingOrders: isOpen && branch.isActive && branch.acceptsOrders,
    isPaused,
    closesAt: closingTimeAfter(schedule, at),
    nextOpensAt: nextOpeningAt(schedule, at),
  }
}
