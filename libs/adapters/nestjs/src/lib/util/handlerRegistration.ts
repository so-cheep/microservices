const handlerModules = new Set()

const callbacks = new Set<() => void>()

export function addModuleRegistrationRequired(moduleId) {
  handlerModules.add(moduleId)
}

export function completeModuleRegistration(moduleId) {
  handlerModules.delete(moduleId)
  if (handlerModules.size === 0) {
    callbacks.forEach(cb => cb())
  }
}

export function onHandlerRegistrationComplete(cb) {
  callbacks.add(cb)
}
