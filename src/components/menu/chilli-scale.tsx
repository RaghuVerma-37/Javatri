import { cn } from '@/lib/cn'

const HEAT: Record<string, number> = { MILD: 1, HOT: 2, EXTRA_HOT: 3 }

export const HEAT_LABEL: Record<string, string> = {
  MILD: 'Mild',
  HOT: 'Hot',
  EXTRA_HOT: 'Extra hot',
}

/**
 * Heat as chillies out of three, with the word beside them.
 *
 * The unlit chillies are the point: one red chilli alone says "spicy", one red of three says
 * "mild". The word stays because a British reader should not have to learn a scale to order.
 */
export function ChilliScale({ level, className }: { level: string; className?: string }) {
  const heat = HEAT[level]
  if (!heat) return null

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium text-ink/80', className)}>
      <Chillies heat={heat} />
      {HEAT_LABEL[level]}
    </span>
  )
}

export function Chillies({
  heat,
  of = 3,
  className,
}: {
  heat: number
  /** How many chillies the scale has. The filter shows only the lit ones. */
  of?: number
  className?: string
}) {
  return (
    <span aria-hidden className={cn('inline-flex items-center', className)}>
      {Array.from({ length: of }, (_, index) => (
        <Chilli key={index} lit={index < heat} className={index > 0 ? '-ml-1' : undefined} />
      ))}
    </span>
  )
}

/** One chilli, tip down to the left, stem up to the right — red with an Olive Mist stem when lit. */
function Chilli({ lit, className }: { lit: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-3.5 shrink-0', className)}
    >
      <path
        d="M12.3 5.2c1.3 1.2 1.2 3.6-.3 5.7-1.9 2.6-5.4 4.1-9.3 3.9-.5 0-.6-.6-.2-.8 3-1.3 5.4-3.5 6.5-6.4.5-1.3 1.6-2.9 3.3-2.4Z"
        className={lit ? 'fill-chilli' : 'stroke-line-strong'}
        strokeWidth={lit ? 0 : 1.1}
      />
      <path
        d="M9.4 5.7c.7-1.1 2.2-1.5 3.4-.6M12.1 5c0-1.4.6-2.6 1.8-3.2"
        className={lit ? 'stroke-olive' : 'stroke-line-strong'}
        strokeWidth="1.4"
      />
    </svg>
  )
}
