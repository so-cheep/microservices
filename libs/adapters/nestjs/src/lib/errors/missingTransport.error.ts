export class MissingTransportError extends Error {
  public readonly code = 'MISSING_TRANSPORT'
  constructor() {
    super(
      `CheepMicroservice transport is not provided, did you import CheepMicroservicesModule.forRoot() with the necessary options?`,
    )
  }
}
