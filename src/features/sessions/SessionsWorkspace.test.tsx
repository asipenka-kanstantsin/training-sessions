import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import App from '../../App.tsx'
import { db } from '../../mocks/db.ts'
import { server } from '../../mocks/node.ts'
import type { NewSessionInput, Session } from './types.ts'
import { VALIDATION_MESSAGES } from './validation.ts'

const DAY = 24 * 60 * 60 * 1000

/** Formats a date as a `datetime-local` value in the local time zone. */
function toLocalInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

function sortedTitles(sessions: Session[]): string[] {
  return sessions
    .toSorted((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt))
    .map((session) => session.title)
}

async function findSessionItems() {
  const list = await screen.findByRole('list', { name: 'Sessions' })
  return within(list).getAllByRole('listitem')
}

function countPosts() {
  const counter = { count: 0 }
  server.use(
    http.post('/api/sessions', async ({ request }) => {
      counter.count += 1
      const input = (await request.json()) as NewSessionInput
      return HttpResponse.json(db.add(input), { status: 201 })
    }),
  )
  return counter
}

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  title: string,
  start: Date,
) {
  await user.click(screen.getByRole('button', { name: 'New session' }))
  await user.type(screen.getByLabelText('Title'), title)
  // user.type is unreliable for datetime-local in jsdom; set the full value at once.
  fireEvent.change(screen.getByLabelText('Start date and time'), {
    target: { value: toLocalInputValue(start) },
  })
}

