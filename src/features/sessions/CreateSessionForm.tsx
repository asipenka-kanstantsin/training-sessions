import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { NewSessionInput } from './types.ts'
import { validateNewSession } from './validation.ts'
import type { NewSessionErrors, NewSessionValues } from './validation.ts'

type CreateSessionFormProps = {
  onCreate: (input: NewSessionInput) => Promise<void>
  onCancel: () => void
}

type SubmitStatus = 'idle' | 'submitting' | 'error'

const EMPTY_VALUES: NewSessionValues = { title: '', startAt: '' }

export function CreateSessionForm({ onCreate, onCancel }: CreateSessionFormProps) {
  const [values, setValues] = useState<NewSessionValues>(EMPTY_VALUES)
  const [errors, setErrors] = useState<NewSessionErrors>({})
  const [status, setStatus] = useState<SubmitStatus>('idle')
  const titleRef = useRef<HTMLInputElement>(null)
  const startAtRef = useRef<HTMLInputElement>(null)

  const isSubmitting = status === 'submitting'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    const nextErrors = validateNewSession(values, new Date())
    setErrors(nextErrors)
    if (nextErrors.title) {
      titleRef.current?.focus()
      return
    }
    if (nextErrors.startAt) {
      startAtRef.current?.focus()
      return
    }

    setStatus('submitting')
    try {
      await onCreate({
        title: values.title.trim(),
        startAt: new Date(values.startAt).toISOString(),
      })
    } catch {
      setStatus('error')
    }
  }

  return (
    <form className="session-form" noValidate onSubmit={handleSubmit} aria-label="New session">
      <div className="session-form-field">
        <label htmlFor="session-title">Title</label>
        <input
          ref={titleRef}
          id="session-title"
          name="title"
          type="text"
          autoComplete="off"
          value={values.title}
          onChange={(event) => setValues((prev) => ({ ...prev, title: event.target.value }))}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? 'session-title-error' : undefined}
        />
        {errors.title ? (
          <p id="session-title-error" className="session-form-error">
            {errors.title}
          </p>
        ) : null}
      </div>

      <div className="session-form-field">
        <label htmlFor="session-start">Start date and time</label>
        <input
          ref={startAtRef}
          id="session-start"
          name="startAt"
          type="datetime-local"
          value={values.startAt}
          onChange={(event) => setValues((prev) => ({ ...prev, startAt: event.target.value }))}
          aria-invalid={errors.startAt ? true : undefined}
          aria-describedby={errors.startAt ? 'session-start-error' : undefined}
        />
        {errors.startAt ? (
          <p id="session-start-error" className="session-form-error">
            {errors.startAt}
          </p>
        ) : null}
      </div>

      {status === 'error' ? (
        <p role="alert" className="session-form-error">
          Could not create the session. Please try again.
        </p>
      ) : null}

      <div className="session-form-actions">
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create session'}
        </button>
        <button type="button" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
      </div>
    </form>
  )
}
