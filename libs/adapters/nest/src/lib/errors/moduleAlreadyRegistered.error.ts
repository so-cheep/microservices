export class ModuleAlreadyRegisteredError extends Error {
  public readonly code = 'MODULE_ALREADY_REGISTERED'
  constructor(public readonly moduleName: string) {
    super(
      `Module [${moduleName}] has registered multiple times.` +
        `Be sure not to call CheepMicroservicesModule.forModule() multiple times with the same module name!`,
    )
  }
}
