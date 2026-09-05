import { describe, expect, it } from 'vitest'
import {
  availableSlots,
  earliestSlot,
  isMenuAvailableAt,
  isOpenAt,
  localDayOfWeek,
  localMinutes,
  nextOpeningAt,
  parseMinutes,
  summariseWeek,
  windowsForDate,
  zonedTimeToInstant,
  type Schedule,
} from '@/lib/hours'

/**
 * The opening-hours maths.
 *
 * These are the tests that matter most in the whole suite, because the failure mode is silent:
 * a site that is an hour out for seven months of the year turns away orders it should take and
 * accepts orders nobody is in the kitchen for, and nobody notices until a customer arrives at a
 * locked door. So: real BST and GMT dates, the transition weekends themselves, and the exact
 * hours seeded from Javatri's homepage.
 */

/** Javatri's seeded week: Mon–Thu 15:00–22:00, Fri–Sat 12:00–22:00, Sun 12:00–20:00. */
const JAVATRI: Schedule = {
  timezone: 'Europe/London',
  windows: [
    { dayOfWeek: 0, opensAt: 720, closesAt: 1200 },
    { dayOfWeek: 1, opensAt: 900, closesAt: 1320 },
    { dayOfWeek: 2, opensAt: 900, closesAt: 1320 },
    { dayOfWeek: 3, opensAt: 900, closesAt: 1320 },
    { dayOfWeek: 4, opensAt: 900, closesAt: 1320 },
    { dayOfWeek: 5, opensAt: 720, closesAt: 1320 },
    { dayOfWeek: 6, opensAt: 720, closesAt: 1320 },
  ],
  holidays: [],
}

describe('wall clock to instant', () => {
  it('applies BST in summer — 19:00 London on 5 September is 18:00 UTC', () => {
    expect(zonedTimeToInstant('2026-09-05', 19 * 60, 'Europe/London').toISOString()).toBe(
      '2026-09-05T18:00:00.000Z',
    )
  })

  it('applies GMT in winter — 19:00 London on 5 January is 19:00 UTC', () => {
    expect(zonedTimeToInstant('2026-01-05', 19 * 60, 'Europe/London').toISOString()).toBe(
      '2026-01-05T19:00:00.000Z',
    )
  })

  it('rolls a past-midnight close onto the next calendar day', () => {
    // 1500 minutes = 25:00 = 01:00 the following morning.
    expect(zonedTimeToInstant('2026-09-05', 1500, 'Europe/London').toISOString()).toBe(
      '2026-09-06T00:00:00.000Z',
    )
  })

  it('reads local minutes back out of an instant', () => {
    expect(localMinutes(new Date('2026-09-05T18:00:00.000Z'), 'Europe/London')).toBe(19 * 60)
    expect(localMinutes(new Date('2026-01-05T19:00:00.000Z'), 'Europe/London')).toBe(19 * 60)
  })

  it('derives day-of-week in the local zone, not UTC', () => {
    // 23:30 UTC on a Saturday is already Sunday in London under BST.
    expect(localDayOfWeek(new Date('2026-09-05T23:30:00.000Z'), 'Europe/London')).toBe(0)
    expect(localDayOfWeek(new Date('2026-09-05T23:30:00.000Z'), 'UTC')).toBe(6)
  })

  it('parses HH:mm and rejects nonsense', () => {
    expect(parseMinutes('15:00')).toBe(900)
    expect(parseMinutes('9:05')).toBe(545)
    expect(() => parseMinutes('25:99')).toThrow()
    expect(() => parseMinutes('half past two')).toThrow()
  })
})

describe('isOpenAt', () => {
  it('is open at 19:00 on a Tuesday in summer', () => {
    // Tuesday 8 September 2026, 19:00 BST = 18:00Z.
    expect(isOpenAt(JAVATRI, new Date('2026-09-08T18:00:00.000Z'))).toBe(true)
  })

  it('is closed at 14:00 on a Tuesday — the kitchen opens at 15:00', () => {
    expect(isOpenAt(JAVATRI, new Date('2026-09-08T13:00:00.000Z'))).toBe(false)
  })

  it('is closed at 21:00 on a Sunday — Sunday closes at 20:00', () => {
    // Sunday 6 September 2026, 21:00 BST.
    expect(isOpenAt(JAVATRI, new Date('2026-09-06T20:00:00.000Z'))).toBe(false)
    // ...but open at 19:00.
    expect(isOpenAt(JAVATRI, new Date('2026-09-06T18:00:00.000Z'))).toBe(true)
  })

  it('treats the close time as exclusive', () => {
    // Tuesday 22:00 exactly — closed.
    expect(isOpenAt(JAVATRI, new Date('2026-09-08T21:00:00.000Z'))).toBe(false)
    // One minute before — open.
    expect(isOpenAt(JAVATRI, new Date('2026-09-08T20:59:00.000Z'))).toBe(true)
  })

  it('gives the same wall-clock answer either side of the BST transition', () => {
    // 25 October 2026 is the Sunday the clocks go back. 19:00 local, both weeks.
    const sundayBst = new Date('2026-10-18T18:00:00.000Z') // 19:00 BST
    const sundayGmt = new Date('2026-11-01T19:00:00.000Z') // 19:00 GMT
    expect(localMinutes(sundayBst, 'Europe/London')).toBe(localMinutes(sundayGmt, 'Europe/London'))
    expect(isOpenAt(JAVATRI, sundayBst)).toBe(true)
    expect(isOpenAt(JAVATRI, sundayGmt)).toBe(true)
  })

  it('handles the spring-forward Sunday, when 01:00–02:00 local does not exist', () => {
    // 29 March 2026: clocks go forward at 01:00. Sunday service is 12:00–20:00 regardless.
    expect(isOpenAt(JAVATRI, new Date('2026-03-29T12:00:00.000Z'))).toBe(true) // 13:00 BST
    expect(isOpenAt(JAVATRI, new Date('2026-03-29T20:00:00.000Z'))).toBe(false) // 21:00 BST
  })
})

