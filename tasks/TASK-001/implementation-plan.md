# TASK-001: Implementation Plan

> English translation of the original Russian role output.

Requirements source: [requirements.md](requirements.md) (accepted by the developer on 2026-10-06).
Application Root: repository root (the only frontend application).
Scope is limited to AC-1…AC-8. Open questions from `requirements.md` are closed with the options recommended there (see the "Preconditions And Confirmed Decisions" section).

## Current Behavior

- `src/App.tsx` — Vite starter template (hero, counter, links). No domain code.
- `src/App.css` — template styles (`.hero`, `.counter`, `#center`, `#next-steps`, `.ticks`, etc.); `src/index.css` — global CSS variables and base typography.
- `src/main.tsx` synchronously renders `<App />` in `StrictMode`.
- MSW `2.15.0` is installed but not configured: no `public/mockServiceWorker.js`, no handlers, no wiring in the browser or in tests.
- Tests: Vitest 4 + jsdom + Testing Library + user-event, `globals: true`, `src/test/setup.ts` only imports `jest-dom`. The project has no tests.
- TS constraints affecting the code: `verbatimModuleSyntax` (import types via `import type`), `erasableSyntaxOnly` (no `enum`/namespace — use union types), `noUnusedLocals/Parameters`, `allowImportingTsExtensions` (the project imports with the `.tsx` extension).
- Lint: oxlint, rule `react/only-export-components` — do not export non-components from component files.

## Intended Behavior

The application opens a "Training sessions" workspace:

1. Immediately shows a loading state, requests `GET /api/sessions` through the HTTP module, then renders the list (title, status, date/time) sorted by `startAt` ascending.
2. On request failure, shows a single clear message and a `Retry` button that repeats the load.
3. Filter — a single `<select>` with options `All` / `Scheduled` / `Completed` / `Cancelled`; on an empty result — the message "No sessions match this filter." (or equivalent).
4. The `New session` button opens a form (title + start date/time). Validation on submit; on a validation error no request is sent.
5. During `POST /api/sessions` the submit button is disabled and shows "Creating…". On success the session is added to the list, the filter resets to `All`, and the form closes. On error — a message in the form, values are preserved, resubmission is possible.
6. Mock data is served by MSW: in dev mode — a Service Worker in the browser, in tests — `setupServer` from `msw/node`. The UI is unaware of the mock.

## Preconditions And Confirmed Decisions

Confirmed by the developer (requirements.md → Decisions):

| Topic | Decision |
| --- | --- |
| Statuses | `scheduled` / `completed` / `cancelled` (lowercase in the API; `Scheduled` / `Completed` / `Cancelled` in the UI) |
| Filter | A single control: `All` + one status |
| Filter after creation | Resets to `All` |
| List error | Reproduced only in tests (MSW handler override) |
| Sorting | By `startAt` ascending |

Recommended options adopted for the open questions in requirements.md:

| Open question | Adopted decision |
| --- | --- |
| API paths (A-1) | `GET /api/sessions`, `POST /api/sessions` |
| Mock delay (A-2) | MSW `delay()` without arguments: realistic delay in the browser, instant response in Node (tests) |
| Seed data (A-3) | 5–6 sessions covering all three statuses; dates computed relative to `Date.now()` at module load |
| Date input (A-4) | Native `<input type="datetime-local">`; the value is interpreted in the local time zone, sent to the API as ISO 8601 (`toISOString()`) |
| Validation timing (A-5) | On form submit |
| List state after creation | Add the session from the `POST` response to local state (no repeat `GET`) |
| Form placement | Inline section above the list, opened by the `New session` button, closed after success and by the `Cancel` button |
| Filter control | Native `<select>` with `<label>Status</label>` |
| Date format in the list | `Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })` |
| Styles | Minimal, based on the existing `index.css` CSS variables; template styles from `App.css` are replaced |

No new dependencies. Specialists (`architect`, `api-integration`, `ui-designer`) are not needed: the decisions are local and reversible.

## Ordered File Changes

Steps 1–3 are independent of each other; steps 4–6 depend on 1–2; step 7 depends on 3 and 6; step 8 depends on all.

### Step 1. Domain types and validation

**Create `src/features/sessions/types.ts`**
- `SessionStatus = 'scheduled' | 'completed' | 'cancelled'`.
- `Session = { id: string; title: string; status: SessionStatus; startAt: string /* ISO 8601 */ }`.
- `NewSessionInput = { title: string; startAt: string /* ISO 8601 */ }`.
- `SESSION_STATUSES` (ordered list for the filter) and `STATUS_LABELS: Record<SessionStatus, string>`.

