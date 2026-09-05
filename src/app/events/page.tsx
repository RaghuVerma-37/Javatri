import type { Metadata } from 'next'
import { NotConfigured } from '@/components/not-configured'
import { DemoNotice } from '@/components/demo-notice'
import { isDatabaseConfigured } from '@/server/static-data'
import Link from 'next/link'
import { Car, Check, Lightbulb, Users, Utensils, Wine } from 'lucide-react'
import { EnquiryForm } from '@/components/forms/enquiry-form'
import { ButtonLink, SectionHeading } from '@/components/ui'
import { breadcrumbSchema, JsonLd } from '@/lib/jsonld'
import { formatPenceCompact } from '@/lib/money'
import { SITE, absoluteUrl } from '@/lib/site'
import { getBranchSafe } from '@/server/branch'

export const metadata: Metadata = {
  title: 'Weddings & events',
  description:
    'Banqueting for up to 150 guests at The Bell and Bottle, Littlewick Green, Maidenhead. Wedding functions, corporate days and private parties from £40 per person, including staff, uplighting and parking.',
  alternates: { canonical: '/events' },
  openGraph: {
    title: 'Weddings & events · Javatri',
    description: 'Banqueting for up to 150 guests in Littlewick Green, Maidenhead. From £40 per person.',
    url: absoluteUrl('/events'),
  },
}

export const revalidate = 3600

const PACKAGE = [
  { icon: Utensils, text: 'Three courses — four starters, four mains and two desserts, chosen with you' },
  { icon: Wine, text: 'Unlimited soft drinks and juices, with a bar for everything else' },
  { icon: Check, text: 'Fine cutlery, crockery, linen and glassware' },
  { icon: Check, text: 'Chair covers with sashes and bows' },
  { icon: Lightbulb, text: 'Multicolour uplighting through the hall' },
  { icon: Users, text: 'Professional banquet staff for the whole event' },
  { icon: Check, text: 'Male and female restrooms' },
  { icon: Car, text: 'Car parking on site' },
]

const EVENT_TYPES = [
  { title: 'Weddings', copy: 'Mehndi, sangeet, the reception itself — or all three across a weekend.' },
  { title: 'Corporate', copy: 'Away days, launches and Christmas parties, with a room that seats everyone.' },
  { title: 'Private parties', copy: 'Milestone birthdays, anniversaries, naming ceremonies, wakes.' },
  { title: 'Meetings & exhibitions', copy: 'A flat, flexible room with parking and food that is not a sandwich platter.' },
]

export default async function EventsPage() {
  const branch = await getBranchSafe()
  if (!branch) return <NotConfigured />

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Weddings & events', path: '/events' },
        ])}
      />

      {/* Dark opening, echoing the homepage hero — events is the line the old site buried, so it
          gets the same weight here as ordering does there. */}
      <section className="hero -mt-16 sm:-mt-18">
        <div aria-hidden className="hero-aurora">
          <span />
          <span />
          <span />
        </div>
        <div aria-hidden className="hero-grain" />
        <div className="container-page relative py-24 sm:py-32">
          <p className="fade-up text-xs font-semibold uppercase tracking-[0.2em] text-[#e2b25f]">
            Banqueting · up to {SITE.banqueting.maxGuests} guests
          </p>
          <h1 className="reveal-line mt-5 max-w-3xl text-[clamp(2.5rem,7vw,4.5rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-[#f9f2e7]">
            <span className="reveal-word" style={{ ['--delay' as string]: '150ms' }}>
              A hall for a hundred and fifty,
            </span>{' '}
            <span className="reveal-word" style={{ ['--delay' as string]: '260ms' }}>
              and a kitchen that can feed them.
            </span>
          </h1>
          <p
            className="fade-up mt-7 max-w-2xl text-lg leading-relaxed text-[#c9bba6]"
            style={{ ['--delay' as string]: '420ms' }}
          >
            Wedding functions, corporate days, private parties and exhibitions, from{' '}
            {formatPenceCompact(SITE.banqueting.fromPerPersonInPence)} a head — with staff,
            uplighting, linen and parking already in the price rather than added to it afterwards.
          </p>
          <div className="fade-up mt-9 flex flex-wrap gap-3" style={{ ['--delay' as string]: '520ms' }}>
            <ButtonLink href="#enquire" size="lg">
              Tell us about your event
            </ButtonLink>
            <a
              href={`tel:${branch.phone?.replace(/\s/g, '')}`}
              className="inline-flex min-h-13 items-center rounded-full border border-[#5a4a3a] px-7 text-base text-[#f2e8d9] transition-colors hover:border-[#d99a2b] hover:text-[#f7d9a0]"
            >
              Call {branch.phone}
            </a>
          </div>
        </div>
      </section>

      <section aria-labelledby="package-heading" className="container-page py-16 sm:py-24">
        <div data-reveal className="grid gap-10 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-16">
          <SectionHeading
            eyebrow="What you get"
            id="package-heading"
            title={`From ${formatPenceCompact(SITE.banqueting.fromPerPersonInPence)} per person`}
            lead="One price, one conversation. The list below is what is included; the only things that get added are the bar tab and anything unusual you ask us for."
          />

          <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {PACKAGE.map((entry) => {
              const Icon = entry.icon
              return (
                <li key={entry.text} className="flex gap-3 text-[0.9375rem] leading-relaxed">
                  <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
                  <span>{entry.text}</span>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="types-heading"
        data-reveal
        className="border-y border-line bg-surface py-16 sm:py-24"
      >
        <div className="container-page">
          <SectionHeading eyebrow="What we host" id="types-heading" title="The kinds of day we are good at" />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {EVENT_TYPES.map((type) => (
              <div key={type.title} className="rounded-2xl border border-line p-5">
                <h3 className="font-display text-xl">{type.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{type.copy}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 max-w-2xl text-sm leading-relaxed text-muted">
            Menus are built from{' '}
            <Link href="/menu" className="underline underline-offset-2 hover:text-brand-text">
              our full menu
            </Link>{' '}
            rather than a separate list, so you can taste everything before you choose. Vegetarian,
            vegan and Jain menus are no trouble — tell us in the form and we will plan around it.
          </p>
        </div>
      </section>

      <section aria-labelledby="enquire" className="container-page py-16 sm:py-24">
        <div data-reveal className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
          <div className="min-w-0 max-w-2xl">
            <SectionHeading
              eyebrow="Start here"
              id="enquire"
              title="Tell us about your event"
              lead="Four fields and a sentence is plenty. We will come back within a day with a price and a date."
              className="scroll-mt-24"
            />
            <div className="mt-9">
              {isDatabaseConfigured() ? <EnquiryForm /> : <DemoNotice context="form" />}
            </div>
          </div>

          <aside className="h-max space-y-5 rounded-2xl border border-line bg-surface p-6">
            <div>
              <h2 className="text-lg">The room</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Seated capacity</dt>
                  <dd className="tabular-nums">{SITE.banqueting.maxGuests}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">From</dt>
                  <dd className="tabular-nums">
                    {formatPenceCompact(SITE.banqueting.fromPerPersonInPence)} pp
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Parking</dt>
                  <dd>On site</dd>
                </div>
              </dl>
            </div>
            <div className="border-t border-line pt-5">
              <h2 className="text-lg">Rather talk?</h2>
              <a
                href={`tel:${branch.phone?.replace(/\s/g, '')}`}
                className="mt-2 inline-block font-display text-xl font-semibold text-brand-text underline underline-offset-4"
              >
                {branch.phone}
              </a>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {branch.addressLine1}, {branch.addressLine2}, {branch.city} {branch.postcode}
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  )
}
