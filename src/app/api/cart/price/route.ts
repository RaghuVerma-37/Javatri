import { NextResponse } from 'next/server'
import { cartSchema } from '@/lib/validation'
import { priceOrder } from '@/server/ordering'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Reprice a basket.
 *
 * The browser sends item ids and quantities. It gets back prices. There is no direction in which
 * a price travels from the browser to the server — the request schema has nowhere to put one.
 */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected JSON.' }, { status: 400 })
  }

  const parsed = cartSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'That basket does not look right.' }, { status: 400 })
  }

  try {
    const snapshot = await priceOrder(
      parsed.data.lines,
      parsed.data.orderType,
      parsed.data.requestedFor,
    )

    return NextResponse.json(
      {
        pricing: snapshot.pricing,
        requestedFor: snapshot.requestedFor.toISOString(),
        isAsap: snapshot.isAsap,
        canCheckout: snapshot.canCheckout,
        blockedReason: snapshot.blockedReason,
      },
      { headers: { 'cache-control': 'no-store' } },
    )
  } catch (error) {
    console.error('[cart/price]', error)
    return NextResponse.json({ error: 'We could not price your basket.' }, { status: 500 })
  }
}
