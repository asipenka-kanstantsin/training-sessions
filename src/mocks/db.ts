import type { NewSessionInput, Session } from '../features/sessions/types.ts'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

function fromNow(offset: number): string {
  return new Date(Date.now() + offset).toISOString()
}

function createSeed(): Session[] {
  return [
    { id: 'seed-1', title: 'Strength basics', status: 'completed', startAt: fromNow(-7 * DAY) },
    { id: 'seed-2', title: 'Interval running', status: 'cancelled', startAt: fromNow(-2 * DAY) },
    { id: 'seed-3', title: 'Mobility flow', status: 'completed', startAt: fromNow(-1 * DAY) },
    { id: 'seed-4', title: 'Core stability', status: 'scheduled', startAt: fromNow(2 * DAY) },
    { id: 'seed-5', title: 'Endurance ride', status: 'cancelled', startAt: fromNow(4 * DAY) },
    { id: 'seed-6', title: 'Team conditioning', status: 'scheduled', startAt: fromNow(9 * DAY) },
  ]
}

let sessions = createSeed()

export const db = {
  getAll(): Session[] {
    return sessions.map((session) => ({ ...session }))
  },
  add(input: NewSessionInput): Session {
    const session: Session = {
      id: crypto.randomUUID(),
      title: input.title,
      status: 'scheduled',
      startAt: input.startAt,
    }
    sessions = [...sessions, session]
    return { ...session }
  },
  reset(): void {
    sessions = createSeed()
  },
}
