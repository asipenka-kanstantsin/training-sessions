# TASK-001: Browser Verify

> English translation of the original Russian role output.

Date: 2026-10-06 · Role: `browser-verify` · Branch: `task-001` (HEAD `373ba07`) · Reference: [requirements.md](requirements.md)

## Final verdict: **PASS**

The main flow **list → filter → create** works on desktop (1440×900), at mobile width (375×812), and at narrow width (320×640). Validation fires for a whitespace-only title and for a title longer than 80 characters, and no create request is sent in those cases. There are no console errors or warnings, and all `/api/sessions` requests completed with a 2xx status.

Load error and Retry (AC-2) were **not verified**: there is no error toggle in the browser (AC-2.3, a developer decision). Details are in the "Not verifiable" section.

## Environment

| Parameter | Value |
| --- | --- |
| URL | `http://localhost:5180/` |
| Server | `node node_modules/vite/bin/vite.js --port 5180 --strictPort` (the same `vite` as in `npm run dev`; the port is set only via a CLI flag, configuration was not changed), Vite v8.3.3, PID 30468 |
| Why not 5173 | Port 5173 is already occupied by another dev server of this repository (PID 28820, started before this verification). I did not touch or stop it |
| Shutdown | PID 30468 was stopped after verification, port 5180 was freed (checked via `netstat`) |
| Browser | `toolchain/bin/agent-browser.mjs` (agent-browser@0.32.3), session `task001-bv`, closed after verification |
| Doctor | `toolchain/bin/doctor.mjs --json` → `DEGRADED`: `capability:browser` = PASS. The only degradation is `hooks:codex`, which is unrelated to this verification |
| Mock | MSW enabled (`[MSW] Mocking enabled`), data from `src/mocks/db.ts` |

## Screen widths

| Profile | Viewport | What was checked |
| --- | --- | --- |
| Desktop | 1440×900 | Full flow, validation, double submit, keyboard |
| Mobile | 375×812 | List, filter, form errors, creation with an 80-character title, overflow |
| Narrow | 320×640 | Form layout, whitespace-only title, 81 characters, overflow |

## Main flow (desktop 1440×900)

| Step | Observation | AC | Result |
| --- | --- | --- | --- |
| 1. Open or reload | Right after `reload`, `Loading sessions…` is visible. No list, no error, and no `New session` button | 1.1, 1.2 | PASS |
| 2. List loaded | 6 sessions, each with title, status, and a localized date (`Sep 29, 2026, 2:46 PM`). Sorted by ascending date: Sep 29 → Oct 4 → Oct 5 → Oct 8 → Oct 10 → Oct 15 | 1.3, 1.4 | PASS |
| 3. Filter | A single `combobox "Status"`: All / Scheduled / Completed / Cancelled, default `All`. Scheduled → 2 sessions (Core stability, Team conditioning). Completed → 2. Cancelled → 2. All → 6 again | 3.1–3.3 | PASS |
| 4. `New session` (filter = Scheduled) | The `New session` form opened with visible labels `Title` and `Start date and time` | 4.1, 4.2 | PASS |
| 5. Empty submit | `Title must be 3–80 characters.` and `Choose a start date and time.` next to the fields. `aria-invalid` and `aria-describedby` are linked to the fields, focus on `#session-title`. No POST sent | 4.3–4.5 | PASS |
| 6. Past date `2026-10-01T09:00` | `Start must be in the future.`, focus on `#session-start`, no POST sent | 4.4, 4.5 | PASS |
| 7. Valid submit: `"  Morning sprint drills  "`, `2026-10-07T09:30` | After 30 ms the button shows `Creating…`, `disabled=true`, Cancel is also disabled. A repeated `click()` during submission produced exactly **one** `POST /api/sessions` → 201 | 4.6 | PASS |
| 8. Result | The form closed, filter reset to `all`. Session `Morning sprint drills | Scheduled | Oct 7, 2026, 9:30 AM` sits between Oct 5 and Oct 8. Request body `{"title":"Morning sprint drills","startAt":"2026-10-07T07:30:00.000Z"}`, title trimmed. The `New session` button is available again | 5.1–5.4, 4.3 | PASS |

## Additional checks

| Check | Viewport | Observation | Result |
| --- | --- | --- | --- |
| Whitespace-only title (6 spaces) | 1440 | `Title must be 3–80 characters.`, focus on Title, no POST | PASS |
| Whitespace-only title (8 spaces) | 320 | Same message, focus on Title, no POST | PASS |
| 81-character title (`A`×81) | 1440 | `Title must be 3–80 characters.`, no POST | PASS |
| 81-character title (`C`×81) | 320 | Same message, no POST, the field does not overflow the edge | PASS |
| `"  ab  "` (2 characters after trim) | 1440 | Rejected with the same message | PASS |
| Boundary: 80 characters (`B`×80) | 375 | Accepted, POST 201. Filter `Cancelled` reset to `all`. The long title without spaces wraps inside the card, no horizontal scrolling | PASS |
| Form at narrow width | 320 | `scrollWidth = 320`, no `main` element extends beyond the viewport. Fields 34–286 px, `Create session` and `Cancel` buttons on one row, height ≥ 37 px | PASS |
| Mobile list and filter | 375 | `scrollWidth = 375`, no overflow. Cancelled → 2 sessions | PASS |
| Keyboard | 1440 | Tab: Status → New session. Enter on `New session` opens the form. Tab: Title → date field (segments). Focus has a visible outline (`solid 2px`) | PASS |

