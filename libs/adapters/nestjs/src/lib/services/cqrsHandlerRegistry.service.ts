import {
  CommandMap,
  handleCqrsApi,
  CqrsApi,
  QueryMap,
  Handler,
  ShallowHandlerMap,
} from '@cheep/microservices'
import {
  Inject,
  Injectable,
  OnModuleInit,
  Type,
} from '@nestjs/common'
import {
  ModuleNameToken,
  ModuleOptionsToken,
  TransportToken,
} from '../constants'
import type { CheepMicroservicesModuleConfig } from '../types'
import type { Transport } from '@cheep/transport'
import { ModuleRef } from '@nestjs/core'
import { HandlerRegistrationError } from '../errors/handlerRegistration.error'
import { completeModuleHandlerRegistration } from '../util/moduleRegistry'

const NestLifecycleFunctions = [
  'constructor',
  'onModuleInit',
  'onApplicationBootstrap',
  'onModuleDestroy',
  'onApplicationShutdown',
]

@Injectable()
export class CqrsHandlerRegistryService implements OnModuleInit {
  constructor(
    @Inject(ModuleOptionsToken)
    private moduleOptions: CheepMicroservicesModuleConfig<
      never,
      never
    >,
    @Inject(ModuleNameToken) private moduleName: string,
    @Inject(TransportToken) private transport: Transport,
    private moduleRef: ModuleRef,
  ) {}

  async onModuleInit() {
    const api: CqrsApi<string, QueryMap, CommandMap> = {
      namespace: this.moduleName,
      Query: await buildHandlerMap(
        this.moduleOptions.queryHandlers,
        this.moduleRef,
      ),
      Command: await buildHandlerMap(
        this.moduleOptions.commandHandlers,
        this.moduleRef,
      ),
    }

    handleCqrsApi(this.transport, api)
    completeModuleHandlerRegistration(this.moduleName)
  }
}

async function buildHandlerMap(
  handlerClasses: Type<unknown>[],
  moduleRef: ModuleRef,
): Promise<ShallowHandlerMap<Handler>> {
  if (Array.isArray(handlerClasses)) {
    return handlerClasses.reduceRight((map, classDef) => {
      return {
        ...map,
        ...Object.fromEntries(
          Reflect.ownKeys(classDef.prototype)
            .filter(
              key =>
                !NestLifecycleFunctions.includes(String(key)) &&
                typeof Reflect.get(classDef.prototype, key) ===
                  'function',
            )
            .map(key => [
              key,
              getModuleRefProxy(moduleRef, classDef, key),
            ]),
        ),
      }
    }, {})
  } else {
    return await recurseNestHandlerMap(handlerClasses, moduleRef)
  }
}

function getModuleRefProxy<TClass extends Type<unknown>>(
  moduleRef: ModuleRef,
  token: TClass,
  prop,
): Handler {
  return async (...args: unknown[]) => {
    try {
      // use module ref to resolve the token
      const resolved = moduleRef.get(token, { strict: false })

      // once resolved, reflect the appropriate prop off of the resolved version
      const fn = Reflect.get(resolved as TClass, prop, resolved)

      if (fn) {
        return Reflect.apply(fn, resolved, args)
      } else {
        throw undefined
      }
    } catch (err) {
      throw new HandlerRegistrationError(token, String(prop), err)
    }
  }
}

async function recurseNestHandlerMap(
  // eslint-disable-next-line @typescript-eslint/ban-types
  x: ShallowHandlerMap<object>,
  moduleRef: ModuleRef,
): Promise<ShallowHandlerMap<Handler>> {
  const entries = Object.entries(x).map(async ([key, value]) => {
    try {
      const dep = await moduleRef.get(value as Type<unknown>, {
        strict: false,
      })
      return [key, getFunctionValues(dep)]
    } catch (err) {
      return [key, recurseNestHandlerMap(x, moduleRef)]
    }
  })

  return Object.fromEntries(await Promise.all(entries))
}

function getFunctionValues<T>(x: T): T {
  const proto = Object.getPrototypeOf(x)
  return Object.fromEntries(
    Reflect.ownKeys(proto)
      .filter(
        key =>
          !NestLifecycleFunctions.includes(String(key)) &&
          typeof Reflect.get(proto, key) === 'function',
      )
      .map(key => {
        return [key, Reflect.get(proto, key).bind(x)]
      }),
  ) as T
}
