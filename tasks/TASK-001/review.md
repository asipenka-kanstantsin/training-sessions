# Review of commit `e5a1afa` against the TASK-001 ACs

> English translation of the original Russian role output.

**Verdict: `NEEDS-CHANGES`.** The main flow (list → filter → create) works and is covered by tests; there are no blocking findings. However, one "should fix" finding violates AC-5.1 in a reachable state.

Important: I wrote this code myself in the `coder` role, so this review is not independent. Keep that in mind when weighing it.

Scope checked: `77cecc0..e5a1afa`, 18 files. I read the logic from this commit's source. I ran lint, tests, and the build before committing, on the same state: 0 errors, 22 of 22 tests, build passes.

## Findings

### F1 · Medium (should fix): a created session is not visible if the list is in the error state or still loading
- **Where:** [SessionsWorkspace.tsx:78-87](src/features/sessions/SessionsWorkspace.tsx#L78-L87), [SessionsWorkspace.tsx:51-56](src/features/sessions/SessionsWorkspace.tsx#L51-L56), [SessionsWorkspace.tsx:30-34](src/features/sessions/SessionsWorkspace.tsx#L30-L34), [SessionsWorkspace.tsx:104](src/features/sessions/SessionsWorkspace.tsx#L104)
- **Problem:** the `New session` button and the form are available in any loading state, but the list is rendered only when loading succeeded.
- **Scenario 1 (load error):** `GET` failed, and the screen shows "Could not load sessions.". The user creates a session, `POST` returns 201, the form closes, but the session is nowhere to be seen: [line 104](src/features/sessions/SessionsWorkspace.tsx#L104) does not render the list on error. AC-5.1 requires the session to appear in the visible list, but here the user gets no indication of success at all.
- **Scenario 2 (load not finished):** `GET` is still in flight, and `POST` completes first. [Line 53](src/features/sessions/SessionsWorkspace.tsx#L53) adds the session, then [line 32](src/features/sessions/SessionsWorkspace.tsx#L32) replaces the whole list with the `GET` response. If the server built its response before the creation, the new session disappears.
- **Why it does not reproduce now:** in the browser the mock responds in 100–400 ms, and a load error cannot be triggered in the browser. With a real API both scenarios are real.
- **Tests:** this case is not covered.

### F2 · Low: an invalid date in the API response crashes the whole app
- **Where:** [sessionsApi.ts:22](src/features/sessions/sessionsApi.ts#L22), [SessionList.tsx:27](src/features/sessions/SessionList.tsx#L27), [SessionsWorkspace.tsx:18](src/features/sessions/SessionsWorkspace.tsx#L18)
- **Problem:** `isSession` only checks that `startAt` is a string, not that it is a valid date.
- **Scenario:** the API returns, for example, `startAt: ""` or `"tomorrow"`. Response validation lets such a record through. Then `dateTimeFormat.format(new Date(...))` throws `RangeError: Invalid time value` right during rendering. There is no render error handler (error boundary), so instead of the clear load error from AC-2.1 the user sees a blank page.
- **Secondary:** with an invalid date, sorting in [line 18](src/features/sessions/SessionsWorkspace.tsx#L18) compares `NaN`, and the order becomes unpredictable.
- **Why Low:** the data comes from the mock, which we control. But the whole point of validating the response at the API boundary is to guard against such data (the rule in `rulesets/` about validating external data).

### F3 · Low: the create error message persists after the next submit with validation errors
- **Where:** [CreateSessionForm.tsx:29-38](src/features/sessions/CreateSessionForm.tsx#L29-L38), [CreateSessionForm.tsx:92-96](src/features/sessions/CreateSessionForm.tsx#L92-L96)
- **Scenario:** `POST` returned 500, and the form showed "Could not create the session. Please try again." (AC-4.7). The user changes the title to `ab` and submits again. A validation error appears, but the old server error message also stays: the form's `status` is not reset on the validation early exit. The user sees both messages at once, even though no request was sent this time.

### F4 · Low: if MSW fails to start, the page stays blank
- **Where:** [main.tsx:6-18](src/main.tsx#L6-L18)
- **Scenario:** the app is opened in `dev` mode via a LAN address with `npm run dev -- --host`, i.e. over http not on localhost. Service Workers are unavailable there, `worker.start()` throws, and `render` is never reached. The page stays blank, and the error is visible only in the console. Expected behavior: the app renders and shows a clear load error with retry.
- **Why Low:** affects `dev` mode only. Does not reproduce on `localhost`; manual verification passed.

### F5 · Nit: the empty-result text does not fit the `All` filter
- **Where:** [SessionList.tsx:15](src/features/sessions/SessionList.tsx#L15)
- **Scenario:** the API returned an empty array with the `All` filter. "No sessions match this filter." is shown, even though there is effectively no filter. AC-3.4 concerns a selected status, so this is a wording issue, not an AC violation.

## AC compliance

| AC | Status | Evidence |
| --- | --- | --- |
| AC-1.1–1.4 | ✅ | [SessionsWorkspace.tsx:28-40](src/features/sessions/SessionsWorkspace.tsx#L28-L40), [58-60](src/features/sessions/SessionsWorkspace.tsx#L58-L60), [89-104](src/features/sessions/SessionsWorkspace.tsx#L89-L104); test W1 |
| AC-2.1–2.3 | ✅ | [SessionsWorkspace.tsx:95-102](src/features/sessions/SessionsWorkspace.tsx#L95-L102), [42-45](src/features/sessions/SessionsWorkspace.tsx#L42-L45); test W2. Request cancellation via `AbortController` is correct when the effect runs twice in `StrictMode` |
| AC-3.1–3.3 | ✅ | [SessionsWorkspace.tsx:66-77](src/features/sessions/SessionsWorkspace.tsx#L66-L77); test W3 |
| AC-3.4 | ✅ | [SessionList.tsx:14-16](src/features/sessions/SessionList.tsx#L14-L16); test W6 (wording — F5) |
| AC-4.1–4.2 | ✅ | [CreateSessionForm.tsx:52-90](src/features/sessions/CreateSessionForm.tsx#L52-L90) |
| AC-4.3 | ✅ | [validation.ts:27-30](src/features/sessions/validation.ts#L27-L30): check after `trim`, bounds 3 and 80 inclusive; the trimmed value is saved ([CreateSessionForm.tsx:43](src/features/sessions/CreateSessionForm.tsx#L43)); tests V1 and W5 |
| AC-4.4 | ✅ | [validation.ts:32-42](src/features/sessions/validation.ts#L32-L42): strictly "later than now"; a `datetime-local` value without an offset is parsed as local time, which is correct; tests V2 and W5 |
| AC-4.5 | ✅ | [CreateSessionForm.tsx:31-38](src/features/sessions/CreateSessionForm.tsx#L31-L38); test W5 (`POST` counter is 0) |
| AC-4.6 | ✅ | [CreateSessionForm.tsx:27](src/features/sessions/CreateSessionForm.tsx#L27) and [99-101](src/features/sessions/CreateSessionForm.tsx#L99-L101); test W4 (disabled button and repeated form submit, exactly one `POST`) |
| AC-4.7 | ✅ (F3) | [CreateSessionForm.tsx:46-48](src/features/sessions/CreateSessionForm.tsx#L46-L48); test W7 |
| AC-5.1–5.4 | ⚠️ F1 | Works when the list loaded successfully ([SessionsWorkspace.tsx:51-56](src/features/sessions/SessionsWorkspace.tsx#L51-L56)), test W4. Does not work on error or unfinished loading |
| AC-6.1–6.4 | ✅ | The UI imports nothing from `src/mocks/`; MSW is wired in `dev` ([main.tsx:6-10](src/main.tsx#L6-L10)) and in tests ([setup.ts](src/test/setup.ts)); the store is reset in `afterEach` |
| AC-7 | ✅ | W4 plus 21 more tests; tests work through roles and labels, not internal state |
| AC-8 | ✅ | The observation was recorded by the developer in `workflow-log.md` |

## Logic checked and found correct

- **Load cancellation:** no error is shown for a cancelled request. Retry is only possible from the error state, so there are no concurrent loads.
- **Double-submit protection:** a click is an event React processes immediately. By the next event, the `isSubmitting` check already sees the new value, the button is disabled, and with a disabled button Enter does not submit the form.
- **The visible list** is derived from the data and the filter, with no duplicated state. `toSorted` does not mutate the source array.
- **Validation tests** do not depend on the time zone: both `NOW` and the date strings are set in local time.

## Gaps that are not defects

- No test for F1: creating a session while the list is in the error or loading state.
- No test for an invalid API response (F2).
- W1 does not check that the list and the error message are hidden during loading (AC-1.2). Per the code this holds: [lines 89-104](src/features/sessions/SessionsWorkspace.tsx#L89-L104) show exactly one of the three states.
- Dark theme, the contrast of the error color `#c62828`, and the form at 390px width were not checked.

## Recommendation

F1 should be fixed by the `debugger` or `coder` role with one small change: show creation only after a successful load, or otherwise guarantee AC-5.1, and add a test for this case. F2–F5 can be fixed in the same change or recorded in `workflow-log.md` as known limitations with your decision.

I did not save the report to a file. Per the onboarding README it must be saved unchanged to `tasks/TASK-001/review.md`; I can do this on your command. I did not launch the next role.
