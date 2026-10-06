import { SESSION_STATUSES } from './types.ts'
import type { NewSessionInput, Session, SessionStatus } from './types.ts'

const SESSIONS_PATH = '/api/sessions'

// Absolute URL: Node's fetch (used under jsdom in tests) rejects relative URLs.
function sessionsUrl(): URL {
  return new URL(SESSIONS_PATH, window.location.origin)
}

function isSessionStatus(value: unknown): value is SessionStatus {
  return SESSION_STATUSES.some((status) => status === value)
}

// ISO 8601 date-time with an explicit offset, e.g. `2026-10-06T12:00:00.000Z`.
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/

function isIsoDateTime(value: unknown): value is string {
  return (
    typeof value === 'string' && ISO_DATE_TIME.test(value) && !Number.isNaN(Date.parse(value))
  )
}

function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string' &&
    typeof record.title === 'string' &&
    isSessionStatus(record.status) &&
    isIsoDateTime(record.startAt)
  )
}

async function readJson(response: Response): Promise<unknown> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }
  return response.json()
}

export async function fetchSessions(signal?: AbortSignal): Promise<Session[]> {
  const data = await readJson(await fetch(sessionsUrl(), { signal }))
  if (!Array.isArray(data) || !data.every(isSession)) {
    throw new Error('Unexpected sessions response')
  }
  return data
}

export async function createSession(input: NewSessionInput): Promise<Session> {
  const response = await fetch(sessionsUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await readJson(response)
  if (!isSession(data)) {
    throw new Error('Unexpected create session response')
  }
  return data
}
