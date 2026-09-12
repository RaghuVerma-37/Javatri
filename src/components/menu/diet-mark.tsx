import { cn } from '@/lib/cn'
import type { Diet } from '@/lib/diet'

export const DIET_LABEL: Record<Diet, string> = {
  veg: 'Vegetarian',
  'non-veg': 'Contains meat, fish or egg',
}

/**
 * The square mark from Indian food packaging and menus. A dot for vegetarian, a triangle for
 * non-veg — the triangle is the current form of the mark, and it means the two differ in shape as
 * well as colour, so the mark still works for somebody who cannot tell the green from the brown.
 *
 * Sized in `em`, one em square, so it scales with whatever sets its font size. Beside a dish name
 * it is set to the cap height and sits on the baseline, like a capital letter.
 *
 * An inline-block whose contents are all absolutely positioned has no line of its own, so its
 * baseline is its bottom edge. That is what puts the bottom of the square exactly on the text's
 * baseline. An inline-flex box would have used its centred child instead, and hung below it.
 */
export function DietMark({ diet, className }: { diet: Diet; className?: string }) {
  const label = DIET_LABEL[diet]

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        'relative inline-block size-[1em] shrink-0 rounded-[0.2em] border-[1.5px] bg-surface align-baseline',
        diet === 'veg' ? 'border-veg text-veg' : 'border-nonveg text-nonveg',
        className,
      )}
    >
      {diet === 'veg' ? (
        <span className="absolute inset-0 m-auto size-[0.46em] rounded-full bg-current" />
      ) : (
        <svg aria-hidden viewBox="0 0 10 9" className="absolute inset-0 m-auto size-[0.52em]">
          <path d="M5 .4 9.6 8.6H.4Z" fill="currentColor" />
        </svg>
      )}
    </span>
  )
}
