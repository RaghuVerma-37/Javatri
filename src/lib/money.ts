/**
 * Money is an integer number of pence, everywhere, always.
 *
 * Nothing in this codebase multiplies or adds a price as a float. `12.95 * 3` is 38.849999999999994
 * in IEEE-754, and a restaurant that is a penny out on every third order will find out eventually.
 */

const GBP = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
})

export function formatPence(pence: number): string {
  return GBP.format(pence / 100)
}

/** "£40" rather than "£40.00" for round numbers in prose. Prices in a menu keep the pence. */
export function formatPenceCompact(pence: number): string {
  return pence % 100 === 0 ? `£${pence / 100}` : formatPence(pence)
}

/** For JSON-LD and form values, which want "12.95" rather than "£12.95". */
export function penceToDecimalString(pence: number): string {
  const sign = pence < 0 ? '-' : ''
  const abs = Math.abs(pence)
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}

/**
 * Parse a price the client's JSON gives us as a float ("7.5", 12.95) into pence.
 * Rounds rather than truncates: `Math.round(19.99 * 100)` is 1999, `Math.trunc` would give 1998.
 */
export function poundsToPence(pounds: number | string): number {
  const value = typeof pounds === 'string' ? Number(pounds) : pounds
  if (!Number.isFinite(value)) throw new Error(`Not a price: ${pounds}`)
  return Math.round(value * 100)
}

/** Parse user input from an admin price field. Accepts "12.95", "£12.95", "12". */
export function parsePriceInput(input: string): number {
  const cleaned = input.replace(/[£,\s]/g, '')
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new Error(`Enter a price like 12.95 (got "${input}")`)
  }
  return poundsToPence(cleaned)
}
