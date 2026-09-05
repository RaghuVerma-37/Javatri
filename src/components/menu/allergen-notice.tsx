import { TriangleAlert } from 'lucide-react'
import { ALLERGEN_NOTICE } from '@/lib/allergens'
import { cn } from '@/lib/cn'

/**
 * The FSA notice. Required on the menu and again at checkout for distance selling.
 *
 * Written as a real warning rather than legal wallpaper: a customer with an allergy has to be
 * able to act on it, which means the phone number is part of the notice, not buried in a footer.
 */
export function AllergenNotice({
  className,
  id,
  phone = '01628 825753',
}: {
  className?: string
  id?: string
  phone?: string
}) {
  return (
    <aside
      id={id}
      aria-labelledby={id ? `${id}-heading` : undefined}
      className={cn('flex gap-3 rounded-2xl border border-warn/30 bg-warn-wash p-4 sm:p-5', className)}
    >
      <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-warn" />
      <div className="text-sm leading-relaxed">
        <h2
          id={id ? `${id}-heading` : undefined}
          className="font-display text-base font-semibold text-ink"
        >
          Allergies and intolerances
        </h2>
        <p className="mt-1.5 text-ink/85">{ALLERGEN_NOTICE}</p>
        <p className="mt-2 text-ink/85">
          Call us on{' '}
          <a
            href={`tel:${phone.replace(/\s/g, '')}`}
            className="font-medium underline underline-offset-2"
          >
            {phone}
          </a>{' '}
          before ordering and we will talk you through any dish.
        </p>
      </div>
    </aside>
  )
}
