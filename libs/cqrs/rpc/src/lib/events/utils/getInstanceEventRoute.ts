import { EventNamespaceMetadataKey } from '../constants'
import 'reflect-metadata'
import { EventBase } from '../types'

export function getInstanceEventRoute<T>(eventInstance: T): string[] {
  const namespace = Reflect.getMetadata(
    EventNamespaceMetadataKey,
    eventInstance.constructor,
  )

  if (!namespace) {
    return undefined
  }

  // resolve the inheritance tree of the event
  const path = recursePrototypes(Object.getPrototypeOf(eventInstance))

  return [namespace, ...path]
}

function recursePrototypes<T>(
  eventClass: { new (): T },
  path: string[] = [],
): string[] {
  // check if this is the end of the chain
  try {
    const newPath = [eventClass.constructor.name, ...path]
    const proto = Object.getPrototypeOf(eventClass)
    if (proto.constructor === EventBase) {
      return newPath
    } else {
      return recursePrototypes(
        Object.getPrototypeOf(eventClass),
        newPath,
      )
    }
  } catch {
    return path
  }
}