describe('past-midnight closing', () => {
  const lateLicence: Schedule = {
    timezone: 'Europe/London',
    windows: [{ dayOfWeek: 6, opensAt: 1200, closesAt: 1500 }], // Sat 20:00 – 01:00 Sun
    holidays: [],
  }

  it('is still open after midnight', () => {
    // Sunday 00:30 BST = Saturday 23:30Z.
    expect(isOpenAt(lateLicence, new Date('2026-09-05T23:30:00.000Z'))).toBe(true)
  })

  it('is closed after the window ends', () => {
    // Sunday 01:30 BST = Sunday 00:30Z.
    expect(isOpenAt(lateLicence, new Date('2026-09-06T00:30:00.000Z'))).toBe(false)
  })
})

describe('holiday overrides', () => {
  const withHolidays: Schedule = {
    ...JAVATRI,
    holidays: [
      { date: '2026-12-25', isClosed: true, opensAt: null, closesAt: null },
      { date: '2026-12-31', isClosed: false, opensAt: 1080, closesAt: 1440 }, // 18:00 – midnight
    ],
  }

  it('closes on Christmas Day even though Friday is normally a service day', () => {
    // 25 December 2026 is a Friday: normally 12:00–22:00.
    expect(isOpenAt(JAVATRI, new Date('2026-12-25T15:00:00.000Z'))).toBe(true)
    expect(isOpenAt(withHolidays, new Date('2026-12-25T15:00:00.000Z'))).toBe(false)
  })

  it('replaces the usual hours rather than adding to them', () => {
    const windows = windowsForDate(withHolidays, '2026-12-31')
    expect(windows).toEqual([{ opensAt: 1080, closesAt: 1440 }])
    // 17:00 on New Year's Eve — normally open (Thursday, 15:00–22:00), closed under the override.
    expect(isOpenAt(withHolidays, new Date('2026-12-31T17:00:00.000Z'))).toBe(false)
    expect(isOpenAt(withHolidays, new Date('2026-12-31T19:00:00.000Z'))).toBe(true)
  })
})

describe('nextOpeningAt', () => {
  it('returns the given instant when already open', () => {
    const at = new Date('2026-09-08T18:00:00.000Z')
    expect(nextOpeningAt(JAVATRI, at)).toEqual(at)
  })

  it('finds the same day when it is still morning', () => {
    // Tuesday 10:00 BST. Opens 15:00 BST = 14:00Z.
    const next = nextOpeningAt(JAVATRI, new Date('2026-09-08T09:00:00.000Z'))
    expect(next?.toISOString()).toBe('2026-09-08T14:00:00.000Z')
  })

  it('rolls to tomorrow after closing time', () => {
    // Tuesday 23:00 BST -> Wednesday 15:00 BST = 14:00Z.
    const next = nextOpeningAt(JAVATRI, new Date('2026-09-08T22:00:00.000Z'))
    expect(next?.toISOString()).toBe('2026-09-09T14:00:00.000Z')
  })

  it('skips a holiday closure and finds the day after', () => {
    const closedBoxingWeek: Schedule = {
      ...JAVATRI,
      holidays: [
        { date: '2026-12-25', isClosed: true, opensAt: null, closesAt: null },
        { date: '2026-12-26', isClosed: true, opensAt: null, closesAt: null },
      ],
    }
    // Christmas Eve, 23:00 GMT. Next open is Sunday 27th at 12:00 GMT.
    const next = nextOpeningAt(closedBoxingWeek, new Date('2026-12-24T23:00:00.000Z'))
    expect(next?.toISOString()).toBe('2026-12-27T12:00:00.000Z')
  })

  it('returns null when nothing is open inside the horizon', () => {
    const neverOpen: Schedule = { timezone: 'Europe/London', windows: [], holidays: [] }
    expect(nextOpeningAt(neverOpen, new Date('2026-09-08T09:00:00.000Z'))).toBeNull()
  })
})

