import Link from 'next/link'
import { ButtonLink } from '@/components/ui'

export const metadata = { title: 'Page not found' }

/**
 * A 404 that offers the three things anyone arriving at a restaurant website actually wants,
 * rather than an apology and a dead end.
 */
export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60svh] max-w-xl flex-col justify-center py-20">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-text">404</p>
      <h1 className="mt-3 text-4xl">We could not find that page</h1>
      <p className="mt-4 leading-relaxed text-muted">
        It may have moved when we rebuilt the site. Everything the old site had is still here,
        somewhere — try one of these.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/menu">See the menu</ButtonLink>
        <ButtonLink href="/order" variant="secondary">
          Order online
        </ButtonLink>
        <ButtonLink href="/book" variant="secondary">
          Book a table
        </ButtonLink>
      </div>

      <p className="mt-8 text-sm text-muted">
        Or call us on{' '}
        <a href="tel:+441628825753" className="underline underline-offset-4 hover:text-brand-text">
          01628 825753
        </a>
        , or{' '}
        <Link href="/contact" className="underline underline-offset-4 hover:text-brand-text">
          find us
        </Link>
        .
      </p>
    </div>
  )
}
