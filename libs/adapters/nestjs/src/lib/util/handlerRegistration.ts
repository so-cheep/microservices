const handlerModules = new Set()

const callbacks = new Set<() => Promise<void>>()

export function addModuleRegistrationRequired(moduleId) {
  handlerModules.add(moduleId)
}

export async function completeModuleRegistration(moduleId) {
  handlerModules.delete(moduleId)
  if (handlerModules.size === 0) {
    const tasks = [...callbacks.values()].map(cb => cb())

    await Promise.all(tasks)
  }
}

export function onHandlerRegistrationComplete(
  cb: () => Promise<void>,
) {
  callbacks.add(cb)
}
