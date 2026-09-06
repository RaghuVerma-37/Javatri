import { ArrowRight, ChevronDown, Clock } from 'lucide-react'
import { SpiceField } from '@/components/home/spice-field'
import { OpenStatus } from '@/components/open-status'
import { buttonClass } from '@/components/ui'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import type { BranchWithHours, ServiceState } from '@/server/branch'

/** Cycled under the headline. Real sections of the real menu, not invented atmosphere. */
const DISHES = ['chaat', 'the tandoor', 'biryani', 'dosas', 'kulfi'] as const
const WORD_SECONDS = 2.6

const HEADLINE = [
  ['Indian', 'cooking,'],
  ['on', 'the', 'Bath', 'Road.'],
]

export type TonightPanel = {
  /** "19:20", or null when there is nothing bookable in the next few days. */
  earliestPickup: string | null
  earliestPickupDay: string | null
  earliestDelivery: string | null
  earliestDeliveryDay: string | null
}

export function Hero({
  branch,
  state,
  tonight,
}: {
  branch: BranchWithHours
  state: ServiceState
  tonight: TonightPanel
}) {
  let wordIndex = 0

  return (
    /*
      Pulled up under the header. The header stays sticky and in normal flow — it just paints on
      top of the hero rather than pushing it down, so the transparent state has something dark
      behind it instead of the page background.
    */
    <section className="hero -mt-16 sm:-mt-18">
      <div aria-hidden className="hero-aurora">
        <span />
        <span />
        <span />
      </div>
      <div aria-hidden className="hero-grain" />
      <SpiceField />

      <div className="container-page relative grid min-h-[min(96svh,46rem)] items-center gap-14 pb-20 pt-32 sm:pb-28 sm:pt-40 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
      <div className="flex flex-col justify-center">
        <p
          className="fade-up text-xs font-semibold uppercase tracking-[0.2em] text-[#e2b25f]"
          style={{ ['--delay' as string]: '120ms' }}
        >
          The Bell and Bottle · Littlewick Green
        </p>

        <h1 className="mt-5 max-w-4xl text-[clamp(2.75rem,9vw,5.5rem)] font-semibold leading-[0.98] tracking-[-0.03em] text-[#f9f2e7]">
          {HEADLINE.map((line, lineIndex) => (
            <span key={lineIndex} className="reveal-line">
              {line.map((word) => {
                const delay = 220 + wordIndex++ * 70
                return (
                  <span
                    key={word}
                    className="reveal-word"
                    style={{ ['--delay' as string]: `${delay}ms` }}
                  >
                    {word}
                    {' '}
                  </span>
                )
              })}
            </span>
          ))}
        </h1>

        <div
          aria-hidden
          className="rule-draw mt-8 h-px w-full max-w-md bg-gradient-to-r from-[#d99a2b] to-transparent"
          style={{ ['--delay' as string]: '700ms' }}
        />

        <p
          className="fade-up mt-7 text-lg text-[#e8dcca] sm:text-xl"
          style={{ ['--delay' as string]: '760ms' }}
        >
          <span className="text-[#b3a48c]">Tonight, from </span>
          {/*
            Decorative motion. A screen reader gets the flat sentence below instead of five words
            taking it in turns, which is the same information without the theatre.
          */}
          <span
            aria-hidden
            className="word-rotator font-display font-semibold text-[#f0b755]"
            style={{ ['--cycle-duration' as string]: `${DISHES.length * WORD_SECONDS}s` }}
          >
            {DISHES.map((dish, index) => (
              <span key={dish} style={{ ['--delay' as string]: `${index * WORD_SECONDS}s` }}>
                {dish}
              </span>
            ))}
          </span>
          <span className="sr-only">chaat, the tandoor, biryani, dosas and kulfi</span>
        </p>

        <p
          className="fade-up mt-5 max-w-xl text-base leading-relaxed text-[#c9bba6] sm:text-lg"
          style={{ ['--delay' as string]: '840ms' }}
        >
          Chaat, charcoal and slow-cooked curries in a Berkshire village pub. Collect it, have it
          delivered, book a table — or fill the banqueting hall with a hundred and fifty guests.
        </p>

        <div
          className="fade-up mt-9 flex flex-wrap items-center gap-3"
          style={{ ['--delay' as string]: '920ms' }}
        >
          <Link href="/order" className={cn(buttonClass({ size: 'lg' }), 'group')}>
            Order online
            <ArrowRight
              aria-hidden
              className="size-4 transition-transform duration-300 group-hover:translate-x-1"
            />
          </Link>
          <Link
            href="/menu"
            className="inline-flex min-h-13 items-center rounded-full border border-[#5a4a3a] px-7 text-base text-[#f2e8d9] transition-colors hover:border-[#d99a2b] hover:text-[#f7d9a0]"
          >
            See the menu
          </Link>
          <Link
            href="/book"
            className="inline-flex min-h-13 items-center px-2 text-base text-[#c9bba6] underline underline-offset-8 transition-colors hover:text-[#f7d9a0]"
          >
            Book a table
          </Link>
        </div>

        <div className="fade-up mt-9" style={{ ['--delay' as string]: '1000ms' }}>
          <OpenStatus branch={branch} state={state} />
        </div>
      </div>

      <TonightCard branch={branch} state={state} tonight={tonight} />
      </div>

      <div
        aria-hidden
        className="scroll-cue pointer-events-none absolute inset-x-0 bottom-5 flex justify-center text-[#8d7c66]"
      >
        <span>
          <ChevronDown className="size-5" />
        </span>
      </div>
    </section>
  )
}

