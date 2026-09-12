'use client'

import { usePathname } from 'next/navigation'

/**
 * Hides the site furniture on pages that are a junction rather than a destination.
 *
 * The footer is an async server component, so it cannot ask for the pathname itself; this wraps
 * it in the one client component that can. The header does the same check inline because it was
 * already a client component.
 */
const BARE_ROUTES = new Set(['/outlets'])

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (BARE_ROUTES.has(pathname)) return null
  return <>{children}</>
}