**Create `src/features/sessions/validation.ts`** — pure functions without React:
- `validateNewSession(values: { title: string; startAt: string /* datetime-local value */ }, now: Date)` → `{ title?: string; startAt?: string }` (errors object; empty means valid).
- Rules: `title.trim().length` in `[3, 80]`; `startAt` non-empty, parses to a valid date, strictly `> now`.
- Message texts are constants in this module (e.g. `Title must be 3–80 characters.`, `Choose a start date and time.`, `Start must be in the future.`), so tests and UI reference the same strings.
- `now` is passed as a parameter — for deterministic unit tests without fake timers.

### Step 2. HTTP request boundary

**Create `src/features/sessions/sessionsApi.ts`**
- `fetchSessions(signal?: AbortSignal): Promise<Session[]>` — `GET /api/sessions`.
- `createSession(input: NewSessionInput): Promise<Session>` — `POST /api/sessions`, JSON body.
- Non-2xx response or network failure → throws an `Error` (the UI shows its own clear text, not the error text).
- The response is narrowed from `unknown` with a minimal shape check (array / object with fields `id`, `title`, `status` from the allowed values, `startAt`) — no `any` and no unchecked `as`.
- The URL is built as `new URL('/api/sessions', window.location.origin)`: in jsdom, Node's `fetch` does not accept relative URLs, and MSW in Node intercepts absolute ones.
- This is the only point where the mock is swapped for the real API (AC-6.1).

### Step 3. MSW mock

**Create `src/mocks/db.ts`** — in-memory store: seed sessions (all three statuses), `getAll()`, `add(input)` → `Session` with `status: 'scheduled'` and a generated `id` (`crypto.randomUUID()`), `reset()` for test isolation.

**Create `src/mocks/handlers.ts`** — `http.get('/api/sessions')` → `await delay()` → `HttpResponse.json(db.getAll())`; `http.post('/api/sessions')` → `await delay()` → `HttpResponse.json(db.add(body), { status: 201 })`. No validation on the mock side (out of scope).

**Create `src/mocks/browser.ts`** — `setupWorker(...handlers)`.

**Create `src/mocks/node.ts`** — `setupServer(...handlers)`.

**Generate `public/mockServiceWorker.js`** with `npx msw init public` (CLI of the already installed package, no dependency installation; without `--save`, so `package.json` is not changed). The file is committed.

### Step 4. UI components

**Create `src/features/sessions/SessionList.tsx`** — presentational component: receives an already filtered and sorted `Session[]`; renders a `<ul>` with `<li>` items (title, status label, `<time dateTime={startAt}>` with the formatted date). For an empty array — the empty-result message (AC-3.4).

**Create `src/features/sessions/CreateSessionForm.tsx`**
- Props: `onCreate(input: NewSessionInput): Promise<void>`, `onCancel(): void`.
- Local state: field values, validation errors, `status: 'idle' | 'submitting' | 'error'`.
- `<form noValidate>`; fields with `<label>`: `Title`, `Start date and time` (`datetime-local`); errors are next to the field, linked via `aria-describedby`, and the field gets `aria-invalid`.
- Submit: `validateNewSession(values, new Date())` → on errors the request is not sent (AC-4.5). Otherwise `status = 'submitting'`, the button is `disabled` with the text `Creating…`, a repeat submit is ignored via a guard on `status` (AC-4.6). `onCreate` receives `title.trim()` and `new Date(startAt).toISOString()`.
- `onCreate` error → `status = 'error'`, message `Could not create the session. Please try again.` (`role="alert"`), values are preserved (AC-4.7).

**Create `src/features/sessions/SessionsWorkspace.tsx`** — state owner:
- `load: { status: 'loading' } | { status: 'error' } | { status: 'success' }`, `sessions: Session[]`, `filter: 'all' | SessionStatus`, `isFormOpen: boolean`, `reloadKey` (counter for Retry).
- Loading in `useEffect` keyed on `reloadKey` with an `AbortController` in cleanup (correct under `StrictMode`, no races).
- The visible list is a derived value (`filter` → `toSorted` by `startAt`), with no duplicated state.
- Render: heading `Training sessions`; `New session` button; the form when `isFormOpen`; filter `<select>`; then exactly one of: loading (`role="status"`, `Loading sessions…`), error (`role="alert"`, `Could not load sessions.` + `Retry` button), `SessionList`.
- `handleCreate(input)` → `createSession` → functional `setSessions(prev => [...prev, created])`, `setFilter('all')`, `setIsFormOpen(false)`; the error is propagated to the form.
- The filter and the `New session` button remain available during loading/error (they do not interfere with the flow); the list is not shown in that case.

