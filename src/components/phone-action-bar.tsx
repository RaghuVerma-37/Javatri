'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Phone } from 'lucide-react'
import { useCart } from '@/components/cart/cart-context'
import { Tiffin } from '@/components/cart/tiffin'
import { useOutlet } from '@/components/outlet/outlet-context'
import { cn } from '@/lib/cn'
import { telHref } from '@/lib/site'

/** Littlewick Green's number, for when the chosen outlet has none of its own. */
const FALLBACK_PHONE = 'tel:+441628825753'

/*
  Not on /order, which has its own basket bar pinned in the same place; not on the outlet chooser,
  which is a question rather than a page; not in the admin area.
*/
const HIDDEN_ON = ['/order', '/outlets', '/admin']

/**
 * The three things people come to a restaurant site on a phone to do — call, book, order — within
 * reach of a thumb on every page, rather than behind the header menu.
 *
 * Phones and small tablets only: from md up the header already carries all three. A spacer the
 * bar's own height sits at the end of the page so it never covers the last of the footer.
 */
export function PhoneActionBar() {
  const pathname = usePathname()
  const { itemCount, isHydrated } = useCart()
  const outlet = useOutlet()

  if (HIDDEN_ON.some((route) => pathname === route || pathname.startsWith(`${route}/`))) return null

  const phone = telHref(outlet?.current?.phone) || FALLBACK_PHONE
  const count = isHydrated ? itemCount : 0
  const cell =
    'flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-medium text-ink/85 transition-colors hover:bg-surface-2'

  return (
    <>
      <div aria-hidden className="h-[calc(4.5rem+env(safe-area-inset-bottom))] md:hidden" />

      <nav
        aria-label="Call, book or order"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_30px_-24px_rgba(28,36,20,0.5)] backdrop-blur-md md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-[1fr_1fr_1.6fr] items-center gap-2 px-3 py-2">
          <li>
            <a href={phone} className={cell}>
              <Phone aria-hidden className="size-5" />
              Call
            </a>
          </li>
          <li>
            <Link
              href="/book"
              aria-current={pathname === '/book' ? 'page' : undefined}
              className={cn(cell, pathname === '/book' && 'bg-brand-wash text-brand-text')}
            >
              <CalendarDays aria-hidden className="size-5" />
              Book
            </Link>
          </li>
          <li>
            <Link
              href="/order"
              className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand px-4 text-[0.9375rem] font-medium text-on-brand transition-colors hover:bg-brand-hover"
            >
              <Tiffin count={count} className="size-5" />
              Order
              {count > 0 ? (
                <span
                  className="inline-flex min-w-5 items-center justify-center rounded-full bg-on-brand px-1.5 text-xs font-semibold text-brand"
                  aria-label={`${count} ${count === 1 ? 'dish' : 'dishes'} in your basket`}
                >
                  {count}
                </span>
              ) : null}
            </Link>
          </li>
        </ul>
      </nav>
    </>
  )
}
