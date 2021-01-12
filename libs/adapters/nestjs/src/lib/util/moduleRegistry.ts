import { ModuleAlreadyRegisteredError } from '../errors/moduleAlreadyRegistered.error'

const registry = new Set<string>()
const handlerCompleteRegistry = new Set<string>()

const callbacks = new Set<() => unknown>()

/**
 * Called by forModule dynamic module import to check for module name uniqueness.
 * This uniqueness only extends to one memory space (not over transports)
 */
export function registerModuleName(moduleName: string) {
  if (registry.has(moduleName)) {
    throw new ModuleAlreadyRegisteredError(moduleName)
  }

  registry.add(moduleName)
}

/** called by onModuleInit for each CheepModule to notify that handlers are complete */
export function completeModuleHandlerRegistration(
  moduleName: string,
) {
  handlerCompleteRegistry.add(moduleName)

  if (checkHandlerRegistrations()) {
    callbacks.forEach(cb => cb())
  }
}

/** register a callback for when all registrations have completed */
export function onHandlerRegistrationComplete(action: () => unknown) {
  if (checkHandlerRegistrations()) {
    action()
  }
  callbacks.add(action)
}

function checkHandlerRegistrations() {
  return (
    registry.size > 0 &&
    [...registry].every(x => handlerCompleteRegistry.has(x))
  )
}
