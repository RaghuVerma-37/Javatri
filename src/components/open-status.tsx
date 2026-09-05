import { Badge } from '@/components/ui'
import { formatInLondon } from '@/lib/hours'
import type { BranchWithHours, ServiceState } from '@/server/branch'

/**
 * "Open until 22:00" or "Closed — opens Friday at 12:00".
 *
 * The old site's ordering page said "Not Accepting Orders" with no explanation and no next step,
 * which reads as "this restaurant is finished". Being closed is normal. Say when you open again.
 */
export function OpenStatus({
  branch,
  state,
  className,
}: {
  branch: BranchWithHours
  state: ServiceState
  className?: string
}) {
  if (state.isOpen && state.closesAt) {
    return (
      <Badge tone="ok" className={className}>
        <Dot className="bg-ok" />
        Open now until {formatInLondon(state.closesAt, 'HH:mm', branch.timezone)}
      </Badge>
    )
  }

  if (!state.nextOpensAt) {
    return (
      <Badge tone="neutral" className={className}>
        Opening hours not published
      </Badge>
    )
  }

  const now = new Date()
  const isToday =
    formatInLondon(state.nextOpensAt, 'yyyy-MM-dd', branch.timezone) ===
    formatInLondon(now, 'yyyy-MM-dd', branch.timezone)

  const when = isToday
    ? `today at ${formatInLondon(state.nextOpensAt, 'HH:mm', branch.timezone)}`
    : formatInLondon(state.nextOpensAt, "EEEE 'at' HH:mm", branch.timezone)

  return (
    <Badge tone="warn" className={className}>
      <Dot className="bg-warn" />
      Closed — opens {when}
    </Badge>
  )
}

function Dot({ className }: { className?: string }) {
  return <span aria-hidden className={`inline-block size-1.5 rounded-full ${className}`} />
}
