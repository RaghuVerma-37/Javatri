import Link from 'next/link'
import { TempleBorder } from '@/components/ornament/temple-border'
import { MapPin, Phone } from 'lucide-react'
import { FacebookIcon, InstagramIcon, TripAdvisorIcon } from '@/components/social-icons'
import { OpenStatus } from '@/components/open-status'
import { summariseWeek } from '@/lib/hours'
import { outletAddressLines, outletWords } from '@/lib/outlet'
import { SITE, formatPhone, telHref } from '@/lib/site'
import { getBranchSafe, getSelectedBranchSlug, getServiceState } from '@/server/branch'

const YEAR = new Date().getFullYear()

/*
  Littlewick Green's details, for the one case where there is no branch to read: the database is
  unreachable. With a branch, every line below is that outlet's own.
*/
const FALLBACK = {
  blurb: 'Indian kitchen and banqueting hall at The Bell and Bottle, on the Bath Road in Littlewick Green.',
  address: ['The Bell and Bottle, Bath Road', 'Littlewick Green, Maidenhead', 'SL6 3RX'],
  tel: 'tel:+441628825753',
  phone: '01628 825753',
}

export async function SiteFooter() {
  // The footer renders on every page, including the "not set up yet" one, so it must survive an
  // unreachable database rather than take the whole page down with it.
  const branch = await getBranchSafe(await getSelectedBranchSlug())

  return (
    /*
      The footer is the one place the palette goes deep. Olive Mist taken down to #37492A, full
      bleed, cream type on it at 8.9:1 — it closes the page the way the Pistachio band opens it,
      and keeps the middle of the site quiet between them.

      No top margin: it is its own colour band, so the gap it used to need in order to separate
      itself from a same-coloured page just read as a hole above it.
    */
    <footer className="bg-forest text-cream">
      {/* The border runs along the top edge of the footer the way it runs along the hem of a
          sari — the one place on the page where the site closes, so the one place it is edged. */}
      <div aria-hidden className="text-cream/40">
        <TempleBorder id="temple-footer" flip />
      </div>
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:py-16">
        <div className="lg:col-span-1">
          <p className="font-display text-2xl text-cream">{SITE.name}</p>
          <p className="mt-3 text-sm leading-relaxed text-lime">
            {branch ? outletWords(branch).footerBlurb : FALLBACK.blurb}
          </p>
          {branch ? (
            <div className="mt-4">
              <OpenStatus branch={branch} state={getServiceState(branch)} />
            </div>
          ) : null}
        </div>

        <nav aria-labelledby="footer-nav-heading">
          <h2 id="footer-nav-heading" className="text-sm font-semibold text-cream">
            Visit
          </h2>
          {/* space-y is gone: the padding below is what makes each row a 44px target. */}
          <ul className="mt-2 text-sm">
            {[
              { href: '/menu', label: 'Our menus' },
              { href: '/order', label: 'Order online' },
              { href: '/book', label: 'Book a table' },
              { href: '/events', label: 'Weddings & events' },
              { href: '/contact', label: 'Find us' },
            ].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center text-lime transition-colors hover:text-pear"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <section aria-labelledby="footer-hours-heading">
          <h2 id="footer-hours-heading" className="text-sm font-semibold text-cream">
            Opening hours
          </h2>
          {branch && branch.openingHours.length > 0 ? (
            <dl className="mt-4 space-y-2 text-sm">
              {summariseWeek(branch.openingHours).map((row) => (
                <div key={row.label} className="flex justify-between gap-4">
                  <dt className="text-lime/85">{row.label}</dt>
                  <dd className="tabular-nums text-cream">{row.hours}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-4 text-sm text-lime">Please call for today&rsquo;s hours.</p>
          )}
        </section>

        <section aria-labelledby="footer-contact-heading">
          <h2 id="footer-contact-heading" className="text-sm font-semibold text-cream">
            Find us
          </h2>
          <address className="mt-4 space-y-3 text-sm not-italic text-lime">
            <p className="flex gap-2.5">
              <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-pistachio" />
              <span>
                {(branch ? outletAddressLines(branch) : FALLBACK.address).map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </span>
            </p>
            <p className="flex gap-2.5">
              <Phone aria-hidden className="mt-0.5 size-4 shrink-0 text-pistachio" />
              <a href={telHref(branch?.phone) || FALLBACK.tel} className="transition-colors hover:text-pear">
                {formatPhone(branch?.phone) || FALLBACK.phone}
              </a>
            </p>
          </address>

          <ul className="mt-5 flex gap-2">
            <li>
              <a
                href={SITE.social.facebook}
                rel="noreferrer noopener"
                target="_blank"
                className="inline-flex size-10 items-center justify-center rounded-full border border-cream/25 text-lime transition-colors hover:border-pear hover:text-pear"
              >
                <FacebookIcon />
                <span className="sr-only">Javatri on Facebook</span>
              </a>
            </li>
            <li>
              <a
                href={SITE.social.instagram}
                rel="noreferrer noopener"
                target="_blank"
                className="inline-flex size-10 items-center justify-center rounded-full border border-cream/25 text-lime transition-colors hover:border-pear hover:text-pear"
              >
                <InstagramIcon />
                <span className="sr-only">Javatri on Instagram</span>
              </a>
            </li>
            <li>
              <a
                href={SITE.social.tripadvisor}
                rel="noreferrer noopener"
                target="_blank"
                className="inline-flex size-10 items-center justify-center rounded-full border border-cream/25 text-lime transition-colors hover:border-pear hover:text-pear"
              >
                <TripAdvisorIcon />
                <span className="sr-only">Javatri on Tripadvisor</span>
              </a>
            </li>
          </ul>
        </section>
      </div>

      <div className="border-t border-cream/15">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-lime/85 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {YEAR} {SITE.legalName}. All rights reserved.{' '}
            <Link href="/photo-credits" className="underline underline-offset-2 hover:text-pear">
              Photo credits
            </Link>
            .
          </p>
          <p>
            Allergies? Please{' '}
            <Link href="/menu#allergens" className="underline underline-offset-2 hover:text-pear">
              talk to us before you order
            </Link>
            .
          </p>
        </div>
      </div>
    </footer>
  )
}