### Step 5. Styles

**Create `src/features/sessions/sessions.css`** (imported from `SessionsWorkspace.tsx`) — minimal layout: container, toolbar row, form fields, error text, list items. Use the existing variables (`--text`, `--border`, `--accent`, etc.). No responsive matrix, no design system.

### Step 6. Application wiring

**Modify `src/App.tsx`** — replace the template with `<SessionsWorkspace />` (hero/logo imports and the counter are removed).

**Modify `src/App.css`** — remove the template styles (or the whole file along with its import), since they belong to the removed markup. Do not touch `src/assets/*` files (unrelated changes are not needed; unused assets do not break the build).

**Modify `src/main.tsx`** — start the mock before rendering in dev mode:
`enableMocking()` → if `import.meta.env.DEV`, dynamically import `./mocks/browser.ts` and `await worker.start({ onUnhandledRequest: 'bypass' })`; then `createRoot(...).render(...)`. The dynamic import keeps MSW out of the production bundle. Use a promise chain, not top-level await.

### Step 7. Test infrastructure

**Modify `src/test/setup.ts`** — add the MSW lifecycle: `beforeAll(server.listen({ onUnhandledRequest: 'error' }))`, `afterEach(() => { server.resetHandlers(); db.reset() })`, `afterAll(server.close())`. Keep the existing `jest-dom` import.

### Step 8. Tests

See "Essential Tests". Files:
- `src/features/sessions/validation.test.ts`
- `src/features/sessions/SessionsWorkspace.test.tsx`

## Contracts And Dependencies

**Mock API (provisional contract, no backend)**

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/api/sessions` | — | `200`, `Session[]` |
| POST | `/api/sessions` | `{ title: string; startAt: string /* ISO */ }` | `201`, `Session` (`status: 'scheduled'`) |
| any | — | — | non-2xx / network failure → `sessionsApi` throws an `Error` |

**Module dependencies (import direction)**

```text
main.tsx ──(dev, dynamic)──> mocks/browser.ts ─> mocks/handlers.ts ─> mocks/db.ts ─> features/sessions/types.ts
App.tsx ─> SessionsWorkspace.tsx ─> sessionsApi.ts ─> types.ts
                                 ─> SessionList.tsx ─> types.ts
                                 ─> CreateSessionForm.tsx ─> validation.ts
