import { STATUS_LABELS } from './types.ts'
import type { Session } from './types.ts'

const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

type SessionListProps = {
  sessions: Session[]
}

export function SessionList({ sessions }: SessionListProps) {
  if (sessions.length === 0) {
    return <p className="sessions-empty">No sessions match this filter.</p>
  }

  return (
    <ul className="sessions-list" aria-label="Sessions">
      {sessions.map((session) => (
        <li key={session.id} className="sessions-item">
          <span className="sessions-item-title">{session.title}</span>
          <span className={`sessions-status sessions-status-${session.status}`}>
            {STATUS_LABELS[session.status]}
          </span>
          <time dateTime={session.startAt}>
            {dateTimeFormat.format(new Date(session.startAt))}
          </time>
        </li>
      ))}
    </ul>
  )
}
