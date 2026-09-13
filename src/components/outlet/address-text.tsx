/**
 * An address on one run of text that wraps only between its parts, so a narrow card breaks it
 * after "Bath Road," rather than between "SL6" and "3RX".
 *
 * Each part carries its own comma and cannot break inside; the space that follows sits outside
 * the part, which is what leaves the line a place to wrap.
 */
export function AddressText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(', ')

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const last = index === parts.length - 1
        return (
          <span key={index}>
            <span className="whitespace-nowrap">
              {part}
              {last ? '' : ','}
            </span>
            {last ? null : ' '}
          </span>
        )
      })}
    </span>
  )
}
