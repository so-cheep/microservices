import { EventNamespaceMetadataKey } from '../constants'
import 'reflect-metadata'
import { EventBase } from '../types'

export function getClassEventRoute<T>(eventClass: {
  new (...args: unknown[]): T
}): string[] {
  // get namespace off the reflected metadata
  const namespace = Reflect.getMetadata(
    EventNamespaceMetadataKey,
    eventClass,
  )

  if (!namespace) {
    return undefined
  }
  // resolve the inheritance tree of the event
  const path = recursePrototypes(eventClass)

  return [namespace, ...path]
}

function recursePrototypes<T>(
  eventClass: { new (): T },
  path: string[] = [],
): string[] {
  const newPath = [eventClass.prototype.constructor.name, ...path]
  // check if this is the end of the chain
  if (Object.getPrototypeOf(eventClass) === EventBase) {
    return newPath
  } else {
    return recursePrototypes(
      Object.getPrototypeOf(eventClass),
      newPath,
    )
  }
}
