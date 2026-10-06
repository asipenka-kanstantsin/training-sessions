# TASK-001: Training Sessions Workspace

> English translation of the original Russian role output.

Source: [frontend-accelerator-onboarding/TASK.md](../../frontend-accelerator-onboarding/TASK.md).
Scope is limited to the TASK.md sections `Required User Flow`, `Required Behavior`, `Constraints`. The `Explicitly Optional` section is out of scope.

## Goal

A small workspace where a trainer sees a list of training sessions from a mock API, filters it by status, and creates a new session that immediately appears in the list.

## Users And Outcome

- **User:** trainer (the only role, no authentication or access permissions).
- **Outcome:** the trainer opens the app, sees the sessions, narrows the list by status, and adds a new upcoming session without reloading the page.

## Domain (confirmed by the developer)

- A session has: `title`, `status`, `startAt` (start date and time). An identifier is needed for the list; its format is not prescribed.
- Statuses: `Scheduled`, `Completed`, `Cancelled`.
- A new session is created with status `Scheduled`; the user does not choose the status.

## Acceptance Criteria

### AC-1. Loading the list

- [ ] AC-1.1. When the app opens, a request for the session list is sent through a replaceable request boundary (HTTP client); the data comes from the mock.
- [ ] AC-1.2. While the request is pending, a loading indicator is displayed (text or an element understandable to the user and findable in a test); the list and the error message are not shown at that time.
- [ ] AC-1.3. After a successful response, each session displays its **title**, **status**, and **start date and time** in a readable format using the browser locale.
- [ ] AC-1.4. The list is sorted by start date in ascending order (soonest at the top).

### AC-2. List request error

- [ ] AC-2.1. If the list request fails (network failure or non-2xx response), a single clear error message is shown instead of the list (without technical details such as a stack trace or response code as the main text).
- [ ] AC-2.2. Next to the message there is a retry action (e.g. a `Retry` button); activating it repeats the request, shows the loading state again, and displays the list on success.
- [ ] AC-2.3. The error is reproduced in an automated test by overriding the mock response. A separate in-browser error toggle is **not required** (developer decision).

### AC-3. Status filter

- [ ] AC-3.1. There is a single filter control with the options `All`, `Scheduled`, `Completed`, `Cancelled`; exactly one option is selected at a time.
- [ ] AC-3.2. `All` is selected by default — all loaded sessions are shown.
- [ ] AC-3.3. When a status is selected, only sessions with that status are shown; when switching back to `All`, all sessions are shown again.
- [ ] AC-3.4. If no session matches the selected status, a short empty-result message is shown (rather than an empty area with no explanation).

### AC-4. Creation form

- [ ] AC-4.1. The workspace has an explicit action (e.g. a `New session` button) that opens the creation form.
- [ ] AC-4.2. The form contains a title field and a start date-and-time field, both with visible labels.
- [ ] AC-4.3. **Title validation:** the value after `trim()` must be between 3 and 80 characters long, inclusive. An empty value, a whitespace-only value, or a value shorter than 3 or longer than 80 characters is rejected with a clear message next to the field. The trimmed value is saved.
- [ ] AC-4.4. **Date validation:** the date and time are required and must be strictly later than the current moment at submission time (in the browser time zone). A missing or past value is rejected with a clear message next to the field.
- [ ] AC-4.5. With invalid data, the create request is not sent.
- [ ] AC-4.6. While the create request is in progress, resubmission is not possible (the submit button is disabled and/or repeated submissions are ignored); the user can see that submission is in progress.
- [ ] AC-4.7. If the create request fails, a clear message is shown, the entered values are preserved, and submission can be retried.

### AC-5. Appearance of the created session

