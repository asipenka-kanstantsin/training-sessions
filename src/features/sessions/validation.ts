export const TITLE_MIN_LENGTH = 3
export const TITLE_MAX_LENGTH = 80

export const VALIDATION_MESSAGES = {
  titleLength: `Title must be ${TITLE_MIN_LENGTH}–${TITLE_MAX_LENGTH} characters.`,
  startRequired: 'Choose a start date and time.',
  startInFuture: 'Start must be in the future.',
} as const

export type NewSessionValues = {
  title: string
  /** Raw `datetime-local` value, interpreted in the browser time zone */
  startAt: string
}

export type NewSessionErrors = {
  title?: string
  startAt?: string
}

export function validateNewSession(
  values: NewSessionValues,
  now: Date,
): NewSessionErrors {
  const errors: NewSessionErrors = {}

  const titleLength = values.title.trim().length
  if (titleLength < TITLE_MIN_LENGTH || titleLength > TITLE_MAX_LENGTH) {
    errors.title = VALIDATION_MESSAGES.titleLength
  }

  if (values.startAt === '') {
    errors.startAt = VALIDATION_MESSAGES.startRequired
    return errors
  }

  const start = new Date(values.startAt)
  if (Number.isNaN(start.getTime())) {
    errors.startAt = VALIDATION_MESSAGES.startRequired
  } else if (start.getTime() <= now.getTime()) {
    errors.startAt = VALIDATION_MESSAGES.startInFuture
  }

  return errors
}
