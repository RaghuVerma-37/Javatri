'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { Menu, Phone, X } from 'lucide-react'
import { useCart } from '@/components/cart/cart-context'
import { Tiffin } from '@/components/cart/tiffin'
import { OutletSwitcher } from '@/components/outlet/outlet-switcher'
import { useOutlet } from '@/components/outlet/outlet-context'
import { buttonClass } from '@/components/ui'
import Image from 'next/image'
import { cn } from '@/lib/cn'
import { SITE, formatPhone, telHref } from '@/lib/site'

/**
 * One header, one set of destinations.
 *
 * The old site's header sent "ORDER ONLINE" to a page that refused orders, while the homepage
 * hero sent "ONLINE ORDERING" somewhere else and "View our Menu" somewhere else again. Here
 * every route appears exactly once and every order button goes to /order.
 */

const NAV = [
  { href: '/menu', label: 'Menu' },
  { href: '/order', label: 'Order online' },
  { href: '/book', label: 'Book a table' },
  { href: '/events', label: 'Events' },
  { href: '/contact', label: 'Contact' },
] as const

/*
  The fallback number, used when there is no outlet context or the chosen outlet has no phone of
  its own. It is Littlewick Green's, which is the only number Javatri publishes anywhere.
*/
const PHONE = 'tel:+441628825753'
const PHONE_DISPLAY = '01628 825753'

/*
  There is no longer a dark hero for the header to float over.

  Both heroes open in Lime Cream now, which is the same colour this bar is, so the whole
  transparent-over-a-dark-block state is gone — and with it the scroll listener that drove it, the
  route list it had to be kept in step with, and three sets of override colours. The header is one
  thing on every route.
*/

/* The red wordmark, full stop. The light-on-dark variant went with the dark theme: on cream the
   logo's #851917 is 8.9:1, which is the best ground this mark has had here. */
const LOGO = '/javatri-logo.webp'
/** Intrinsic size of the wordmark, so the header reserves the right box before it loads. */
const LOGO_SIZE = { width: 313, height: 113 } as const
const LOGO_CLASS = 'h-8 w-auto sm:h-9'

export function SiteHeader() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const { itemCount, isHydrated } = useCart()
  const outlet = useOutlet()

  // The number belongs to the outlet you are looking at. An outlet with no published number falls
  // back rather than rendering a dead `tel:` link.
  const phone = telHref(outlet?.current?.phone) || PHONE
  const phoneDisplay = formatPhone(outlet?.current?.phone) || PHONE_DISPLAY

  const isScrolled = useScrolledPast(24)

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  // /outlets is the question "which kitchen?" — a header offering an Order button and an outlet
  // switcher on top of it would be answering the question and asking it at the same time.
  if (pathname === '/outlets') return null

  return (
    <header
      /* Condenses once you leave the hero: the bar loses a little height and gains a shadow, so
         it reads as lifting off the page rather than sitting in it. */
      className={cn(
        'sticky top-0 z-50 border-b bg-bg/90 text-ink backdrop-blur-md transition-[box-shadow,border-color] duration-300',
        isScrolled ? 'border-line shadow-[0_10px_30px_-24px_rgba(28,36,20,0.55)]' : 'border-transparent',
      )}
    >
      <div
        className={cn(
          'container-page flex items-center justify-between gap-3 transition-[height] duration-300',
          isScrolled ? 'h-14 sm:h-16' : 'h-16 sm:h-18',
        )}
      >
        <Link
          href="/"
          className="-ml-1 flex min-h-11 shrink-0 items-center rounded-lg px-1 py-1"
          aria-label={`${SITE.name} home`}
        >
          {/* Decorative: the link already carries the accessible name. */}
          <Image src={LOGO} alt="" priority {...LOGO_SIZE} className={LOGO_CLASS} />
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isCurrent(item.href) ? 'page' : undefined}
                  className={cn(
                    'rounded-full px-3.5 py-2 text-[0.9375rem] transition-colors',
                    isCurrent(item.href)
                      ? 'bg-brand-wash font-medium text-brand-text'
                      : 'text-ink/80 hover:bg-surface-2 hover:text-ink',
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          {/* Renders nothing at all while there is only one outlet switched on. */}
          <OutletSwitcher className="hidden sm:block" />

          <a
            href={phone}
            className={cn(
              buttonClass({ variant: 'secondary', size: 'sm' }),
              // 44px on anything thumb-operated; the desktop header keeps its lighter 36px.
              'hidden min-h-11 sm:inline-flex lg:min-h-9',
            )}
          >
            <Phone aria-hidden className="size-4" />
            <span className="hidden md:inline">{phoneDisplay}</span>
            <span className="md:hidden">Call</span>
          </a>

          <Link
            href="/order"
            className={cn(buttonClass({ variant: 'primary', size: 'sm' }), 'relative min-h-11 lg:min-h-9')}
          >
            <Tiffin count={isHydrated ? itemCount : 0} className="size-5" />
            <span>Order</span>
            {isHydrated && itemCount > 0 ? (
              <span
                className="ml-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-on-brand px-1.5 text-xs font-semibold text-brand"
                aria-label={`${itemCount} ${itemCount === 1 ? 'dish' : 'dishes'} in your basket`}
              >
                {itemCount}
              </span>
            ) : null}
          </Link>

          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
            aria-controls="mobile-nav"
            className={cn(
              buttonClass({ variant: 'secondary', size: 'sm' }),
              'min-h-11 min-w-11 px-3 lg:hidden',
            )}
          >
            {isOpen ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
            <span className="sr-only">{isOpen ? 'Close menu' : 'Open menu'}</span>
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        hidden={!isOpen}
        className="border-t border-line bg-surface lg:hidden"
      >
        <nav aria-label="Main, mobile" className="container-page py-3">
          <ul className="flex flex-col">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  aria-current={isCurrent(item.href) ? 'page' : undefined}
                  className={cn(
                    'block rounded-xl px-3 py-3 text-base',
                    isCurrent(item.href)
                      ? 'bg-brand-wash font-medium text-brand-text'
                      : 'text-ink hover:bg-surface-2',
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="mt-2 border-t border-line pt-2 sm:hidden">
              <div className="px-3 py-2">
                <OutletSwitcher />
              </div>
            </li>
            <li className="border-t border-line pt-2">
              <a
                href={phone}
                onClick={() => setIsOpen(false)}
                className="block rounded-xl px-3 py-3 text-base text-ink hover:bg-surface-2"
              >
                Call {phoneDisplay}
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}

/**
 * Whether the page is scrolled past a threshold.
 *
 * Scroll position is browser state, not React state, so it is read with `useSyncExternalStore`
 * rather than mirrored into a `useState` from inside an effect. That also means the very first
 * render already knows the answer — landing on a deep link with a hash does not flash the tall
 * header for a frame before correcting itself.
 */
function useScrolledPast(threshold: number): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener('scroll', onChange, { passive: true })
    window.addEventListener('resize', onChange, { passive: true })
    return () => {
      window.removeEventListener('scroll', onChange)
      window.removeEventListener('resize', onChange)
    }
  }, [])

  return useSyncExternalStore(
    subscribe,
    () => window.scrollY > threshold,
    // The server cannot know, and every page starts at the top, so "not scrolled" is the correct
    // assumption for the markup React hydrates against.
    () => false,
  )
}
