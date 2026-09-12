import { Paisley } from '@/components/ornament/paisley'
import { cn } from '@/lib/cn'

/**
 * A rule with a paisley set into the middle of it, the way a printed border breaks for a motif.
 *
 * This is the one ornament that appears between sections, so it is the one doing the most work to
 * make the page feel of a place — which is exactly why it is a hairline and a 22px mark rather
 * than anything louder. Two mirrored paisleys, facing each other across the motif, is the
 * arrangement you find on a border print.
 */
export function SectionDivider({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('flex items-center gap-3.5 text-olive/70', className)}>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-current" />
      <Paisley className="-scale-x-100" size={26} />
      <span className="size-1.5 rounded-full bg-current" />
      <Paisley size={26} />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-current" />
    </div>
  )
}
