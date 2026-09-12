'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { Bike, MapPin, ShoppingBag } from 'lucide-react'
import { Jali } from '@/components/home/jali'
import { TempleBorder } from '@/components/ornament/temple-border'
import { Doorway } from '@/components/outlet/doorway'
import type { Outlet } from '@/components/outlet/outlet-context'
import { cn } from '@/lib/cn'
import { devanagari } from '@/lib/fonts'
import {
  OUTLET_COOKIE,
  OUTLET_COOKIE_MAX_AGE,
  outletAddress,
  outletImage,
  outletLocality,
  outletRegion,
  outletServices,
} from '@/lib/outlet'

/**
 * "Which Javatri?" — the whole page, not a panel floating over one.
 *
 * A welcome rather than a form: नमस्ते, and each kitchen as a doorway with its doors ajar and a
 * toran of mango leaves hung across it. The doors ease open as the page arrives and swing wide
 * under the pointer; choosing one throws them fully open while the site loads behind it.
 */
export function OutletChooser({
  outlets,
  destination,
  siteName,
}: {
  outlets: Outlet[]
  destination: string
  siteName: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)

  const choose = useCallback(
    (slug: string) => {
      setPending(slug)
      document.cookie = `${OUTLET_COOKIE}=${encodeURIComponent(slug)}; path=/; max-age=${OUTLET_COOKIE_MAX_AGE}; samesite=lax`
      router.replace(destination)
      // The destination is server-rendered against the new cookie, so it has to be re-fetched
      // rather than served out of the client router's cache.
      router.refresh()
    },
    [router, destination],
  )

  return (
    <main className="relative isolate min-h-svh overflow-clip bg-bg">
      {/* The lattice, very faint, behind the top of the page only. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] text-olive/25 [mask-image:linear-gradient(to_bottom,#000,transparent)]"
      >
        <Jali id="jali-outlets" opacity={0.7} className="size-full" />
      </div>

      <div className="container-page relative flex min-h-svh flex-col justify-center py-14 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p
            lang="hi"
            className={cn(devanagari.className, 'outlet-rise text-[2rem] leading-none text-accent')}
          >
            नमस्ते
          </p>

          <h1
            className="outlet-rise mt-4 text-[clamp(2rem,5.5vw,3.5rem)] leading-[1.05] tracking-[-0.02em] text-ink"
            style={{ ['--delay' as string]: '80ms' }}
          >
            Which {siteName} are you visiting?
          </h1>

          <div
            className="outlet-rise mx-auto mt-6 max-w-sm text-olive/70"
            style={{ ['--delay' as string]: '140ms' }}
          >
            <TempleBorder id="temple-outlets" />
          </div>

          <p
            className="outlet-rise mt-6 text-base leading-relaxed text-muted sm:text-lg"
            style={{ ['--delay' as string]: '200ms' }}
          >
            Choose a kitchen and we will show you its menu, opening hours and ordering on every page.
          </p>
        </div>

        <ul className="mx-auto mt-12 grid w-full max-w-4xl gap-14 sm:mt-16 sm:grid-cols-2 sm:gap-10">
          {outlets.map((outlet, index) => {
            const services = outletServices(outlet)
            const locality = outletLocality(outlet)
            const region = outletRegion(outlet.slug)
            return (
              <li key={outlet.slug} className="h-full">
                <button
                  type="button"
                  onClick={() => choose(outlet.slug)}
                  disabled={pending !== null}
                  aria-busy={pending === outlet.slug}
                  className="outlet-rise group flex h-full w-full flex-col items-center rounded-3xl pb-2 text-center disabled:cursor-wait"
                  style={{ ['--delay' as string]: `${280 + index * 90}ms` }}
                >
                  <Doorway
                    id={`door-${outlet.slug}`}
                    src={outletImage(outlet.slug)}
                    sizes="(min-width: 640px) 20rem, 80vw"
                    priority={index === 0}
                    delayMs={750 + index * 160}
                    className="w-full max-w-[19rem]"
                  />

                  <span className="mt-7 block font-display text-[1.875rem] leading-tight text-ink sm:text-[2.125rem]">
                    {locality}
                  </span>
                  {region ? <span className="mt-1 block text-sm text-muted">{region}</span> : null}

                  <span className="mt-4 flex max-w-xs flex-1 justify-center gap-2 text-[0.9375rem] leading-relaxed text-muted">
                    <MapPin aria-hidden className="mt-1 size-4 shrink-0 text-olive" />
                    <span>{outletAddress(outlet) || outlet.name}</span>
                  </span>

                  <span
                    className={cn(
                      'mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium',
                      services.delivers ? 'bg-brand-wash text-brand-text' : 'bg-surface-2 text-muted',
                    )}
                  >
                    {services.delivers ? (
                      <Bike aria-hidden className="size-3.5" />
                    ) : (
                      <ShoppingBag aria-hidden className="size-3.5" />
                    )}
                    {services.label}
                  </span>

                  <span className="mt-6 inline-flex min-h-11 items-center rounded-full border border-line-strong bg-surface px-6 font-medium text-ink transition-colors group-hover:border-olive group-hover:bg-lime">
                    {pending === outlet.slug ? 'Taking you there' : `Choose ${locality}`}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        <p className="mt-12 text-center text-sm text-muted">
          You can change this at any time from the header.
        </p>
      </div>
    </main>
  )
}
