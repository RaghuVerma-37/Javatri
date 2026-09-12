import { ArrowRight } from 'lucide-react'
import { OpenStatus } from '@/components/open-status'
import Image from 'next/image'
import { Jali } from '@/components/home/jali'
import { Diya } from '@/components/ornament/diya'
import { buttonClass } from '@/components/ui'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import type { BranchWithHours, ServiceState } from '@/server/branch'

const HEADLINE = [
  ['Indian', 'cooking,'],
  ['on', 'the', 'Bath', 'Road'],
]

export type TonightPanel = {
  /** "19:20", or null when there is nothing bookable in the next few days. */
  earliestPickup: string | null
  earliestPickupDay: string | null
  earliestDelivery: string | null
  earliestDeliveryDay: string | null
}

/**
 * The homepage opening.
 *
 * Quiet on purpose. The page ground is cream, the only green in the hero is the ordering panel
 * and the button, and the headline carries the weight — the brand tone arrives immediately below
 * this, in the full-bleed Pistachio band, where it can be a colour rather than a backdrop.
 *
 * The times are real: `slotOptionsByType` derives them from the published opening hours and the
 * kitchen's lead time, so when the kitchen is shut this offers tomorrow rather than going quiet.
 * That was the old site's actual failure, and it is still the thing this block exists to answer —
 * it just no longer shouts it.
 */
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
    <section className="hero -mt-16 sm:-mt-18">
      <div className="container-page relative grid items-center gap-12 pb-8 pt-20 sm:pb-10 sm:pt-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-14">
        <div>
          <div
            className="fade-up flex flex-wrap items-center gap-x-4 gap-y-3"
            style={{ ['--delay' as string]: '120ms' }}
          >
            {/* Derived, not written down. With a second outlet selected this used to keep
                announcing Littlewick Green underneath Farnham Common's opening hours. */}
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              {[branch.name, branch.addressLine2 ?? branch.city].filter(Boolean).join(' · ')}
            </p>
            <OpenStatus branch={branch} state={state} />
          </div>

          <h1 className="mt-6 max-w-3xl text-[clamp(2.5rem,7.5vw,4.75rem)] leading-[1.02] tracking-[-0.025em] text-ink">
            {HEADLINE.map((line, lineIndex) => (
              <span key={lineIndex} className="reveal-line">
                {line.map((word) => {
                  const delay = 220 + wordIndex++ * 70
                  return (
                    <span key={word}>
                      <span
                        className="reveal-word"
                        style={{ ['--delay' as string]: `${delay}ms` }}
                      >
                        {word}
                      </span>
                      {/* Outside the animated span: a space at the end of an inline-block is
                          trailing whitespace on that box's own line and gets dropped. */}
                      {' '}
                    </span>
                  )
                })}
              </span>
            ))}
          </h1>

          <div
            aria-hidden
            className="rule-draw mt-8 h-px w-full max-w-sm bg-olive/60"
            style={{ ['--delay' as string]: '700ms' }}
          />

          <p
            className="fade-up mt-7 max-w-xl text-base leading-relaxed text-muted sm:text-lg"
            style={{ ['--delay' as string]: '760ms' }}
          >
            Chaat, charcoal and slow-cooked curries in a Berkshire village pub. Collect it, have it
            delivered, book a table — or fill the banqueting hall with a hundred and fifty guests.
          </p>

          <div
            className="fade-up mt-9 flex flex-wrap items-center gap-x-7 gap-y-4"
            style={{ ['--delay' as string]: '900ms' }}
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
              className="inline-flex min-h-11 items-center text-base text-ink underline decoration-line-strong underline-offset-8 transition-colors hover:decoration-ink"
            >
              See the menu
            </Link>
            <Link
              href="/book"
              className="inline-flex min-h-11 items-center text-base text-muted underline decoration-line-strong underline-offset-8 transition-colors hover:text-ink hover:decoration-ink"
            >
              Book a table
            </Link>
          </div>

          <ServiceCard branch={branch} state={state} tonight={tonight} className="mt-10" />
        </div>

        <HeroImage />
      </div>
    </section>
  )
}

/**
 * When you can eat, stated once, at reading size.
 *
 * On Lime Cream rather than the page's cream: it is the one panel in the hero that should read as
 * a separate object, and the pale green is what the palette has for that.
 */
