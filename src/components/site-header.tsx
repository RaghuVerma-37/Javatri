'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { Menu, Phone, ShoppingBag, X } from 'lucide-react'
import { useCart } from '@/components/cart/cart-context'
import { buttonClass } from '@/components/ui'
import { cn } from '@/lib/cn'
import { SITE } from '@/lib/site'

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

const PHONE = '+441628825753'
const PHONE_DISPLAY = '01628 825753'

export function SiteHeader() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const { itemCount, isHydrated } = useCart()

  // On the homepage the header floats over the dark hero until you scroll off it, so the page
  // opens as one cinematic block rather than a pale band laid across a dark one.
  const isHome = pathname === '/'
  const isScrolled = useScrolledPast(80)

  const isOverHero = isHome && !isScrolled && !isOpen

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b transition-colors duration-300',
        isOverHero
          ? 'border-transparent bg-transparent text-[#f7efe4]'
          : 'border-line bg-bg/90 text-ink backdrop-blur-md',
      )}
    >
      <div className="container-page flex h-16 items-center justify-between gap-3 sm:h-18">
        <Link
          href="/"
          className="-ml-1 flex shrink-0 items-center rounded-lg px-1 py-1"
          aria-label={`${SITE.name} home`}
        >
          <span
            className={cn(
              'font-display text-2xl font-semibold tracking-tight transition-colors sm:text-[1.6rem]',
              isOverHero ? 'text-[#f9f2e7]' : 'text-ink',
            )}
          >
            {SITE.name}
          </span>
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
                    isOverHero
                      ? 'text-[#e8dcca] hover:bg-white/10 hover:text-[#f9f2e7]'
                      : isCurrent(item.href)
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
          <a
            href={`tel:${PHONE}`}
            className={cn(
              buttonClass({ variant: 'secondary', size: 'sm' }),
              'hidden sm:inline-flex',
              isOverHero && 'border-[#5a4a3a] bg-transparent text-[#f2e8d9] hover:bg-white/10',
            )}
          >
            <Phone aria-hidden className="size-4" />
            <span className="hidden md:inline">{PHONE_DISPLAY}</span>
            <span className="md:hidden">Call</span>
          </a>

          <Link
            href="/order"
            className={cn(buttonClass({ variant: 'primary', size: 'sm' }), 'relative')}
          >
            <ShoppingBag aria-hidden className="size-4" />
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
              'px-3 lg:hidden',
              isOverHero && 'border-[#5a4a3a] bg-transparent text-[#f2e8d9] hover:bg-white/10',
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
            <li className="mt-2 border-t border-line pt-2">
              <a
                href={`tel:${PHONE}`}
                onClick={() => setIsOpen(false)}
                className="block rounded-xl px-3 py-3 text-base text-ink hover:bg-surface-2"
              >
                Call {PHONE_DISPLAY}
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
 * render already knows the answer — landing on a deep link with a hash does not flash the
 * transparent header for a frame before correcting itself.
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
    // The server cannot know, and the hero is at the top of the page, so "not scrolled" is the
    // correct assumption for the markup React hydrates against.
    () => false,
  )
}
