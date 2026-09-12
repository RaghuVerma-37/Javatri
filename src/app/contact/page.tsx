import type { Metadata } from 'next'
import { NotConfigured } from '@/components/not-configured'
import Link from 'next/link'
import { Mail, MapPin, Phone } from 'lucide-react'
import { OpenStatus } from '@/components/open-status'
import { ButtonLink, SectionHeading } from '@/components/ui'
import { breadcrumbSchema, JsonLd, restaurantSchema } from '@/lib/jsonld'
import { summariseWeek } from '@/lib/hours'
import { absoluteUrl, formatPhone, telHref } from '@/lib/site'
import { getBranchSafe, getOtherBranches, getSelectedBranchSlug, getServiceState } from '@/server/branch'

export const metadata: Metadata = {
  title: 'Find us',
  description:
    'Javatri at The Bell and Bottle, Bath Road, Littlewick Green, Maidenhead SL6 3RX. Opening hours, phone number and directions.',
  alternates: { canonical: '/contact' },
  openGraph: { title: 'Find us · Javatri', url: absoluteUrl('/contact') },
}

export const revalidate = 300

export default async function ContactPage() {
  const branch = await getBranchSafe(await getSelectedBranchSlug())
  if (!branch) return <NotConfigured />
  const state = getServiceState(branch)

  // The second branch is listed honestly rather than advertised. The old site offered Farnham
  // Common in the banqueting dropdown with no address, no phone and no hours anywhere.
  const otherBranches = await getOtherBranches(branch.slug)

  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${branch.addressLine1}, ${branch.postcode}`,
  )}`

  return (
    <>
      <JsonLd data={restaurantSchema(branch)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Find us', path: '/contact' },
        ])}
      />

      <div className="container-page py-10 sm:py-16">
        <header className="max-w-2xl">
          <h1 className="text-4xl sm:text-5xl">Find us</h1>
          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
            On the A4 between Maidenhead and Knowl Hill, about five minutes from junction 8/9 of the
            M4, with parking outside.
          </p>
          <div className="mt-5">
            <OpenStatus branch={branch} state={state} />
          </div>
        </header>

        <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-16">
          <section aria-labelledby="address-heading">
            <h2 id="address-heading" className="text-2xl">
              {branch.name}
            </h2>

            <address className="mt-5 space-y-4 text-[0.9375rem] not-italic">
              <p className="flex gap-3">
                <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
                <span>
                  {branch.addressLine1}
                  <br />
                  {branch.addressLine2}
                  <br />
                  {branch.city}
                  <br />
                  {branch.postcode}
                </span>
              </p>
              <p className="flex gap-3">
                <Phone aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
                <a href={telHref(branch.phone)} className="hover:text-brand-text">
                  {formatPhone(branch.phone)}
                </a>
              </p>
              {branch.email ? (
                <p className="flex gap-3">
                  <Mail aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
                  <a href={`mailto:${branch.email}`} className="hover:text-brand-text">
                    {branch.email}
                  </a>
                </p>
              ) : null}
            </address>

            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href={directions} target="_blank" rel="noreferrer noopener" size="sm">
                Get directions
              </ButtonLink>
              <ButtonLink href="/book" variant="secondary" size="sm">
                Book a table
              </ButtonLink>
            </div>

            {/*
              An embedded map is an iframe, third-party cookies and about 900KB. A static link that
              opens the customer's own maps app is faster, works offline once tapped, and does not
              need a cookie banner.
            */}
            <div className="mt-8 overflow-hidden rounded-2xl border border-line">
              <a
                href={directions}
                target="_blank"
                rel="noreferrer noopener"
                className="block bg-surface-2 p-8 text-center transition-colors hover:bg-surface"
              >
                <MapPin aria-hidden className="mx-auto size-6 text-accent" />
                <p className="mt-3 font-display text-lg">Open in Maps</p>
                <p className="mt-1 text-sm text-muted">
                  {branch.postcode} · {branch.city}
                </p>
              </a>
            </div>
          </section>

          <section aria-labelledby="hours-heading">
            <h2 id="hours-heading" className="text-2xl">
              Opening hours
            </h2>
            <dl className="mt-5 divide-y divide-line rounded-2xl border border-line">
              {summariseWeek(branch.openingHours).map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-4 px-5 py-3.5">
                  <dt className="text-muted">{row.label}</dt>
                  <dd className="font-medium tabular-nums">{row.hours}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Last online orders {branch.lastOrderMinutesBeforeClose} minutes before we close. Bank
              holidays can differ — the badge at the top of this page always shows what is true right
              now.
            </p>
          </section>
        </div>

        {otherBranches.length > 0 ? (
          <section aria-labelledby="other-heading" className="mt-16 border-t border-line pt-10">
            <SectionHeading
              eyebrow="Also"
              id="other-heading"
              title="Our other site"
              lead="Not yet bookable online. Ring the Littlewick Green number and we will help."
            />
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {otherBranches.map((other) => (
                <li key={other.id} className="rounded-2xl border border-line bg-surface p-5">
                  <h3 className="font-display text-xl">{other.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {other.addressLine1
                      ? `${other.addressLine1}, ${other.postcode ?? ''}`
                      : 'Details coming soon.'}
                  </p>
                  <p className="mt-3 text-sm">
                    <Link href="/contact" className="text-brand-text underline underline-offset-2">
                      Call {formatPhone(branch.phone)}
                    </Link>{' '}
                    <span className="text-muted">for anything at this site.</span>
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  )
}