/**
 * One photograph, in an arch.
 *
 * The arch is the shape Mughal architecture puts a doorway in, and it is the same vocabulary the
 * jali behind it comes from — so the cultural note survives the thali being cut, without the page
 * needing six pictures to make it.
 *
 * Two pieces of motion, and only two. The image wipes up from its own base once on load, as if
 * the arch is being filled; then it holds a very slow drift so the block is never quite static.
 * Both stop dead under prefers-reduced-motion.
 */
function HeroImage() {
  return (
    <div className="relative">
      {/*
        The lattice sits behind the arch as a panel of its own, inset from the top and running off
        the right edge — a screen the arch is set against. Clipped to an arch itself, so the two
        shapes rhyme instead of a rectangle of pattern appearing behind a curve.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-6 left-[18%] right-[-12%] hidden overflow-hidden rounded-t-[10rem] rounded-b-[2rem] text-olive/55 sm:block"
      >
        <Jali id="jali-hero" opacity={0.75} className="jali-drift size-full" />
      </div>

      <div
        className="arch-reveal relative mx-auto aspect-[4/5] w-full max-w-[19rem] overflow-hidden rounded-t-[12rem] rounded-b-[2rem] bg-surface-2 shadow-[0_30px_60px_-40px_rgba(28,36,20,0.7)] sm:mx-0 sm:max-w-[23rem] lg:max-w-[26rem]"
        style={{ ['--delay' as string]: '380ms' }}
      >
        <Image
          src="/img/spread.webp"
          alt=""
          aria-hidden
          fill
          priority
          sizes="(min-width: 1024px) 420px, (min-width: 640px) 370px, 80vw"
          className="ken-burns object-cover"
        />
      </div>

    </div>
  )
}

function ServiceCard({
  branch,
  state,
  tonight,
  className,
}: {
  branch: BranchWithHours
  state: ServiceState
  tonight: TonightPanel
  className?: string
}) {
  const canDeliver = branch.acceptsDelivery && Boolean(tonight.earliestDelivery)

  return (
    <aside
      aria-label="When you can eat"
      className={cn(
        'fade-up max-w-md rounded-2xl border border-olive/30 bg-lime p-5 sm:p-6',
        className,
      )}
      style={{ ['--delay' as string]: '1000ms' }}
    >
      <p className="flex items-center gap-2 font-display text-lg text-ink">
        <Diya lit={state.isOpen} className="size-7" />
        {state.isOpen ? 'Open now' : 'Order ahead'}
      </p>

      <dl className="mt-4 grid gap-x-6 sm:grid-cols-2">
        <TimeRow
          label="Collect from"
          time={tonight.earliestPickup}
          note={tonight.earliestPickupDay}
          fallback="Call us"
        />
        <TimeRow
          label="Delivered from"
          time={canDeliver ? tonight.earliestDelivery : null}
          note={canDeliver ? `within ${branch.deliveryRadiusMiles} miles` : null}
          fallback={branch.acceptsDelivery ? 'Not tonight' : 'Collection only'}
        />
      </dl>

      <p className="mt-4 text-sm leading-relaxed text-muted">
        {state.isOpen
          ? 'The kitchen is cooking now.'
          : 'The kitchen is closed — pick a slot and the order still goes through.'}
      </p>

      <p className="mt-4 text-sm text-muted">
        or call{' '}
        <a
          href="tel:+441628825753"
          className="text-accent underline underline-offset-4 hover:text-ink"
        >
          01628 825753
        </a>
      </p>
    </aside>
  )
}

function TimeRow({
  label,
  time,
  note,
  fallback,
}: {
  label: string
  time: string | null
  note: string | null
  fallback: string
}) {
  return (
    /* The note sits under the figure rather than beside it, so the two times line up on the
       right edge instead of being pushed around by how long their notes are. */
    <div className="flex items-baseline justify-between gap-3 border-b border-olive/20 py-2.5 last:border-0 sm:block sm:border-0 sm:py-0">
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</dt>
      <dd className="sm:mt-1">
        {time ? (
          <>
            <span className="time-figure">{time}</span>
            {/* Under the figure on a phone, beside it from sm up: inline on mobile, the two
                times stopped lining up because their notes are different lengths. */}
            {note ? (
              <span className="block text-xs text-muted sm:ml-2 sm:inline">{note}</span>
            ) : null}
          </>
        ) : (
          <span className="text-base font-medium text-ink">{fallback}</span>
        )}
      </dd>
    </div>
  )
}
