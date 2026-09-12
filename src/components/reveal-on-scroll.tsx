'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Reveals `[data-reveal]` elements as they scroll into view, and `[data-reveal-group]` elements
 * whose children then arrive one after another (the stagger itself is nth-child in CSS).
 *
 * Mounted once, in the root layout. The important property is the direction of the switch: this
 * component *opts in* to hiding by putting `js-reveal` on <html>, rather than the CSS hiding
 * things and hoping something turns them back on. If this script never runs, fails, or the
 * visitor prefers reduced motion, every section is simply visible. A decorative animation must
 * never be able to hide a restaurant's menu.
 */
export function RevealOnScroll() {
  const pathname = usePathname()

  useEffect(() => {
    const root = document.documentElement

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.classList.remove('js-reveal')
      return
    }

    root.classList.add('js-reveal')

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.setAttribute('data-shown', '')
          observer.unobserve(entry.target)
        }
      },
      // Fire a little before the element's top edge arrives, so it has finished by the time it is
      // properly on screen rather than animating under the reader's eye.
      { rootMargin: '0px 0px -12% 0px', threshold: 0.01 },
    )

    const targets = document.querySelectorAll(
      '[data-reveal]:not([data-shown]), [data-reveal-group]:not([data-shown])',
    )
    for (const target of targets) observer.observe(target)

    // A safety net: anything still hidden after five seconds is shown regardless. An element
    // inside a container that never intersects (a stuck scroll container, an odd viewport) would
    // otherwise stay invisible forever.
    const failsafe = window.setTimeout(() => {
      const stragglers = document.querySelectorAll(
        '[data-reveal]:not([data-shown]), [data-reveal-group]:not([data-shown])',
      )
      for (const target of stragglers) {
        target.setAttribute('data-shown', '')
      }
    }, 5000)

    return () => {
      observer.disconnect()
      window.clearTimeout(failsafe)
    }
  }, [pathname])

  return null
}