## Console

- `errors`: empty.
- `console`: no `warn` or `error` levels. Only `debug`/`info`/`log` from Vite (`connecting… / connected`), the React DevTools hint, and MSW logs (`Mocking enabled`, `GET /api/sessions 200 OK`, `POST /api/sessions 201 Created`).

## Network requests (API)

| Request | Status | Note |
| --- | --- | --- |
| `GET http://localhost:5180/api/sessions` (on every load) | 200 | Usually two GETs in a row: in dev mode StrictMode runs the effect twice. The first GET is aborted by `AbortController`, so in one case it was recorded without a status. This is expected in dev and is not an error |
| `POST http://localhost:5180/api/sessions` (desktop) | 201 | One request, even though the click was doubled |
| `POST http://localhost:5180/api/sessions` (mobile, 80 characters) | 201 | — |
| Submissions with invalid data | — | No requests (`network requests --filter api` → "No requests captured") |
| Document, Vite scripts, `favicon.svg` | 200 | No 4xx or 5xx responses |

No unexpected navigations to other pages: the URL stayed `http://localhost:5180/` the whole time.

## Not verifiable

- **AC-2.1–2.2: list load error and Retry.** Not verified: there is no mock error toggle in the browser (AC-2.3, Non-Goals). The code for the error state and the Retry button exists in `SessionsWorkspace.tsx`, but I did not see it in the browser.
- **AC-4.7: create error.** Not verified for the same reason: the mock always responds with 201.
- **AC-3.4: empty filter result.** Unreachable in the browser: the mock data contains sessions of all three statuses, and changing the data is prohibited. The text `No sessions match this filter.` exists in `SessionList.tsx`, but I did not see it in the browser.
- **AC-6.3: in-memory storage.** Confirmed indirectly: after a reload at mobile width, the previously created session `Morning sprint drills` disappeared. This is expected; persistence across reloads is not required.

## Notes (do not affect the verdict)

- After opening the form via keyboard (Enter on `New session`), focus stays on `body` instead of moving to the Title field. The requirements do not specify this.
- Escape does not close the form. The requirements do not specify this.
- At width 375 the status badge stretches across the full width of the card. This is cosmetic and does not affect readability.

## Screenshots

| File | Viewport | Content |
| --- | --- | --- |
| [bv-desktop-1440-list.png](browser-artefacts/bv-desktop-1440-list.png) | 1440×900 | Loaded list, filter All |
| [bv-desktop-1440-filter-scheduled.png](browser-artefacts/bv-desktop-1440-filter-scheduled.png) | 1440×900 | Filter Scheduled |
| [bv-desktop-1440-form-empty-errors.png](browser-artefacts/bv-desktop-1440-form-empty-errors.png) | 1440×900 | Empty form errors |
| [bv-desktop-1440-title-spaces.png](browser-artefacts/bv-desktop-1440-title-spaces.png) | 1440×900 | Whitespace-only title rejected |
| [bv-desktop-1440-title-81.png](browser-artefacts/bv-desktop-1440-title-81.png) | 1440×900 | 81-character title rejected |
| [bv-desktop-1440-created.png](browser-artefacts/bv-desktop-1440-created.png) | 1440×900 | Created session in the list, filter reset to All |
| [bv-mobile-375-list.png](browser-artefacts/bv-mobile-375-list.png) | 375×812 | Mobile list (full page) |
| [bv-mobile-375-filter-cancelled.png](browser-artefacts/bv-mobile-375-filter-cancelled.png) | 375×812 | Filter Cancelled |
| [bv-mobile-375-form-errors.png](browser-artefacts/bv-mobile-375-form-errors.png) | 375×812 | Form errors at mobile width |
| [bv-mobile-375-created-80chars.png](browser-artefacts/bv-mobile-375-created-80chars.png) | 375×812 | Session created with an 80-character title, line wrapping |
| [bv-narrow-320-form.png](browser-artefacts/bv-narrow-320-form.png) | 320×640 | Form at narrow width |
| [bv-narrow-320-title-spaces.png](browser-artefacts/bv-narrow-320-title-spaces.png) | 320×640 | Whitespace-only title rejected |
| [bv-narrow-320-title-81.png](browser-artefacts/bv-narrow-320-title-81.png) | 320×640 | 81-character title rejected |

## Repository changes

I did not change code, tests, configuration, or data. Only this report and 13 `bv-*.png` screenshots in `tasks/TASK-001/` were added.
