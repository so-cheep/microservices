/** return this value from an onEvery **RawHandler** to indicate that the message will not be handled, and should silently fail */
export const WILL_NOT_HANDLE = Symbol(
  'Cheep Handler: Will not handle this, silently fail',
)
