interface AlertBadgeProps {
  overdue: number
  upcoming: number
}

export default function AlertBadge({ overdue, upcoming }: AlertBadgeProps) {
  if (overdue === 0 && upcoming === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-900/50 text-green-400 border border-green-700/50">
        <span>&#10003;</span> OK
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      {overdue > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-danger/20 text-danger border border-danger/40">
          &#9888; {overdue} überfällig
        </span>
      )}
      {upcoming > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-accent/20 text-accent border border-accent/40">
          &#9650; {upcoming} bald fällig
        </span>
      )}
    </span>
  )
}
