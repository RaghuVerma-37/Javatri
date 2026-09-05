/**
 * Delivery geography: postcode normalisation and great-circle distance.
 *
 * Pure functions only — the postcodes.io call and its cache live in src/lib/delivery.ts, so the
 * distance maths can be tested against known answers without a network.
 */

const EARTH_RADIUS_MILES = 3958.7613

export type LatLng = { latitude: number; longitude: number }

/** `sl6 3rx` and `SL63RX` are the same postcode. Store and compare the canonical form. */
export function normalisePostcode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/** Display form with the conventional space before the last three characters. */
export function formatPostcode(input: string): string {
  const normalised = normalisePostcode(input)
  if (normalised.length < 5) return normalised
  return `${normalised.slice(0, -3)} ${normalised.slice(-3)}`
}

/**
 * UK postcode shape. Deliberately permissive about spacing and generous about the outward code:
 * this is a "don't waste a round trip on obvious rubbish" check, not an authority. postcodes.io
 * is the authority.
 */
export function looksLikeUkPostcode(input: string): boolean {
  return /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(normalisePostcode(input))
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/** Great-circle distance in miles. */
export function haversineMiles(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.latitude - a.latitude)
  const dLng = toRadians(b.longitude - a.longitude)
  const lat1 = toRadians(a.latitude)
  const lat2 = toRadians(b.latitude)

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)))
}

export type DeliveryZoneCheck =
  | { ok: true; distanceMiles: number }
  | { ok: false; reason: 'out_of_range'; distanceMiles: number; radiusMiles: number }

export function checkWithinRadius(
  origin: LatLng,
  destination: LatLng,
  radiusMiles: number,
): DeliveryZoneCheck {
  const distanceMiles = haversineMiles(origin, destination)
  // Round to the nearest tenth before comparing, so a customer 3.001 miles away on a 3 mile
  // radius is not told no by floating-point noise.
  const rounded = Math.round(distanceMiles * 10) / 10
  if (rounded > radiusMiles) {
    return { ok: false, reason: 'out_of_range', distanceMiles: rounded, radiusMiles }
  }
  return { ok: true, distanceMiles: rounded }
}
