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
import { isDatabaseConfigured, staticBranch } from '@/server/static-data'

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

/**
 * The branch, or null if the site has not been set up yet.
 *
 * "Not set up yet" is a real state, not a bug: a fresh clone, a first deploy before the database
 * is attached, a migration that has run but not been seeded. Pages use this to render a plain
 * explanation of what is missing instead of a stack trace — and it means `next build` can
 * prerender the public pages on a machine with no database, which is exactly what a CI box or a
 * first Vercel deploy is.
 *
 * It deliberately swallows every error, including connection failures. The distinction between
 * "no DATABASE_URL", "cannot reach Postgres" and "tables are empty" matters to a developer, and
 * they get it in the server log; to a visitor they are all the same thing.
 */
export const getBranchSafe = cache(async (slug: string = DEFAULT_BRANCH_SLUG) => {
  // No database configured at all: run read-only from javatri-menu.json. This is a deliberate
  // mode, not a failure — see src/server/static-data.ts.
  if (!isDatabaseConfigured()) return staticBranch()

  try {
    return await getBranch(slug)
  } catch (error) {
    // A DATABASE_URL that is set but unreachable is an outage, and is handled differently on
    // purpose: falling back to the file here would quietly serve prices and availability that
    // may be months out of date, while the ordering flow carried on as though nothing were
    // wrong. Better to say the site is not available and page someone.
    console.error('[branch] database unavailable —', error instanceof Error ? error.message : error)
    return null
  }
})

/**
 * The branches other than the one being shown.
 *
 * Exists so /contact can list Farnham Common honestly — advertised on the old site with no
 * address, phone or hours — without reaching for Prisma directly and taking the page down when
 * there is no database.
 */
export const getOtherBranches = cache(async (excludeSlug: string) => {
  if (!isDatabaseConfigured()) {
    // The file-backed source has only the one active branch; the second is described in the
    // questions document rather than presented as a place a customer could go.
    return []
  }
  try {
    return await prisma.branch.findMany({
      where: { slug: { not: excludeSlug } },
      orderBy: { sortOrder: 'asc' },
    })
  } catch {
    return []
  }
})