- [ ] AC-5.1. After successful creation, the new session appears in the visible list without a page reload, with status `Scheduled`, the entered (trimmed) title, and the selected date/time.
- [ ] AC-5.2. If a status filter was selected at the time of creation, the filter is reset to `All` so the new session is visible (developer decision).
- [ ] AC-5.3. The new session takes its place in the list according to the start-date sorting (AC-1.4).
- [ ] AC-5.4. After successful creation, the form is closed or cleared (at the plan's discretion); creating another session is possible.

### AC-6. Mock boundary

- [ ] AC-6.1. UI components do not import mock data directly; data is obtained only through the HTTP client / request module, which can be switched to a real API without changing the UI.
- [ ] AC-6.2. The mock is implemented with MSW (already in `devDependencies` but not configured) and is used both in browser dev mode and in tests.
- [ ] AC-6.3. The mock supports fetching the list and creating a session; created sessions are kept in memory for the lifetime of the page (persistence across reloads is not required).
- [ ] AC-6.4. No backend service is implemented.

### AC-7. Automated test

- [ ] AC-7.1. There is at least one behavior-level test (Vitest + Testing Library + MSW), passing via `npm test`, that covers the main scenario: successful session creation with it appearing in the list **or** filtering by status.
- [ ] AC-7.2. The test interacts with the UI as a user (roles, labels, text), not through internal component state.

### AC-8. Manual verification

- [ ] AC-8.1. The app is started with the documented command (`npm run dev`), and the scenario list → filter → create has been walked through manually in the browser.
- [ ] AC-8.2. The actually observed result is recorded in `tasks/TASK-001/workflow-log.md` (section `Manual Browser Observation`). Anything unverified is stated explicitly.

## Constraints

- Use the existing stack: React 19, TypeScript, Vite, npm, Vitest + jsdom + Testing Library, MSW, oxlint. Existing scripts: `dev`, `build`, `test`, `lint`.
- Do not rewrite unrelated code or configuration. Replacing the starter template in `src/App.tsx` with the workspace is within the task scope.
- Do not add functionality beyond the required scenario.
- Honestly report incomplete behavior and checks that were not performed.

## Non-Goals

- Session details, drawers, deep links, routing.
- Search, multiple simultaneous filters, multi-select of statuses.
- Pagination.
- Editing, deleting, changing session status; choosing a status at creation.
- A full API contract and scenario matrix.
- An in-browser mock error toggle.
- Data persistence across reloads.
- Screenshot sets, exhaustive responsiveness and accessibility checks.
- Full test coverage, CI, deployment, public URL.
- Migration to strict TypeScript, unrelated refactoring.

## Facts

- The repository is a single frontend application (repository root), Vite + React 19 + TypeScript.
- `src/App.tsx` contains the Vite starter template; there is no domain code.
- MSW `^2.15.0` is installed in `devDependencies` but not initialized: there is no `public/mockServiceWorker.js`, no handlers, and no wiring in `src/main.tsx` or `src/test/setup.ts`.
- The test environment is configured: `vite.config.ts` → `environment: 'jsdom'`, `globals: true`, `setupFiles: ['./src/test/setup.ts']` (`@testing-library/jest-dom/vitest` is included).
- There are no libraries for an HTTP client, routing, state management, forms, or a UI kit.
- There is no `specs/` (living specs) directory.

## Decisions (confirmed by the developer 2026-10-06)

| Question | Decision |
| --- | --- |
| Statuses and filter | 3 statuses (`Scheduled`, `Completed`, `Cancelled`), one control: `All` + one selected status |
| Creation with a non-matching filter | Filter is reset to `All` |
| Reproducing the list error | Only in an automated test, by overriding the MSW handler |
| Sorting | By start date, ascending |

## Assumptions

Adopted based on common practice; the developer may adjust them during requirements review.

- A-1. Mock API paths are provisional, e.g. `GET /api/sessions` and `POST /api/sessions`; they are finalized in the plan.
- A-2. The mock adds a small response delay so the loading state is observable in the browser.
- A-3. The initial mock data set contains sessions of all three statuses so the filter can be checked manually.
- A-4. Date and time input is a native `<input type="datetime-local">` or equivalent; the time is interpreted in the browser time zone and serialized to ISO 8601 when sent to the API.
- A-5. Validation triggers at least on form submission; live validation is not required.
- A-6. Minimal accessibility within normal practice: field labels, error messages associated with fields, interactive elements keyboard-accessible. An exhaustive check is not required.
- A-7. Visual style is minimal; a design system is not required.

## Open Questions

No blocking questions.

Non-blocking decisions owned by the next role (`writing-plans`; optionally `architect` / `api-integration` / `ui-designer`, but they are not required for onboarding):

- Module structure (HTTP client, MSW handlers, components), and how list state is kept after creation (appending to local state or refetching).
- The exact request/response shape of the mock API and the error format.
- Form placement (inline section or modal) and its behavior after success (closing or clearing).

## Readiness

**Ready for planning.** Requirements are bounded by TASK.md; ambiguities are resolved by developer decisions or explicit assumptions. Recommended next step: `writing-plans` (started manually by the developer).
