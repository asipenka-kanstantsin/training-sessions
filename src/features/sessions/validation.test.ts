import { VALIDATION_MESSAGES, validateNewSession } from './validation.ts'

const NOW = new Date(2030, 0, 15, 12, 0)
const FUTURE = '2030-01-15T12:01'

describe('validateNewSession', () => {
  // V1
  it.each(['', '   ', 'ab', '  ab  ', 'a'.repeat(81)])(
    'rejects title %j',
    (title) => {
      expect(validateNewSession({ title, startAt: FUTURE }, NOW).title).toBe(
        VALIDATION_MESSAGES.titleLength,
      )
    },
  )

  it.each(['abc', '  abc  ', 'a'.repeat(80), ` ${'a'.repeat(80)} `])(
    'accepts title %j',
    (title) => {
      expect(validateNewSession({ title, startAt: FUTURE }, NOW).title).toBeUndefined()
    },
  )

  // V2
  it.each([
    ['empty', '', VALIDATION_MESSAGES.startRequired],
    ['unparseable', 'not-a-date', VALIDATION_MESSAGES.startRequired],
    ['equal to now', '2030-01-15T12:00', VALIDATION_MESSAGES.startInFuture],
    ['in the past', '2030-01-14T09:30', VALIDATION_MESSAGES.startInFuture],
  ])('rejects start that is %s', (_case, startAt, message) => {
    expect(validateNewSession({ title: 'Valid title', startAt }, NOW).startAt).toBe(message)
  })

  it('accepts start one minute after now', () => {
    expect(validateNewSession({ title: 'Valid title', startAt: FUTURE }, NOW).startAt).toBeUndefined()
  })

  // V3
  it('returns no errors for valid values', () => {
    expect(validateNewSession({ title: '  Morning run  ', startAt: FUTURE }, NOW)).toEqual({})
  })
})
