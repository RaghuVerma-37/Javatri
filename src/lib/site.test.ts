import { describe, expect, it } from 'vitest'
import { formatPhone, telHref } from '@/lib/site'

/** Small, but it is on every page and in every order email. */
describe('formatPhone', () => {
  it('renders a UK number the way a UK customer reads it', () => {
    expect(formatPhone('+44 1628 825753')).toBe('01628 825753')
    expect(formatPhone('+441628825753')).toBe('01628 825753')
  })

  it('leaves a non-UK number alone rather than mangling it', () => {
    expect(formatPhone('+1 415 555 0123')).toBe('+1 415 555 0123')
  })

  it('handles nothing gracefully', () => {
    expect(formatPhone(null)).toBe('')
    expect(formatPhone(undefined)).toBe('')
  })
})

describe('telHref', () => {
  it('strips everything a dialler cannot use', () => {
    expect(telHref('+44 1628 825753')).toBe('tel:+441628825753')
    expect(telHref('(01628) 825-753')).toBe('tel:01628825753')
  })
})
