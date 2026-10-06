import { delay, http, HttpResponse } from 'msw'
import type { NewSessionInput } from '../features/sessions/types.ts'
import { db } from './db.ts'

export const handlers = [
  http.get('/api/sessions', async () => {
    await delay()
    return HttpResponse.json(db.getAll())
  }),
  http.post('/api/sessions', async ({ request }) => {
    const input = (await request.json()) as NewSessionInput
    await delay()
    return HttpResponse.json(db.add(input), { status: 201 })
  }),
]
