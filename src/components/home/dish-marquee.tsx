import { TempleBorder } from '@/components/ornament/temple-border'
import { Wave } from '@/components/home/wave'
import { cn } from '@/lib/cn'

/**
 * A band of real dish names sliding past.
 *
 * The list comes from the database, so it can never advertise something the kitchen has taken
 * off. The track holds the list twice and translates by exactly -50%, which is what makes the
 * loop seamless; the duplicate is aria-hidden so it is not read out twice.
 *
 * Names only, no pictures. The photography on this page is stock — it shows the kind of food the
 * kitchen cooks — and setting a stock photograph beside a specific dish name would turn that into
 * a claim about what that dish looks like. The dish images live on the menu, next to the dish.
 */
export function DishMarquee({
  dishes,
  className,
  durationSeconds = 60,
}: {
  dishes: string[]
  className?: string
  durationSeconds?: number
}) {
  if (dishes.length === 0) return null

  return (
    /*
      The Pistachio band. This is where the brand tone lives on the homepage — one full-bleed
      strip of it, rather than a tint underneath the whole site. Only `ink` carries text on it:
      `muted` is 2.9:1 against this green.

      Two elements, not one: the band owns the colour and the inner element owns the mask. With
      both on the same box the mask faded the green out at each end, so the band read as torn
      rather than full bleed.
    */
    <div className={cn('relative text-pistachio', className)}>
      {/* -mb-px / -mt-px: without it a hairline of page shows through where the curve meets the
          band, because the two are separate elements rounded to different device pixels. */}
      <Wave className="-mb-px" />
      <div className="bg-pistachio py-2 sm:py-3">
        <div aria-hidden className="text-ink/20">
          <TempleBorder id="temple-band" />
        </div>
      <div
        className="marquee"
        // Hovering pauses it, so a dish that catches someone's eye can be read.
        style={{ ['--duration' as string]: `${durationSeconds}s` }}
      >
        <div className="marquee-track">
          <MarqueeRow dishes={dishes} />
          <MarqueeRow dishes={dishes} hidden />
        </div>
      </div>
        <div aria-hidden className="text-ink/20">
          <TempleBorder id="temple-band-b" flip />
        </div>
      </div>
      <Wave flip className="-mt-px" />
    </div>
  )
}

/**
 * Declared at module scope rather than inside DishMarquee. A component defined during render is a
 * new component type on every render, so React unmounts and remounts the whole subtree — which
 * here would restart the animation on every parent render.
 */
function MarqueeRow({ dishes, hidden }: { dishes: string[]; hidden?: boolean }) {
  return (
    <ul aria-hidden={hidden} className="flex shrink-0 items-center">
      {dishes.map((dish) => (
        <li key={dish} className="flex items-center whitespace-nowrap">
          <span className="px-5 font-display text-lg text-ink sm:px-7 sm:text-xl">{dish}</span>
          <span aria-hidden className="size-1 rounded-full bg-ink/45" />
        </li>
      ))}
    </ul>
  )
}