test/setup.ts ─> mocks/node.ts, mocks/db.ts
```

UI components import nothing from `src/mocks/` (AC-6.1).

**Contracts between steps**
- `validateNewSession` is the single source of rules and error texts for the form and the tests.
- `CreateSessionForm.onCreate` returns a promise; a reject means a creation error, and the form manages `submitting`/`error` itself.
- `db.reset()` is mandatory in `afterEach`, otherwise sessions created in one test leak into subsequent tests.

## Essential Tests

Coverage is measured by AC, not by percentage: the project has no `@vitest/coverage-*`, and a coverage threshold is not required (non-goal). All tests run via `npm test`.

### `src/features/sessions/validation.test.ts` (unit, pure function, fixed `now`)

| # | Scenario | Covers |
| --- | --- | --- |
| V1 | Title: `''`, `'   '`, `'ab'`, `'  ab  '` → error; `'abc'`, `'  abc  '`, 80 characters → ok; 81 characters → error | AC-4.3 |
| V2 | Start: empty value → error; invalid string → error; `now` and past → error; `now + 1 min` → ok | AC-4.4 |
| V3 | Valid title + start → empty errors object | AC-4.3, AC-4.4 |

### `src/features/sessions/SessionsWorkspace.test.tsx` (behavior-level: `render(<App />)`, user-event, MSW `setupServer`)

Queries by role/label/text (`getByRole('combobox', { name: 'Status' })`, `getByLabelText('Title')`, `findByRole('alert')`). Dates in tests are relative to `Date.now()` (e.g. +1 year), without fake timers (they conflict with MSW).

| # | Scenario | Checks | Covers |
| --- | --- | --- | --- |
| W1 | List loading | `Loading sessions…` is visible immediately; then all seed sessions are visible with title, status label and `<time>`; item order is by ascending `startAt`; the indicator is gone | AC-1.1–AC-1.4, AC-6.1 |
| W2 | Error and Retry | `server.use(http.get(..., () => HttpResponse.error(), { once: true }))` → `role="alert"` with clear text, no list; click `Retry` → loading → list | AC-2.1–AC-2.3 |
| W3 | Filter | `All` by default; selecting `Completed` → only completed sessions; selecting `All` → all again | AC-3.1–AC-3.3 |
| W4 | Successful creation (main scenario) | Select the `Completed` filter → `New session` → enter `'  Morning run  '` and a future date → submit. While the POST is held (the handler awaits a controlled promise via `server.use`), the button is `disabled`, and a repeat click does not create a second request. After the response: filter is `All`, the list contains `Morning run` (trimmed) with status `Scheduled` at its date-ordered position; the form is closed | AC-4.1, AC-4.2, AC-4.6, AC-5.1–AC-5.4, AC-7 |
| W5 | Form validation | Submit with `'ab'` and a past date → both messages next to the fields; POST request counter in the handler = 0; the list is unchanged | AC-4.3–AC-4.5 |

W4 is the minimum required test from TASK.md (AC-7.1); the others protect ACs that would otherwise be checked only manually.

### AC Coverage

| AC | Automated test | Manual |
| --- | --- | --- |
| AC-1 | W1 | yes |
| AC-2 | W2 | no (developer decision) |
| AC-3.1–3.3 | W3 | yes |
| AC-3.4 | W6 (additional) | — |
| AC-4.1–4.6 | V1–V3, W4, W5 | yes |
| AC-4.7 | W7 (additional) | — |
| AC-5 | W4 | yes |
| AC-6.1 | W1 (data flows through MSW + `sessionsApi`) + import review | — |
| AC-6.2 | tests use MSW node | dev mode in the browser |
| AC-6.3, AC-6.4 | W4 (creation via the mock) | yes |
| AC-7 | W4 (+ all others) | — |
| AC-8 | — | manual only, recorded in `workflow-log.md` |

## Additional Risk-Based Tests

Desirable in the same `SessionsWorkspace.test.tsx` file; they do not block acceptance if time is limited:

| # | Scenario | Covers |
| --- | --- | --- |
| W6 | `server.use` returns a list without cancelled sessions → select `Cancelled` → empty-result message | AC-3.4 |
| W7 | `server.use(http.post(..., () => HttpResponse.json(null, { status: 500 })))` → error message in the form, field values preserved, button enabled again | AC-4.7 |

Out of scope (do not add): StrictMode double-load tests, request cancellation, responsiveness, accessibility audit, in-browser e2e.

## Verification Commands

From `package.json` (no dependency installation required):

| Command | Expectation |
| --- | --- |
| `npm test` | All tests V1–V3, W1–W5 (and W6–W7, if added) pass |
| `npm run lint` | oxlint with no errors |
| `npm run build` | `tsc -b` and `vite build` pass (test files are type-checked too, since they are in `src`) |
| `npm run dev` | Manual check of AC-8: URL taken from the Vite output; `[MSW] Mocking enabled` in the browser console; flow list → filter → creation |

One-off command for step 3: `npx msw init public` (worker file generation).

## Risks And Rollback

- **Relative URL in tests.** Node `fetch` in jsdom does not accept `/api/sessions` — so the URL is built via `window.location.origin` (step 2). If the coder chooses another approach, check W1 first.
- **`datetime-local` in jsdom.** `user.type` may behave unreliably for this type; `user.clear` + `user.type` with the `YYYY-MM-DDTHH:mm` format, or `fireEvent.change`, is acceptable. Build the value from local time, not from `toISOString()`.
- **Pending window during creation.** In Node `delay()` resolves instantly — to verify AC-4.6, W4 holds the POST response with a controlled promise rather than a timer.
- **`npm run preview` / production build without the mock.** The worker starts only in dev mode, so in `preview` the list will show the error state. This is acceptable (deploy is a non-goal) and should be documented as a known limitation.
- **Time zone.** Validation and display use the browser's time zone; tests must not depend on a specific TZ (dates are set with a margin, and the "in the future" comparison uses `now` from the same environment).
- **Rollback.** Changes are isolated to `src/features/sessions/`, `src/mocks/`, `public/mockServiceWorker.js` and four edits (`App.tsx`, `App.css`, `main.tsx`, `test/setup.ts`) — reverted with a single revert. No feature flag needed.
