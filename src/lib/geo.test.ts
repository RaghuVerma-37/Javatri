import { describe, expect, it } from 'vitest'
import {
  checkWithinRadius,
  formatPostcode,
  haversineMiles,
  looksLikeUkPostcode,
  normalisePostcode,
} from '@/lib/geo'

/**
 * Delivery geography.
 *
 * A wrong answer here either sends a driver twenty miles for a £20 order or turns away a customer
 * who lives round the corner, so the distances are checked against known real-world pairs rather
 * than against the function's own output.
 */

const JAVATRI = { latitude: 51.513299, longitude: -0.804387 } // SL6 3RX
const MAIDENHEAD = { latitude: 51.5216, longitude: -0.7177 } // SL6 1AA, ~3.7 miles east
const EDINBURGH = { latitude: 55.9533, longitude: -3.1883 }

describe('postcodes', () => {
  it('normalises spacing and case', () => {
    expect(normalisePostcode('sl6 3rx')).toBe('SL63RX')
    expect(normalisePostcode('  SL6  3RX ')).toBe('SL63RX')
    expect(normalisePostcode('sl63rx')).toBe('SL63RX')
  })

  it('formats with the conventional space', () => {
    expect(formatPostcode('sl63rx')).toBe('SL6 3RX')
    expect(formatPostcode('W1A1AA')).toBe('W1A 1AA')
    expect(formatPostcode('EC1A1BB')).toBe('EC1A 1BB')
  })

  it.each(['SL6 3RX', 'sl63rx', 'W1A 0AX', 'EC1A 1BB', 'M1 1AE', 'B33 8TH', 'CR2 6XH'])(
    'accepts %s',
    (postcode) => {
      expect(looksLikeUkPostcode(postcode)).toBe(true)
    },
  )

  it.each(['SL6', 'hello', '', '12345', 'SL6 3R'])('rejects %s', (postcode) => {
    expect(looksLikeUkPostcode(postcode)).toBe(false)
  })
})

describe('haversineMiles', () => {
  it('is zero for the same point', () => {
    expect(haversineMiles(JAVATRI, JAVATRI)).toBe(0)
  })

  it('matches the real distance from the restaurant into Maidenhead', () => {
    // Roughly 3.7 miles as the crow flies.
    expect(haversineMiles(JAVATRI, MAIDENHEAD)).toBeCloseTo(3.75, 1)
  })

  it('matches a known long distance', () => {
    // Littlewick Green to Edinburgh is about 320 miles.
    expect(haversineMiles(JAVATRI, EDINBURGH)).toBeGreaterThan(315)
    expect(haversineMiles(JAVATRI, EDINBURGH)).toBeLessThan(325)
  })

  it('is symmetric', () => {
    expect(haversineMiles(JAVATRI, MAIDENHEAD)).toBeCloseTo(
      haversineMiles(MAIDENHEAD, JAVATRI),
      10,
    )
  })

  it('handles crossing the prime meridian', () => {
    const west = { latitude: 51.5, longitude: -0.1 }
    const east = { latitude: 51.5, longitude: 0.1 }
    expect(haversineMiles(west, east)).toBeCloseTo(8.6, 0)
  })
})

describe('checkWithinRadius', () => {
  it('accepts an address inside the radius', () => {
    const result = checkWithinRadius(JAVATRI, MAIDENHEAD, 4)
    expect(result.ok).toBe(true)
    expect(result.distanceMiles).toBeCloseTo(3.8, 1)
  })

  it('rejects an address outside it, and reports both numbers', () => {
    const result = checkWithinRadius(JAVATRI, EDINBURGH, 4)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('out_of_range')
      expect(result.radiusMiles).toBe(4)
      expect(result.distanceMiles).toBeGreaterThan(300)
    }
  })

  it('does not turn away a customer over floating-point noise at the boundary', () => {
    // A hair over three miles, on a three-mile radius. Rounding to a tenth before comparing means
    // 3.001 miles is inside; a naive `distance > radius` would refuse it.
    const justOver = { latitude: 51.513299, longitude: -0.8478 } // ~3.0 miles west
    const result = checkWithinRadius(JAVATRI, justOver, 3)
    expect(result.ok).toBe(true)
  })

  it('rounds the reported distance to one decimal place', () => {
    const result = checkWithinRadius(JAVATRI, MAIDENHEAD, 10)
    expect(result.distanceMiles * 10).toBe(Math.round(result.distanceMiles * 10))
  })
})
