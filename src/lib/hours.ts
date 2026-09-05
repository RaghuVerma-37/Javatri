/**
 * Opening-hours arithmetic, in Europe/London, without a single naive Date.
 *
 * Everything in here is a pure function over plain data — no Prisma import — so the tests can
 * hammer it directly. The one rule: a "time of day" is an Int of minutes since local midnight,
 * and the only place a wall clock becomes an instant is `zonedTimeToInstant` below, which goes
 * through date-fns-tz and therefore respects BST.
 *
 * A close time after midnight is stored as >= 1440 (e.g. 1500 = 01:00 the following day).
 */
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'

export const MINUTES_IN_DAY = 1440

export type ServiceWindow = {
  /** 0 = Sunday … 6 = Saturday, matching Date#getDay(). */
  dayOfWeek: number
  opensAt: number
  closesAt: number
}

export type HolidayRule = {
  /** Local calendar date, `yyyy-MM-dd`. */
  date: string
  isClosed: boolean
  opensAt: number | null
  closesAt: number | null
}

export type Schedule = {
  timezone: string
  windows: ServiceWindow[]
  holidays: HolidayRule[]
}

/** A concrete open period on the timeline. */
export type Occurrence = {
  /** Local calendar date the window belongs to. */
  date: string
  start: Date
  end: Date
  opensAt: number
  closesAt: number
}

// ---------------------------------------------------------------------------
// Wall clock <-> instant
// ---------------------------------------------------------------------------

/** Local calendar date of an instant, as `yyyy-MM-dd`. */
export function localDateKey(at: Date, timezone: string): string {
  return formatInTimeZone(at, timezone, 'yyyy-MM-dd')
}

/** Minutes since local midnight for an instant. */
export function localMinutes(at: Date, timezone: string): number {
  const [h, m] = formatInTimeZone(at, timezone, 'HH:mm').split(':')
  return Number(h) * 60 + Number(m)
}

/**
 * Day of week (0 = Sunday) for an instant, in the given zone.
 * Derived from the local date key rather than a locale-dependent format token, so it cannot
 * drift with the runtime's locale.
 */
export function localDayOfWeek(at: Date, timezone: string): number {
  return dayOfWeekForDateKey(localDateKey(at, timezone))
}

