import '@testing-library/jest-dom/vitest'
import { db } from '../mocks/db.ts'
import { server } from '../mocks/node.ts'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

afterEach(() => {
  server.resetHandlers()
  db.reset()
})

afterAll(() => server.close())
