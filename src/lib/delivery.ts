import { prisma } from '@/lib/db'
import { checkWithinRadius, formatPostcode, looksLikeUkPostcode, normalisePostcode, type LatLng } from '@/lib/geo'

/**
 * Postcode -> coordinates, via postcodes.io.
 *
 * postcodes.io is the Ordnance Survey open data set behind most UK address lookups. It is free,
 * needs no key, and is accurate to the postcode centroid, which is the right resolution for a
 * "do we deliver to you" question. Results are cached in Postgres because the answer for SL6 3RX
 * does not change, and because a customer typing their postcode should not generate a request per
 * keystroke.
 */

const ENDPOINT = 'https://api.postcodes.io/postcodes'
const CACHE_TTL_DAYS = 180

type PostcodesIoResponse = {
  status: number
  result?: { latitude: number; longitude: number } | null
}

export type GeocodeResult =
  | { ok: true; postcode: string; latitude: number; longitude: number }
  | { ok: false; reason: 'malformed' | 'not_found' | 'lookup_failed' }

export async function geocodePostcode(input: string): Promise<GeocodeResult> {
  const normalised = normalisePostcode(input)
  if (!looksLikeUkPostcode(normalised)) return { ok: false, reason: 'malformed' }

  const cached = await prisma.postcodeLookup.findUnique({ where: { postcode: normalised } })
  if (cached && !isStale(cached.lookedUpAt)) {
    if (!cached.isValid || cached.latitude === null || cached.longitude === null) {
      return { ok: false, reason: 'not_found' }
    }
    return {
      ok: true,
      postcode: formatPostcode(normalised),
      latitude: cached.latitude,
      longitude: cached.longitude,
    }
  }

  let payload: PostcodesIoResponse | null = null
  try {
    const response = await fetch(`${ENDPOINT}/${encodeURIComponent(normalised)}`, {
      signal: AbortSignal.timeout(5000),
      headers: { accept: 'application/json' },
    })
    payload = (await response.json()) as PostcodesIoResponse
  } catch {
    // Network trouble is not the customer's fault and is not a "we don't deliver there".
    // Fall back to a stale cache entry if we have one; otherwise say the lookup failed.
    if (cached?.isValid && cached.latitude !== null && cached.longitude !== null) {
      return {
        ok: true,
        postcode: formatPostcode(normalised),
        latitude: cached.latitude,
        longitude: cached.longitude,
      }
    }
    return { ok: false, reason: 'lookup_failed' }
  }

  if (!payload || payload.status !== 200 || !payload.result) {
    await cache(normalised, null, null, false)
    return { ok: false, reason: 'not_found' }
  }

  const { latitude, longitude } = payload.result
  await cache(normalised, latitude, longitude, true)
  return { ok: true, postcode: formatPostcode(normalised), latitude, longitude }
}

function isStale(at: Date): boolean {
  return Date.now() - at.getTime() > CACHE_TTL_DAYS * 24 * 60 * 60 * 1000
}

async function cache(postcode: string, latitude: number | null, longitude: number | null, isValid: boolean) {
  const data = { latitude, longitude, isValid, lookedUpAt: new Date() }
  await prisma.postcodeLookup.upsert({
    where: { postcode },
    create: { postcode, ...data },
    update: data,
  })
}

export type DeliveryDecision =
  | {
      ok: true
      postcode: string
      distanceMiles: number
      minOrderInPence: number
      deliveryFeeInPence: number
      freeDeliveryAboveInPence: number | null
    }
  | { ok: false; reason: 'malformed' | 'not_found' | 'lookup_failed' | 'out_of_range' | 'no_delivery'; message: string; distanceMiles?: number }

/**
 * Decide before the customer builds a basket, not at checkout.
 *
 * Finding out you are out of the delivery area after spending five minutes choosing dinner is one
 * of the more reliable ways to lose a customer permanently.
 */
export async function checkDelivery(
  branch: {
    acceptsDelivery: boolean
    latitude: number | null
    longitude: number | null
    deliveryRadiusMiles: number
    minOrderInPence: number
    deliveryFeeInPence: number
    freeDeliveryAboveInPence: number | null
  },
  postcode: string,
): Promise<DeliveryDecision> {
  if (!branch.acceptsDelivery) {
    return {
      ok: false,
      reason: 'no_delivery',
      message: 'We are not delivering at the moment. Collection and dining in are both available.',
    }
  }

  if (branch.latitude === null || branch.longitude === null) {
    return {
      ok: false,
      reason: 'lookup_failed',
      message: 'We cannot check delivery addresses right now. Please call us and we will sort it out.',
    }
  }

  const geocoded = await geocodePostcode(postcode)
  if (!geocoded.ok) {
    const messages = {
      malformed: 'That does not look like a full UK postcode. Try something like SL6 3RX.',
      not_found: 'We could not find that postcode. Please check it and try again.',
      lookup_failed: 'The postcode lookup is not responding. Please try again, or give us a call.',
    } as const
    return { ok: false, reason: geocoded.reason, message: messages[geocoded.reason] }
  }

  const origin: LatLng = { latitude: branch.latitude, longitude: branch.longitude }
  const check = checkWithinRadius(origin, geocoded, branch.deliveryRadiusMiles)

  if (!check.ok) {
    return {
      ok: false,
      reason: 'out_of_range',
      distanceMiles: check.distanceMiles,
      message: `${geocoded.postcode} is about ${check.distanceMiles} miles away, and we deliver within ${branch.deliveryRadiusMiles} miles. You are very welcome to collect.`,
    }
  }

  return {
    ok: true,
    postcode: geocoded.postcode,
    distanceMiles: check.distanceMiles,
    minOrderInPence: branch.minOrderInPence,
    deliveryFeeInPence: branch.deliveryFeeInPence,
    freeDeliveryAboveInPence: branch.freeDeliveryAboveInPence,
  }
}
