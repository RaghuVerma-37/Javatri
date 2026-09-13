import { describe, expect, it } from 'vitest'
import {
  outletAddress,
  outletAddressLines,
  outletLocality,
  outletMapsUrl,
  outletShortAddress,
  outletTitle,
  outletWords,
} from './outlet'

// The two rows exactly as they are in the live database.
const LITTLEWICK = {
  slug: 'littlewick-green',
  name: 'Javatri at The Bell and Bottle',
  addressLine1: 'The Bell and Bottle, Bath Road',
  addressLine2: 'Littlewick Green',
  city: 'Maidenhead',
  postcode: 'SL6 3RX',
}

const FARNHAM = {
  slug: 'farnham-common',
  name: 'Javatri Farnham Common',
  addressLine1: null,
  addressLine2: null,
  city: 'Farnham Common',
  postcode: null,
}

describe('outlet addresses', () => {
  it('gives Littlewick Green its full address', () => {
    expect(outletAddressLines(LITTLEWICK)).toEqual([
      'The Bell and Bottle, Bath Road',
      'Littlewick Green, Maidenhead',
      'SL6 3RX',
    ])
    expect(outletAddress(LITTLEWICK)).toBe(
      'The Bell and Bottle, Bath Road, Littlewick Green, Maidenhead, SL6 3RX',
    )
    expect(outletShortAddress(LITTLEWICK)).toBe('Maidenhead, SL6 3RX')
  })

  it('gives Farnham Common its place and county, with no empty line or stray comma', () => {
    expect(outletAddressLines(FARNHAM)).toEqual(['Farnham Common, Buckinghamshire'])
    expect(outletAddress(FARNHAM)).toBe('Farnham Common, Buckinghamshire')
    expect(outletShortAddress(FARNHAM)).toBe('Farnham Common, Buckinghamshire')
  })

  it('treats blank fields as missing and says a repeated town once', () => {
    const outlet = { slug: 'somewhere', addressLine1: '  ', addressLine2: 'Eton', city: 'eton', postcode: '' }
    expect(outletAddressLines(outlet)).toEqual(['Eton'])
  })

  it('prints nothing at all for an outlet with no address and no known county', () => {
    expect(outletAddressLines({ slug: 'unknown' })).toEqual([])
    expect(outletAddress({ slug: 'unknown' })).toBe('')
  })
})

describe('outlet names', () => {
  it('names the place once', () => {
    expect(outletLocality(LITTLEWICK)).toBe('Littlewick Green')
    expect(outletLocality(FARNHAM)).toBe('Farnham Common')
    expect(outletTitle(LITTLEWICK)).toBe('Javatri at The Bell and Bottle, Littlewick Green')
    expect(outletTitle(FARNHAM)).toBe('Javatri Farnham Common')
  })
})

describe('outlet directions', () => {
  it('sends Littlewick Green to its street and postcode', () => {
    expect(outletMapsUrl(LITTLEWICK)).toBe(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent('The Bell and Bottle, Bath Road, SL6 3RX')}`,
    )
  })

  it('sends Farnham Common to its name and place rather than to "null"', () => {
    const url = outletMapsUrl(FARNHAM)
    expect(url).not.toContain('null')
    expect(decodeURIComponent(url)).toContain('Javatri Farnham Common, Farnham Common, Buckinghamshire')
  })

  it("never gives Farnham Common Littlewick Green's road", () => {
    const words = outletWords(FARNHAM)
    expect(words.heroPlace).toEqual(['in', 'Farnham', 'Common'])
    expect(words.heroLead).toBe(
      'Chaat, charcoal and slow-cooked curries in Farnham Common, Buckinghamshire. Order online for collection, or book a table.',
    )
    expect(words.findUsTitle).toBe('In Farnham Common, Buckinghamshire')
    expect(words.findUsLead).toBeNull()
    expect(words.contactLead).toBeNull()
    expect(words.footerBlurb).toBe('Indian kitchen in Farnham Common, Buckinghamshire.')
    expect(JSON.stringify(words)).not.toMatch(/Bath|Bell and Bottle|M4|A4|Berkshire|banqueting|deliver/i)
  })

  it("keeps Littlewick Green's own directions and headline", () => {
    const words = outletWords(LITTLEWICK)
    expect(words.findUsTitle).toBe('On the Bath Road, five minutes from the M4')
    expect(words.heroPlace).toEqual(['on', 'the', 'Bath', 'Road'])
  })
})
