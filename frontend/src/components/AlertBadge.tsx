interface AlertBadgeProps {
  overdue: number
  upcoming: number
}

export default function AlertBadge({ overdue, upcoming }: AlertBadgeProps) {
  if (overdue === 0 && upcoming === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-300">
        <span>&#10003;</span> OK
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      {overdue > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-danger/10 text-danger border border-danger/40">
          &#9888; {overdue} überfällig
        </span>
      )}
      {upcoming > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-accent/10 text-amber-700 border border-accent/40">
          &#9650; {upcoming} bald fällig
        </span>
      )}
    </span>
  )
}