/**
 * The panel on the right of the hero.
 *
 * It exists because the answer to "shall we get a curry" is almost always "how soon can we have
 * it", and the old site made that unanswerable. It states the earliest real collection time,
 * computed from the opening hours and the kitchen's lead time — and when the kitchen is shut it
 * says so and offers tomorrow, rather than going quiet.
 */
function TonightCard({
  branch,
  state,
  tonight,
}: {
  branch: BranchWithHours
  state: ServiceState
  tonight: TonightPanel
}) {
  return (
    <aside
      aria-label="Ordering tonight"
      /*
        Shown at every width. This is the block that answers "can I actually get food, and when" —
        hiding it below lg meant the one module that converts was missing on the devices nearly
        all of this site's traffic uses.
      */
      className="fade-up rounded-3xl border border-white/12 bg-white/[0.055] p-5 backdrop-blur-xl sm:p-6"
      style={{ ['--delay' as string]: '1080ms' }}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e2b25f]">
        {state.isOpen ? 'Open now' : 'Order ahead'}
      </p>

      <dl className="mt-5 space-y-4 text-sm">
        <div className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-4">
          <dt className="text-[#b3a48c]">Collection</dt>
          <dd className="text-right font-medium text-[#f2e8d9]">
            {tonight.earliestPickup ? (
              <>
                <span className="tabular-nums">{tonight.earliestPickup}</span>
                <span className="block text-xs font-normal text-[#b3a48c]">
                  {tonight.earliestPickupDay}
                </span>
              </>
            ) : (
              <span className="text-xs font-normal text-[#b3a48c]">Call us</span>
            )}
          </dd>
        </div>

        <div className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-4">
          <dt className="text-[#b3a48c]">Delivery</dt>
          <dd className="text-right font-medium text-[#f2e8d9]">
            {branch.acceptsDelivery && tonight.earliestDelivery ? (
              <>
                <span className="tabular-nums">{tonight.earliestDelivery}</span>
                <span className="block text-xs font-normal text-[#b3a48c]">
                  within {branch.deliveryRadiusMiles} miles
                </span>
              </>
            ) : (
              <span className="text-xs font-normal text-[#b3a48c]">Not tonight</span>
            )}
          </dd>
        </div>

        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-[#b3a48c]">Kitchen</dt>
          <dd className="flex items-center gap-1.5 text-right font-medium text-[#f2e8d9]">
            <Clock aria-hidden className="size-3.5 text-[#e2b25f]" />
            {state.isOpen ? 'Cooking' : 'Closed'}
          </dd>
        </div>
      </dl>

      <Link
        href="/order"
        className={cn(buttonClass({ size: 'md' }), 'mt-6 w-full')}
      >
        Start an order
      </Link>

      <p className="mt-4 text-center text-xs text-[#9d8d78]">
        or call{' '}
        <a href="tel:+441628825753" className="underline underline-offset-4 hover:text-[#f7d9a0]">
          01628 825753
        </a>
      </p>
    </aside>
  )
}
