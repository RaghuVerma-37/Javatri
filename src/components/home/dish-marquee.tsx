import { cn } from '@/lib/cn'

/**
 * A band of real dish names sliding past.
 *
 * The list comes from the database, so it can never advertise something the kitchen has taken
 * off. The track holds the list twice and translates by exactly -50%, which is what makes the
 * loop seamless; the duplicate is aria-hidden so it is not read out twice.
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
    <div
      className={cn('marquee border-y border-line bg-surface-2/60 py-4', className)}
      // Hovering pauses it, so a name that catches someone's eye can be read.
      style={{ ['--duration' as string]: `${durationSeconds}s` }}
    >
      <div className="marquee-track">
        <MarqueeRow dishes={dishes} />
        <MarqueeRow dishes={dishes} hidden />
      </div>
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
          <span className="px-5 font-display text-lg text-ink/75 sm:px-7 sm:text-xl">{dish}</span>
          <span aria-hidden className="size-1 rounded-full bg-accent" />
        </li>
      ))}
    </ul>
  )
}
