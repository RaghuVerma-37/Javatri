import { NextResponse } from 'next/server'
import { checkDelivery } from '@/lib/delivery'
import { deliveryCheckSchema } from '@/lib/validation'
import { getBranchSafe } from '@/server/branch'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Postcode in, "yes and it costs this" or "no and here is why" out. Asked before the basket. */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected JSON.' }, { status: 400 })
  }

  const parsed = deliveryCheckSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, reason: 'malformed', message: parsed.error.issues[0]?.message ?? 'Check the postcode.' },
      { status: 200 },
    )
  }

  try {
    const branch = await getBranchSafe()
    if (!branch) {
      return NextResponse.json({
        ok: false,
        reason: 'lookup_failed',
        message: 'We cannot check delivery addresses right now. Please call us.',
      })
    }
    const decision = await checkDelivery(branch, parsed.data.postcode)
    return NextResponse.json(decision, { headers: { 'cache-control': 'no-store' } })
  } catch (error) {
    console.error('[delivery/check]', error)
    return NextResponse.json(
      { ok: false, reason: 'lookup_failed', message: 'We could not check that right now. Please call us.' },
      { status: 200 },
    )
  }
}
