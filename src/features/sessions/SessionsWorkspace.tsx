import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import { CreateSessionForm } from './CreateSessionForm.tsx'
import { SessionList } from './SessionList.tsx'
import { createSession, fetchSessions } from './sessionsApi.ts'
import { SESSION_STATUSES, STATUS_LABELS } from './types.ts'
import type { NewSessionInput, Session, SessionStatus } from './types.ts'
import './sessions.css'

type LoadState = 'loading' | 'error' | 'success'
type StatusFilter = 'all' | SessionStatus

function toStatusFilter(value: string): StatusFilter {
  return SESSION_STATUSES.find((status) => status === value) ?? 'all'
}

function byStartAt(a: Session, b: Session): number {
  return Date.parse(a.startAt) - Date.parse(b.startAt)
}

export function SessionsWorkspace() {
  const [load, setLoad] = useState<LoadState>('loading')
  const [sessions, setSessions] = useState<Session[]>([])
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetchSessions(controller.signal)
      .then((data) => {
        setSessions(data)
        setLoad('success')
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setLoad('error')
      })
    return () => controller.abort()
  }, [reloadKey])

  function handleRetry() {
    setLoad('loading')
    setReloadKey((key) => key + 1)
  }

  function handleFilterChange(event: ChangeEvent<HTMLSelectElement>) {
    setFilter(toStatusFilter(event.target.value))
  }

  async function handleCreate(input: NewSessionInput) {
    const created = await createSession(input)
    setSessions((prev) => [...prev, created])
    setFilter('all')
    setIsFormOpen(false)
  }

  const visibleSessions = sessions
    .filter((session) => filter === 'all' || session.status === filter)
    .toSorted(byStartAt)

  return (
    <main className="sessions-workspace">
      <h1>Training sessions</h1>

      <div className="sessions-toolbar">
        <label className="sessions-filter">
          Status
          <select value={filter} onChange={handleFilterChange}>
            <option value="all">All</option>
            {SESSION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        {isFormOpen || load !== 'success' ? null : (
          <button type="button" onClick={() => setIsFormOpen(true)}>
            New session
          </button>
        )}
      </div>

      {isFormOpen ? (
        <CreateSessionForm onCreate={handleCreate} onCancel={() => setIsFormOpen(false)} />
      ) : null}

      {load === 'loading' ? (
        <p role="status" className="sessions-loading">
          Loading sessions…
        </p>
      ) : null}

      {load === 'error' ? (
        <div role="alert" className="sessions-error">
          <p>Could not load sessions.</p>
          <button type="button" onClick={handleRetry}>
            Retry
          </button>
        </div>
      ) : null}

      {load === 'success' ? <SessionList sessions={visibleSessions} /> : null}
    </main>
  )
}
