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
  Logger,
  OnModuleInit,
  Type,
} from '@nestjs/common'
import { ModuleConfigToken, TransportToken } from '../constants'
import type {
  CheepMicroservicesModuleConfig,
  GenericMicroserviceApi,
  GenericNestApi,
} from '../types'
import type { Transport } from '@cheep/transport'
import { ModuleRef } from '@nestjs/core'
import { HandlerRegistrationError } from '../errors/handlerRegistration.error'
import { completeModuleHandlerRegistration } from '../util/moduleRegistry'
import { getFunctionValues } from '../util/getFunctionValues'

@Injectable()
export class CqrsHandlerRegistryService implements OnModuleInit {
  private logger: Logger
  constructor(
    @Inject(ModuleConfigToken)
    private moduleOptions: CheepMicroservicesModuleConfig<
      GenericNestApi,
      GenericMicroserviceApi
    >,
    @Inject(TransportToken) private transport: Transport,
    private moduleRef: ModuleRef,
  ) {
    this.logger = new Logger(
      `${moduleOptions.moduleName}:CqrsHandlerRegistry`,
    )
  }

  async onModuleInit() {
    const api: CqrsApi<string, QueryMap, CommandMap> = {
      namespace: this.moduleOptions.moduleName,
      Query: await recurseNestHandlerMap(
        this.moduleOptions.queryHandlers as ShallowHandlerMap<Type>,
        this.moduleRef,
      ).catch(() => {
        throw Error(
          `Query handlers for [${this.moduleOptions.moduleName}] could not be resolved, either the map is too deep (more than 4 objects) or one of your Query handlers is not provided in the module`,
        )
      }),
      Command: await recurseNestHandlerMap(
        this.moduleOptions.commandHandlers as ShallowHandlerMap<Type>,
        this.moduleRef,
      ).catch(() => {
        throw Error(
          `Command handlers for [${this.moduleOptions.moduleName}] could not be resolved, either the map is too deep (more than 4 objects) or one of your Query handlers is not provided in the module`,
        )
      }),
    }

    handleCqrsApi(this.transport, api)
    completeModuleHandlerRegistration(this.moduleOptions.moduleName)
  }
}

async function buildHandlerMap(
  handlerClasses: ShallowHandlerMap<Type>,
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
  x: ShallowHandlerMap<object> | Type<unknown>,
  moduleRef: ModuleRef,
  remainingDepth = 4,
): Promise<ShallowHandlerMap<Handler>> {
  if (!x) return {}
  if (remainingDepth === 0) {
    throw new Error('Handler map depth exceeded!')
  }

  try {
    // attempt to treat x as a dependency injectable type, which throws on failure
    const dep = await moduleRef.get(x as Type<unknown>, {
      strict: false,
    })
    // eslint-disable-next-line @typescript-eslint/ban-types
    return getFunctionValues(dep as object) as ShallowHandlerMap<
      Handler
    >
  } catch (err) {
    // x was not a dependency injectable type, so now recurse into x
    const entries = Object.entries(x).map(async ([key, value]) => {
      return [
        key,
        await recurseNestHandlerMap(
          value,
          moduleRef,
          remainingDepth - 1,
        ),
      ]
    })

    if (entries.length === 0) {
      throw Error('Found empty handler branch!')
    }
    return Object.fromEntries(await Promise.all(entries))
  }
}