describe('SessionsWorkspace', () => {
  // W1 — AC-1.1–AC-1.4, AC-6.1
  it('shows loading, then sessions sorted by start date', async () => {
    const expected = db.getAll()
    render(<App />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading sessions…')

    const items = await findSessionItems()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(items).toHaveLength(expected.length)

    sortedTitles(expected).forEach((title, index) => {
      expect(items[index]).toHaveTextContent(title)
    })

    for (const session of expected) {
      const item = items.find((element) => element.textContent?.includes(session.title))
      expect(item).toBeDefined()
      const statusLabel = session.status[0].toUpperCase() + session.status.slice(1)
      expect(item).toHaveTextContent(statusLabel)
      expect(item?.querySelector('time')).toHaveAttribute('datetime', session.startAt)
    }
  })

  // W2 — AC-2.1–AC-2.3
  it('shows a recoverable error when loading fails', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    // First request fails; the retry is held until the loading state has been asserted.
    server.use(
      http.get('/api/sessions', () => HttpResponse.error(), { once: true }),
      http.get('/api/sessions', async () => {
        await gate
        return HttpResponse.json(db.getAll())
      }),
    )
    const user = userEvent.setup()
    render(<App />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Could not load sessions.')
    expect(screen.queryByRole('list', { name: 'Sessions' })).not.toBeInTheDocument()

    await user.click(within(alert).getByRole('button', { name: 'Retry' }))
    expect(screen.getByRole('status')).toHaveTextContent('Loading sessions…')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    release()
    expect(await findSessionItems()).toHaveLength(db.getAll().length)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  // W3 — AC-3.1–AC-3.3
  it('filters sessions by one status and returns to all', async () => {
    const user = userEvent.setup()
    render(<App />)
    const total = (await findSessionItems()).length

    const filter = screen.getByRole('combobox', { name: 'Status' })
    expect(filter).toHaveValue('all')
    expect(within(filter).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'All',
      'Scheduled',
      'Completed',
      'Cancelled',
    ])

    await user.selectOptions(filter, 'completed')
    const completed = db.getAll().filter((session) => session.status === 'completed')
    const filtered = await findSessionItems()
    expect(filtered).toHaveLength(completed.length)
    filtered.forEach((item) => expect(item).toHaveTextContent('Completed'))

    await user.selectOptions(filter, 'all')
    expect(await findSessionItems()).toHaveLength(total)
  })

  // W4 — AC-4.1, AC-4.2, AC-4.6, AC-5.1–AC-5.4, AC-7
  it('creates a session, blocks duplicate submit and shows it in the list', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    let postCount = 0
    server.use(
      http.post('/api/sessions', async ({ request }) => {
        postCount += 1
        const input = (await request.json()) as NewSessionInput
        await gate
        return HttpResponse.json(db.add(input), { status: 201 })
      }),
    )

    const user = userEvent.setup()
    render(<App />)
    await findSessionItems()

    const filter = screen.getByRole('combobox', { name: 'Status' })
    await user.selectOptions(filter, 'completed')

    const start = new Date(Date.now() + 3 * DAY)
    await fillForm(user, '  Morning run  ', start)
    await user.click(screen.getByRole('button', { name: 'Create session' }))

    const pending = screen.getByRole('button', { name: 'Creating…' })
    expect(pending).toBeDisabled()
    await waitFor(() => expect(postCount).toBe(1))
    await user.click(pending)
    fireEvent.submit(screen.getByRole('form', { name: 'New session' }))

    release()

    const created = await screen.findByText('Morning run')
    expect(postCount).toBe(1)
    expect(filter).toHaveValue('all')
    expect(screen.queryByRole('form', { name: 'New session' })).not.toBeInTheDocument()

    const item = created.closest('li')
    expect(item).toHaveTextContent('Scheduled')
    expect(item?.querySelector('time')).toHaveAttribute(
      'datetime',
      new Date(toLocalInputValue(start)).toISOString(),
    )

    const items = await findSessionItems()
    expect(items.map((element) => element.querySelector('.sessions-item-title')?.textContent))
      .toEqual(sortedTitles(db.getAll()))
    expect(screen.getByRole('button', { name: 'New session' })).toBeEnabled()
  })

  // W8 — AC-5.1 (review F1): creation is offered only once the list is loaded
  it('offers creation only after the list has loaded', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    server.use(
      http.get('/api/sessions', () => HttpResponse.error(), { once: true }),
      http.get('/api/sessions', async () => {
        await gate
        return HttpResponse.json(db.getAll())
      }),
    )
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading sessions…')
    expect(screen.queryByRole('button', { name: 'New session' })).not.toBeInTheDocument()

    const alert = await screen.findByRole('alert')
    expect(screen.queryByRole('button', { name: 'New session' })).not.toBeInTheDocument()

    await user.click(within(alert).getByRole('button', { name: 'Retry' }))
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'New session' })).not.toBeInTheDocument()

    release()
    await findSessionItems()
    expect(screen.getByRole('button', { name: 'New session' })).toBeEnabled()
  })

  // W9 — AC-2.1 (review F2): an invalid start date is a load error, not a crash
  it.each(['', 'tomorrow', '2026-13-45T10:00:00.000Z'])(
    'shows the load error when the API returns startAt %j',
    async (startAt) => {
      const [first, ...rest] = db.getAll()
      server.use(http.get('/api/sessions', () => HttpResponse.json([{ ...first, startAt }, ...rest])))
      render(<App />)

      expect(await screen.findByRole('alert')).toHaveTextContent('Could not load sessions.')
      expect(screen.queryByRole('list', { name: 'Sessions' })).not.toBeInTheDocument()
    },
  )

  // W5 — AC-4.3–AC-4.5
  it('shows validation messages and does not send invalid data', async () => {
    const posts = countPosts()
    const user = userEvent.setup()
    render(<App />)
    const total = (await findSessionItems()).length

    await fillForm(user, ' ab ', new Date(Date.now() - DAY))
    await user.click(screen.getByRole('button', { name: 'Create session' }))

    expect(screen.getByText(VALIDATION_MESSAGES.titleLength)).toBeInTheDocument()
    expect(screen.getByText(VALIDATION_MESSAGES.startInFuture)).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Start date and time')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Title')).toHaveAccessibleDescription(
      VALIDATION_MESSAGES.titleLength,
    )

    expect(posts.count).toBe(0)
    expect(await findSessionItems()).toHaveLength(total)
  })

  // W6 — AC-3.4
  it('shows an empty message when no session matches the filter', async () => {
    server.use(
      http.get('/api/sessions', () =>
        HttpResponse.json(db.getAll().filter((session) => session.status !== 'cancelled')),
      ),
    )
    const user = userEvent.setup()
    render(<App />)
    await findSessionItems()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'cancelled')

    expect(screen.getByText('No sessions match this filter.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Sessions' })).not.toBeInTheDocument()
  })

  // W7 — AC-4.7
  it('keeps entered values and allows retry when creation fails', async () => {
    server.use(
      http.post('/api/sessions', () => HttpResponse.json(null, { status: 500 }), { once: true }),
    )
    const user = userEvent.setup()
    render(<App />)
    const total = (await findSessionItems()).length

    const start = new Date(Date.now() + 5 * DAY)
    await fillForm(user, 'Evening yoga', start)
    await user.click(screen.getByRole('button', { name: 'Create session' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not create the session. Please try again.',
    )
    expect(screen.getByLabelText('Title')).toHaveValue('Evening yoga')
    expect(screen.getByLabelText('Start date and time')).toHaveValue(toLocalInputValue(start))
    expect(await findSessionItems()).toHaveLength(total)

    const submit = screen.getByRole('button', { name: 'Create session' })
    expect(submit).toBeEnabled()
    await user.click(submit)

    expect(await screen.findByText('Evening yoga')).toBeInTheDocument()
    expect(await findSessionItems()).toHaveLength(total + 1)
  })
})
