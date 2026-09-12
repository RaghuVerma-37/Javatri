'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Bike, MapPin, ShoppingBag, X } from 'lucide-react'
import { TempleBorder } from '@/components/ornament/temple-border'
import { Doorway } from '@/components/outlet/doorway'
import { useOutlet } from '@/components/outlet/outlet-context'
import { devanagari } from '@/lib/fonts'
import {
  outletAddress,
  outletImage,
  outletLocality,
  outletRegion,
  outletServices,
} from '@/lib/outlet'
import { cn } from '@/lib/cn'

/**
 * A small window asking which kitchen, over the live site.
 *
 * Not the full-screen wall this started as, and not a redirect away to /outlets either. The page
 * behind loads, paints and stays readable; this sits on top of it and can be dismissed. That is
 * the difference between asking a question and blocking the door.
 *
 * It stays honest about a few things:
 *
 *   It is never in the server-rendered HTML, so a crawler and a reader with no JavaScript get the
 *   site, not a hole where it was.
 *   The page behind does not scroll-lock. It is a small dialog, not a takeover, and freezing the
 *   page under a dismissible box is how you make somebody feel trapped by one.
 *   Escape, the close control and the backdrop all take the default outlet and get out of the
 *   way. Dismissing is an answer, and it is remembered like any other.
 */
export function OutletPrompt() {
  const outlet = useOutlet()
  const [dismissed, setDismissed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  // Mount on the client only, and a beat after paint: the site should be up before it is asked
  // anything.
  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 450)
    return () => window.clearTimeout(timer)
  }, [])

  const open = Boolean(mounted && !dismissed && outlet && outlet.outlets.length > 1 && !outlet.hasChosen)

  useEffect(() => {
    if (!open) return

    panelRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDismissed(true)
        outlet?.choose(outlet.outlets[0]?.slug ?? '')
        return
      }

      if (event.key !== 'Tab') return

      // Focus stays in the dialog while it is up, then goes back to the page when it closes.
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable || focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, outlet])

  if (!open || !outlet) return null

  const settle = (slug: string) => {
    setDismissed(true)
    outlet.choose(slug)
  }

  return (
    /*
      One fixed flex box doing the centring, rather than left/top 50% and a pair of negative
      translates. The absolute version fought `inset-x-4` at the mobile breakpoint and settled a
      couple of hundred pixels left of centre; a flex container cannot get that wrong at any width,
      and it gives the dialog somewhere to scroll if a short window makes it taller than the
      viewport.
    */
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto p-4 sm:p-6">
      {/* Dimmed, not opaque: the site stays visible behind, which is the whole point. */}
      <div
        className="prompt-veil absolute inset-0 bg-ink/40 backdrop-blur-[3px]"
        onClick={() => settle(outlet.outlets[0]?.slug ?? '')}
        role="presentation"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="outlet-prompt-title"
        tabIndex={-1}
        className="prompt-panel relative w-full max-w-[44rem] overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_40px_80px_-30px_rgba(28,36,20,0.75)] outline-none"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={() => settle(outlet.outlets[0]?.slug ?? '')}
          className="absolute right-3.5 top-3.5 z-10 inline-flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-bg hover:text-ink"
        >
          <X aria-hidden className="size-4" />
          <span className="sr-only">Close and use {outletLocality(outlet.outlets[0]!)}</span>
        </button>

        <div className="px-5 pt-6 text-center sm:px-8 sm:pt-8">
          <p lang="hi" className={cn(devanagari.className, 'text-[1.625rem] leading-none text-accent')}>
            नमस्ते
          </p>
          <h2
            id="outlet-prompt-title"
            className="mt-3 font-display text-[1.75rem] leading-tight text-ink sm:text-[2rem]"
          >
            Which Javatri are you visiting?
          </h2>
          <div className="mx-auto mt-4 max-w-[13rem] text-olive/60">
            <TempleBorder id="temple-prompt" />
          </div>
          {/* Hidden on a phone: the two options and their addresses say this already, and the
              paragraph was the difference between the dialog fitting the screen and not. */}
          <p className="mx-auto mt-4 hidden max-w-md text-sm leading-relaxed text-muted sm:block">
            We will remember it. The menu, the opening hours and the ordering on every page will be
            that kitchen&rsquo;s.
          </p>
        </div>

        <ul className="grid gap-3 p-5 sm:grid-cols-2 sm:gap-4 sm:p-8">
          {outlet.outlets.map((item, index) => {
            const services = outletServices(item)
            const region = outletRegion(item.slug)
            return (
            <li key={item.slug} className="h-full">
              <button
                type="button"
                onClick={() => settle(item.slug)}
                /*
                  A row on a phone, a doorway card from sm up. Stacked full-height cards ran the
                  dialog off the bottom of a 844px screen and put the heading out of reach; a
                  thumbnail and two lines fits twice over.
                */
                className="group flex h-full w-full items-stretch gap-0 overflow-hidden rounded-2xl border border-line bg-bg text-left transition-colors hover:border-olive/45 sm:flex-col sm:items-center sm:text-center"
              >
                <span className="relative block w-28 shrink-0 self-stretch overflow-hidden sm:hidden">
                  <Image
                    src={outletImage(item.slug)}
                    alt=""
                    aria-hidden
                    fill
                    sizes="7rem"
                    className="object-cover"
                  />
                </span>

                <span className="hidden w-full px-8 pt-6 sm:block">
                  <Doorway
                    id={`prompt-door-${item.slug}`}
                    src={outletImage(item.slug)}
                    sizes="16rem"
                    ratio={[5, 4]}
                    delayMs={600 + index * 150}
                  />
                </span>

                <span className="flex min-w-0 flex-1 flex-col p-3.5 sm:items-center sm:p-5 sm:pt-4">
                  <span className="block font-display text-lg leading-tight text-ink sm:text-xl">
                    {outletLocality(item)}
                  </span>
                  {region ? <span className="mt-0.5 block text-xs text-muted">{region}</span> : null}

                  {/* The address, under the option. An outlet whose street is not published shows
                      the trading name alone rather than an empty line. */}
                  <span className="mt-1.5 flex flex-1 gap-1.5 text-xs leading-relaxed text-muted sm:mt-2 sm:justify-center sm:gap-2">
                    <MapPin aria-hidden className="mt-0.5 size-3.5 shrink-0 text-olive" />
                    <span>{outletAddress(item) || item.name}</span>
                  </span>

                  {/* Whether this one delivers, on the choice itself. Finding that out after
                      picking a kitchen is the dead end this rebuild exists to remove. */}
                  <span
                    className={cn(
                      'mt-2.5 inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-[0.6875rem] font-medium sm:self-center',
                      services.delivers ? 'bg-brand-wash text-brand-text' : 'bg-surface-2 text-muted',
                    )}
                  >
                    {services.delivers ? (
                      <Bike aria-hidden className="size-3" />
                    ) : (
                      <ShoppingBag aria-hidden className="size-3" />
                    )}
                    {services.label}
                  </span>

                  <span className="mt-3 inline-flex items-center text-sm font-medium text-brand-text underline decoration-line-strong underline-offset-4 group-hover:decoration-brand-text sm:mt-4">
                    Choose {outletLocality(item)}
                  </span>
                </span>
              </button>
            </li>
            )
          })}
        </ul>

      </div>
    </div>
  )
}