describe('availableSlots', () => {
  const options = {
    leadMinutes: 25,
    intervalMinutes: 15,
    lastOrderMinutesBeforeClose: 30,
    horizonDays: 3,
  }

  it('starts no earlier than now plus the kitchen lead time', () => {
    // Tuesday 18:02 BST. Lead 25 minutes -> earliest real slot is 18:30 (the 15-minute grid
    // from 15:00 gives 18:15 and 18:30; 18:15 is inside the lead time).
    const from = new Date('2026-09-08T17:02:00.000Z')
    const slots = availableSlots(JAVATRI, { ...options, from })
    expect(slots[0].minutes).toBe(18 * 60 + 30)
    expect(slots[0].at.toISOString()).toBe('2026-09-08T17:30:00.000Z')
  })

  it('stops taking orders before closing time', () => {
    const from = new Date('2026-09-08T17:00:00.000Z')
    const slots = availableSlots(JAVATRI, { ...options, from })
    const tuesday = slots.filter((slot) => slot.date === '2026-09-08')
    // Closes 22:00, last orders 30 minutes earlier: 21:30 is the final slot.
    expect(tuesday.at(-1)?.minutes).toBe(21 * 60 + 30)
  })

  it('offers tomorrow when the kitchen is shut — being closed is not a dead end', () => {
    // Tuesday 23:30 BST, long after closing.
    const from = new Date('2026-09-08T22:30:00.000Z')
    const slots = availableSlots(JAVATRI, { ...options, from })
    expect(slots.length).toBeGreaterThan(0)
    expect(slots[0].date).toBe('2026-09-09')
    expect(slots[0].minutes).toBe(15 * 60)
  })

  it('gives a delivery order its longer lead time', () => {
    // 18:02 BST. Slots sit on a 15-minute grid anchored to the 15:00 opening.
    //   pickup   +25min -> earliest 18:27 -> first grid slot at or after it is 18:30
    //   delivery +45min -> earliest 18:47 -> 18:45 is too early, so 19:00
    const from = new Date('2026-09-08T17:02:00.000Z')
    const pickup = earliestSlot(JAVATRI, { ...options, from, leadMinutes: 25 })
    const delivery = earliestSlot(JAVATRI, { ...options, from, leadMinutes: 45 })
    expect(pickup!.minutes).toBe(18 * 60 + 30)
    expect(delivery!.minutes).toBe(19 * 60)
    expect(delivery!.at.getTime()).toBeGreaterThan(pickup!.at.getTime())
  })

  it('respects a menu that is not served at that hour', () => {
    const from = new Date('2026-09-11T10:00:00.000Z') // Friday 11:00 BST, opens 12:00
    const lunchOnly = { daysAvailable: [], availableFrom: 12 * 60, availableTo: 15 * 60 }
    const slots = availableSlots(JAVATRI, { ...options, from, menu: lunchOnly })
    const friday = slots.filter((slot) => slot.date === '2026-09-11')
    expect(friday[0].minutes).toBe(12 * 60)
    expect(friday.at(-1)!.minutes).toBeLessThan(15 * 60)
  })

  it('never returns a slot in the past', () => {
    const from = new Date('2026-09-08T19:00:00.000Z')
    for (const slot of availableSlots(JAVATRI, { ...options, from })) {
      expect(slot.at.getTime()).toBeGreaterThanOrEqual(from.getTime())
    }
  })

  it('returns nothing when the branch has no hours at all', () => {
    const neverOpen: Schedule = { timezone: 'Europe/London', windows: [], holidays: [] }
    expect(availableSlots(neverOpen, { ...options, from: new Date() })).toEqual([])
  })
})

describe('menu availability', () => {
  it('respects the days a menu is served', () => {
    const weekendOnly = { daysAvailable: [0, 6], availableFrom: null, availableTo: null }
    // Saturday 5 September 2026.
    expect(isMenuAvailableAt(weekendOnly, new Date('2026-09-05T13:00:00Z'), 'Europe/London')).toBe(true)
    // Tuesday.
    expect(isMenuAvailableAt(weekendOnly, new Date('2026-09-08T13:00:00Z'), 'Europe/London')).toBe(false)
  })

  it('treats a null window as always available', () => {
    const anytime = { daysAvailable: [], availableFrom: null, availableTo: null }
    expect(isMenuAvailableAt(anytime, new Date('2026-09-08T03:00:00Z'), 'Europe/London')).toBe(true)
  })
})

describe('summariseWeek', () => {
  it('collapses identical consecutive days and starts on Monday', () => {
    expect(summariseWeek(JAVATRI.windows)).toEqual([
      { label: 'Mon–Thu', hours: '15:00–22:00' },
      { label: 'Fri–Sat', hours: '12:00–22:00' },
      { label: 'Sunday', hours: '12:00–20:00' },
    ])
  })

  it('shows days with no windows as closed', () => {
    const mondayClosed = JAVATRI.windows.filter((w) => w.dayOfWeek !== 1)
    expect(summariseWeek(mondayClosed)[0]).toEqual({ label: 'Monday', hours: 'Closed' })
  })
})
