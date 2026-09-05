import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { reservationEmail, sendEmail } from '@/lib/email'
import { formatInLondon } from '@/lib/hours'
import { fieldErrors, reservationSchema } from '@/lib/validation'
import { requireBranch } from '@/server/branch'
import { isValidReservationTime } from '@/server/ordering'
import { generateReference } from '@/server/orders'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected JSON.' }, { status: 400 })
  }

  const parsed = reservationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please check the details below.', fields: fieldErrors(parsed.error) },
      { status: 422 },
    )
  }

  try {
    const branch = await requireBranch()

    if (!branch.acceptsReservations) {
      return NextResponse.json(
        { error: 'We are not taking online bookings at the moment — please give us a ring.' },
        { status: 409 },
      )
    }

    // The dropdown is a convenience; this is the check. A posted time we would not have offered
    // is refused rather than quietly accepted into a closed evening.
    if (!isValidReservationTime(branch, parsed.data.dateTime)) {
      return NextResponse.json(
        {
          error: 'We are not open then. Please choose another time.',
          fields: { dateTime: 'Pick a time we are open.' },
        },
        { status: 409 },
      )
    }

    const reservation = await prisma.reservation.create({
      data: {
        reference: generateReference('TB'),
        branchId: branch.id,
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        phone: parsed.data.phone,
        partySize: parsed.data.partySize,
        dateTime: new Date(parsed.data.dateTime),
        occasion: parsed.data.occasion ?? null,
        allergyNotes: parsed.data.allergyNotes ?? null,
        notes: parsed.data.notes ?? null,
      },
    })

    const template = reservationEmail(reservation)
    const staffAddress = process.env.KITCHEN_EMAIL

    // Fire and forget. A booking is recorded whether or not the mail provider is having a good day.
    void Promise.allSettled([
      sendEmail({ to: reservation.email, ...template }),
      staffAddress
        ? sendEmail({
            to: staffAddress,
            replyTo: reservation.email,
            subject: `Table request ${reservation.reference} — ${reservation.partySize} on ${formatInLondon(reservation.dateTime, 'EEE d MMM HH:mm')}`,
            html: `<p><strong>${reservation.name}</strong> · ${reservation.phone} · ${reservation.email}</p>
              <p>${reservation.partySize} people, ${formatInLondon(reservation.dateTime, "EEEE d MMMM 'at' HH:mm")}</p>
              ${reservation.occasion ? `<p>Occasion: ${reservation.occasion}</p>` : ''}
              ${reservation.allergyNotes ? `<p style="color:#a11b1b"><strong>Allergy:</strong> ${reservation.allergyNotes}</p>` : ''}
              ${reservation.notes ? `<p>${reservation.notes}</p>` : ''}`,
          })
        : Promise.resolve(null),
    ])

    return NextResponse.json({ reference: reservation.reference })
  } catch (error) {
    console.error('[reservations]', error)
    return NextResponse.json({ error: 'We could not save that booking. Please call us.' }, { status: 500 })
  }
}
