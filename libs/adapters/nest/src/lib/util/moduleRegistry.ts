import { ModuleAlreadyRegisteredError } from '../errors/moduleAlreadyRegistered.error'

const registry = new Set<string>()

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
