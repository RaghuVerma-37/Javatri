'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'

const LINKS = [
  { href: '/admin', label: 'Today' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/menu', label: 'Menu' },
  { href: '/admin/hours', label: 'Hours' },
  { href: '/admin/reservations', label: 'Bookings' },
  { href: '/admin/enquiries', label: 'Events' },
  { href: '/admin/branch', label: 'Settings' },
] as const

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Admin" className="container-page -mx-0 overflow-x-auto">
      <ul className="flex min-w-max gap-1 pb-2">
        {LINKS.map((link) => {
          const active = link.href === '/admin' ? pathname === '/admin' : pathname.startsWith(link.href)
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-10 items-center rounded-full px-4 text-sm transition-colors',
                  active ? 'bg-brand text-on-brand' : 'text-ink/80 hover:bg-surface-2',
                )}
              >
                {link.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
