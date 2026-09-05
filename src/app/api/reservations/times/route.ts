import { NextResponse } from 'next/server'
import { requireBranch } from '@/server/branch'
import { reservationTimesFor } from '@/server/ordering'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Times available on one date. Called when the customer picks a day. */
export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get('date')
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Expected ?date=YYYY-MM-DD.' }, { status: 400 })
  }

  try {
    const branch = await requireBranch()
    if (!branch.acceptsReservations) {
      return NextResponse.json({ times: [], closed: true, reason: 'not_taking_bookings' })
    }
    const times = reservationTimesFor(branch, date)
    return NextResponse.json(
      { times, closed: times.length === 0 },
      { headers: { 'cache-control': 'no-store' } },
    )
  } catch (error) {
    console.error('[reservations/times]', error)
    return NextResponse.json({ error: 'Could not load times.' }, { status: 500 })
  }
}
