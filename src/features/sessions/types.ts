export type SessionStatus = 'scheduled' | 'completed' | 'cancelled'

export type Session = {
  id: string
  title: string
  status: SessionStatus
  /** ISO 8601 date-time */
  startAt: string
}

export type NewSessionInput = {
  title: string
  /** ISO 8601 date-time */
  startAt: string
}

export const SESSION_STATUSES: readonly SessionStatus[] = [
  'scheduled',
  'completed',
  'cancelled',
]

export const STATUS_LABELS: Record<SessionStatus, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
}
