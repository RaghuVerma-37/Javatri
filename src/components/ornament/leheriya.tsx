import { cn } from '@/lib/cn'

/**
 * Leheriya — the diagonal wave of Rajasthani resist-dyed cloth, where the name comes from
 * *lehar*, a wave.
 *
 * Two sine lines running half a wavelength out of phase, so they braid rather than sit parallel.
 * A `<pattern>` in userSpaceOnUse tiles it horizontally at a fixed wavelength, which is what keeps
 * the crests the same shape on a phone and on a desktop — a stretched viewBox would flatten them
 * out at width.
 */
export function Leheriya({
  className,
  id = 'leheriya',
  height = 14,
}: {
  className?: string
  id?: string
  height?: number
}) {
  const W = 40
  const mid = height / 2
  const amp = height / 2 - 1.5

  // One full wave: up over the first half, down over the second.
  const wave = (offset: number) =>
    `M0,${mid + offset} C${W * 0.25},${mid - amp + offset} ${W * 0.25},${mid - amp + offset} ${W * 0.5},${mid + offset} ` +
    `C${W * 0.75},${mid + amp + offset} ${W * 0.75},${mid + amp + offset} ${W},${mid + offset}`

  return (
    <svg aria-hidden width="100%" height={height} className={cn('block', className)}>
      <defs>
        <pattern id={id} width={W} height={height} patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
            <path d={wave(-2)} />
            <path d={wave(2)} />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height={height} fill={`url(#${id})`} />
    </svg>
  )
}
