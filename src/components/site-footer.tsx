import Link from 'next/link'
import { MapPin, Phone } from 'lucide-react'
import { FacebookIcon, InstagramIcon, TripAdvisorIcon } from '@/components/social-icons'
import { OpenStatus } from '@/components/open-status'
import { summariseWeek } from '@/lib/hours'
import { SITE } from '@/lib/site'
import { getBranchSafe, getServiceState } from '@/server/branch'

const YEAR = new Date().getFullYear()

export async function SiteFooter() {
  // The footer renders on every page, including the "not set up yet" one, so it must survive an
  // unreachable database rather than take the whole page down with it.
  const branch = await getBranchSafe()

  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:py-16">
        <div className="lg:col-span-1">
          <p className="font-display text-2xl font-semibold text-ink">{SITE.name}</p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Indian kitchen and banqueting hall at The Bell and Bottle, on the Bath Road in
            Littlewick Green.
          </p>
          {branch ? (
            <div className="mt-4">
              <OpenStatus branch={branch} state={getServiceState(branch)} />
            </div>
          ) : null}
        </div>

        <nav aria-labelledby="footer-nav-heading">
          <h2 id="footer-nav-heading" className="text-sm font-semibold text-ink">
            Visit
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {[
              { href: '/menu', label: 'Our menus' },
              { href: '/order', label: 'Order online' },
              { href: '/book', label: 'Book a table' },
              { href: '/events', label: 'Weddings & events' },
              { href: '/contact', label: 'Find us' },
            ].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-muted transition-colors hover:text-brand-text">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <section aria-labelledby="footer-hours-heading">
          <h2 id="footer-hours-heading" className="text-sm font-semibold text-ink">
            Opening hours
          </h2>
          {branch && branch.openingHours.length > 0 ? (
            <dl className="mt-4 space-y-2 text-sm">
              {summariseWeek(branch.openingHours).map((row) => (
                <div key={row.label} className="flex justify-between gap-4">
                  <dt className="text-muted">{row.label}</dt>
                  <dd className="tabular-nums text-ink">{row.hours}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-4 text-sm text-muted">Please call for today&rsquo;s hours.</p>
          )}
        </section>

        <section aria-labelledby="footer-contact-heading">
          <h2 id="footer-contact-heading" className="text-sm font-semibold text-ink">
            Find us
          </h2>
          <address className="mt-4 space-y-3 text-sm not-italic text-muted">
            <p className="flex gap-2.5">
              <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
              <span>
                The Bell and Bottle, Bath Road
                <br />
                Littlewick Green, Maidenhead
                <br />
                SL6 3RX
              </span>
            </p>
            <p className="flex gap-2.5">
              <Phone aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
              <a href="tel:+441628825753" className="transition-colors hover:text-brand-text">
                01628 825753
              </a>
            </p>
          </address>

          <ul className="mt-5 flex gap-2">
            <li>
              <a
                href={SITE.social.facebook}
                rel="noreferrer noopener"
                target="_blank"
                className="inline-flex size-10 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-brand-text hover:text-brand-text"
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
                className="inline-flex size-10 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-brand-text hover:text-brand-text"
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
                className="inline-flex size-10 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-brand-text hover:text-brand-text"
              >
                <TripAdvisorIcon />
                <span className="sr-only">Javatri on Tripadvisor</span>
              </a>
            </li>
          </ul>
        </section>
      </div>

      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {YEAR} {SITE.legalName}. All rights reserved.{' '}
            <Link href="/photo-credits" className="underline underline-offset-2 hover:text-brand-text">
              Photo credits
            </Link>
            .
          </p>
          <p>
            Allergies? Please{' '}
            <Link href="/menu#allergens" className="underline underline-offset-2 hover:text-brand-text">
              talk to us before you order
            </Link>
            .
          </p>
        </div>
      </div>
    </footer>
  )
}
