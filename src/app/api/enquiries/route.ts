import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { enquiryEmail, sendEmail } from '@/lib/email'
import { enquirySchema, fieldErrors } from '@/lib/validation'
import { requireBranch } from '@/server/branch'
import { generateReference } from '@/server/orders'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Event enquiries. The highest-value form on the site, so it asks for as little as possible. */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected JSON.' }, { status: 400 })
  }

  const parsed = enquirySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please check the details below.', fields: fieldErrors(parsed.error) },
      { status: 422 },
    )
  }

  try {
    const branch = await requireBranch()
    const enquiry = await prisma.eventEnquiry.create({
      data: {
        reference: generateReference('EV'),
        branchId: branch.id,
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        phone: parsed.data.phone,
        eventType: parsed.data.eventType,
        estimatedGuests: parsed.data.estimatedGuests ?? null,
        preferredDate: parsed.data.preferredDate ? new Date(parsed.data.preferredDate) : null,
        message: parsed.data.message ?? null,
      },
    })

    const template = enquiryEmail(enquiry)
    const staffAddress = process.env.EVENTS_EMAIL ?? process.env.KITCHEN_EMAIL

    void Promise.allSettled([
      sendEmail({ to: enquiry.email, ...template }),
      staffAddress
        ? sendEmail({
            to: staffAddress,
            replyTo: enquiry.email,
            subject: `Event enquiry ${enquiry.reference} — ${enquiry.eventType}${
              enquiry.estimatedGuests ? `, ${enquiry.estimatedGuests} guests` : ''
            }`,
            html: `<p><strong>${enquiry.name}</strong> · ${enquiry.phone} · ${enquiry.email}</p>
              <p>${enquiry.eventType}${enquiry.estimatedGuests ? ` · ${enquiry.estimatedGuests} guests` : ''}${
                enquiry.preferredDate ? ` · ${enquiry.preferredDate.toDateString()}` : ''
              }</p>
              ${enquiry.message ? `<p>${enquiry.message}</p>` : ''}`,
          })
        : Promise.resolve(null),
    ])

    return NextResponse.json({ reference: enquiry.reference })
  } catch (error) {
    console.error('[enquiries]', error)
    return NextResponse.json({ error: 'We could not send that. Please call us.' }, { status: 500 })
  }
}