export function dayOfWeekForDateKey(dateKey: string): number {
  return new Date(`${dateKey}T00:00:00.000Z`).getUTCDay()
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * Turn a local calendar date plus minutes-since-midnight into a real instant.
 * Minutes >= 1440 roll onto the following calendar day(s) before conversion, so a window that
 * closes at 01:00 lands on the right side of a DST change.
 */
export function zonedTimeToInstant(dateKey: string, minutes: number, timezone: string): Date {
  const dayOffset = Math.floor(minutes / MINUTES_IN_DAY)
  const within = minutes - dayOffset * MINUTES_IN_DAY
  const targetDate = dayOffset === 0 ? dateKey : addDaysToDateKey(dateKey, dayOffset)
  const hh = String(Math.floor(within / 60)).padStart(2, '0')
  const mm = String(within % 60).padStart(2, '0')
  return fromZonedTime(`${targetDate}T${hh}:${mm}:00`, timezone)
}

export function formatMinutes(minutes: number): string {
  const within = ((minutes % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY
  const hh = String(Math.floor(within / 60)).padStart(2, '0')
  const mm = String(within % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

export function parseMinutes(value: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) throw new Error(`Not a HH:mm time: ${value}`)
  const hours = Number(match[1])
  const mins = Number(match[2])
  if (mins > 59) throw new Error(`Not a HH:mm time: ${value}`)
  return hours * 60 + mins
}

// ---------------------------------------------------------------------------
// Windows
// ---------------------------------------------------------------------------

/**
 * The service windows that apply on a given local date, with any holiday override applied.
 * A date with no windows is closed — absence is the only "closed" state in the model.
 */
export function windowsForDate(schedule: Schedule, dateKey: string): Array<{ opensAt: number; closesAt: number }> {
  const holiday = schedule.holidays.find((h) => h.date === dateKey)
  if (holiday) {
    if (holiday.isClosed) return []
    if (holiday.opensAt === null || holiday.closesAt === null) return []
    return [{ opensAt: holiday.opensAt, closesAt: holiday.closesAt }]
  }
  const dow = dayOfWeekForDateKey(dateKey)
  return schedule.windows
    .filter((w) => w.dayOfWeek === dow)
    .map((w) => ({ opensAt: w.opensAt, closesAt: w.closesAt }))
    .sort((a, b) => a.opensAt - b.opensAt)
}

/**
 * Every open period overlapping a span of days around `from`, sorted by start.
 * Starts a day early so a window that opened yesterday and closes after midnight is included.
 */
export function occurrencesBetween(schedule: Schedule, from: Date, days: number): Occurrence[] {
  const startKey = addDaysToDateKey(localDateKey(from, schedule.timezone), -1)
  const out: Occurrence[] = []
  for (let i = 0; i <= days + 1; i++) {
    const dateKey = addDaysToDateKey(startKey, i)
    for (const w of windowsForDate(schedule, dateKey)) {
      if (w.closesAt <= w.opensAt) continue // malformed; ignore rather than invert
      out.push({
        date: dateKey,
        opensAt: w.opensAt,
        closesAt: w.closesAt,
        start: zonedTimeToInstant(dateKey, w.opensAt, schedule.timezone),
        end: zonedTimeToInstant(dateKey, w.closesAt, schedule.timezone),
      })
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime())
}

export function currentOccurrence(schedule: Schedule, at: Date): Occurrence | null {
  const t = at.getTime()
  for (const occ of occurrencesBetween(schedule, at, 1)) {
    if (occ.start.getTime() <= t && t < occ.end.getTime()) return occ
  }
  return null
}

export function isOpenAt(schedule: Schedule, at: Date): boolean {
  return currentOccurrence(schedule, at) !== null
}

/**
 * When the branch is next open. Returns `at` itself if it is open now.
 * Null if it is not open at any point inside the horizon — which is a real answer, and the UI
 * has to say "we'll be back" rather than pretend a slot exists.
 */
export function nextOpeningAt(schedule: Schedule, at: Date, horizonDays = 14): Date | null {
  const t = at.getTime()
  for (const occ of occurrencesBetween(schedule, at, horizonDays)) {
    if (occ.start.getTime() <= t && t < occ.end.getTime()) return at
    if (occ.start.getTime() > t) return occ.start
  }
  return null
}

export function closingTimeAfter(schedule: Schedule, at: Date): Date | null {
  return currentOccurrence(schedule, at)?.end ?? null
}

// ---------------------------------------------------------------------------
// Menu availability
// ---------------------------------------------------------------------------

export type MenuAvailability = {
  /** Empty means "every day the branch is open". */
  daysAvailable: number[]
  availableFrom: number | null
  availableTo: number | null
}

export function isMenuAvailableAt(menu: MenuAvailability, at: Date, timezone: string): boolean {
  if (menu.daysAvailable.length > 0 && !menu.daysAvailable.includes(localDayOfWeek(at, timezone))) {
    return false
  }
  if (menu.availableFrom === null || menu.availableTo === null) return true
  const mins = localMinutes(at, timezone)
  // A menu window that runs past midnight is expressed with availableTo >= 1440.
  if (menu.availableTo > MINUTES_IN_DAY) {
    return mins >= menu.availableFrom || mins < menu.availableTo - MINUTES_IN_DAY
  }
  return mins >= menu.availableFrom && mins < menu.availableTo
}

// ---------------------------------------------------------------------------
// Order slots
// ---------------------------------------------------------------------------

export type SlotOptions = {
  /** "Now". Slots never start before this plus the lead time. */
  from: Date
  /** Kitchen lead time before the earliest selectable slot. */
  leadMinutes: number
  /** Slot granularity. */
  intervalMinutes: number
  /** Stop taking orders this long before a window closes. */
  lastOrderMinutesBeforeClose: number
  /** How far ahead a customer may schedule. */
  horizonDays?: number
  /** Optional per-menu window, applied on top of the branch hours. */
  menu?: MenuAvailability
  /** Cap on how many slots to return, so a 7-day horizon does not produce 700 options. */
  limit?: number
}

export type Slot = { at: Date; date: string; minutes: number }

/**
 * Every time a customer may schedule an order for.
 *
 * This is the function that fixes the current site's single worst behaviour. Being closed is not
 * a dead end: if the kitchen is shut, the first slot is simply tomorrow's opening time and the
 * customer can still place the order.
 */
export function availableSlots(schedule: Schedule, options: SlotOptions): Slot[] {
  const {
    from,
    leadMinutes,
    intervalMinutes,
    lastOrderMinutesBeforeClose,
    horizonDays = 7,
    menu,
    limit = 240,
  } = options

  if (intervalMinutes <= 0) throw new Error('intervalMinutes must be positive')

  const earliest = from.getTime() + leadMinutes * 60_000
  const slots: Slot[] = []

  for (const occ of occurrencesBetween(schedule, from, horizonDays)) {
    const lastOrder = occ.closesAt - lastOrderMinutesBeforeClose
    for (let minutes = occ.opensAt; minutes <= lastOrder; minutes += intervalMinutes) {
      const at = zonedTimeToInstant(occ.date, minutes, schedule.timezone)
      if (at.getTime() < earliest) continue
      if (menu && !isMenuAvailableAt(menu, at, schedule.timezone)) continue
      slots.push({ at, date: occ.date, minutes })
      if (slots.length >= limit) return slots
    }
  }

  return slots
}

/** Convenience for the "ASAP" path: the first slot the kitchen could actually hit. */
export function earliestSlot(schedule: Schedule, options: SlotOptions): Slot | null {
  return availableSlots(schedule, { ...options, limit: 1 })[0] ?? null
}

// ---------------------------------------------------------------------------
// Presentation
// ---------------------------------------------------------------------------

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
export const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/** Human summary of the week, collapsing consecutive identical days ("Mon–Thu 15:00–22:00"). */
export function summariseWeek(windows: ServiceWindow[]): Array<{ label: string; hours: string }> {
  const byDay: string[] = []
  for (let d = 0; d < 7; d++) {
    const dayWindows = windows
      .filter((w) => w.dayOfWeek === d)
      .sort((a, b) => a.opensAt - b.opensAt)
      .map((w) => `${formatMinutes(w.opensAt)}–${formatMinutes(w.closesAt)}`)
    byDay[d] = dayWindows.length > 0 ? dayWindows.join(', ') : 'Closed'
  }

  // Present the week starting Monday, which is how a British customer reads it.
  const order = [1, 2, 3, 4, 5, 6, 0]
  const rows: Array<{ label: string; hours: string }> = []
  let runStart = 0
  for (let i = 1; i <= order.length; i++) {
    const sameAsPrevious = i < order.length && byDay[order[i]] === byDay[order[runStart]]
    if (sameAsPrevious) continue
    const label =
      runStart === i - 1
        ? DAY_NAMES[order[runStart]]
        : `${DAY_NAMES_SHORT[order[runStart]]}–${DAY_NAMES_SHORT[order[i - 1]]}`
    rows.push({ label, hours: byDay[order[runStart]] })
    runStart = i
  }
  return rows
}

export function formatInLondon(at: Date, pattern: string, timezone = 'Europe/London'): string {
  return formatInTimeZone(at, timezone, pattern)
}
