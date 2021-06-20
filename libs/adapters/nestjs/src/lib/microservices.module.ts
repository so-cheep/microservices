import type { TransportCompactMessage } from '@cheep/transport/core2'
import { ApiWithExecutableKeys } from '@cheep/transport/core2'
import { getLeafAddresses } from '@cheep/utils'
import {
  DynamicModule,
  Inject,
  Module,
  OnModuleInit,
  Type,
} from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { ModuleConfigToken, RootConfigToken } from './constants'
import { CheepApi } from './services/api.service'
import type {
  CheepMicroservicesModuleConfig,
  CheepMicroservicesRootConfig,
} from './types'
import { getFunctionValues } from './util/getFunctionValues'
import {
  addModuleRegistrationRequired,
  completeModuleRegistration,
} from './util/handlerRegistration'
import { makeSafeArgs } from './util/makeSafeArgs'

@Module({})
export class CheepMicroservicesModule<
  TModuleApi extends ApiWithExecutableKeys,
  TRemoteApi extends ApiWithExecutableKeys
> implements OnModuleInit {
  static forModule<
    TModuleApi extends ApiWithExecutableKeys,
    TRemoteApi extends ApiWithExecutableKeys
  >(
    config: CheepMicroservicesModuleConfig<TModuleApi, TRemoteApi>,
  ): DynamicModule {
    const registrationId = Date.now() + Math.random()
    addModuleRegistrationRequired(registrationId)

    return {
      module: CheepMicroservicesModule,
      providers: [
        CheepApi,
        {
          provide: ModuleConfigToken,
          useValue: config,
        },
        {
          provide: 'PRIVATE_REGISTRATION_ID',
          useValue: registrationId,
        },
      ],
      exports: [CheepApi],
    }
  }

  constructor(
    @Inject(RootConfigToken)
    private rootConfig: CheepMicroservicesRootConfig,
    @Inject(ModuleConfigToken)
    private config: CheepMicroservicesModuleConfig<
      TModuleApi,
      TRemoteApi
    >,
    private moduleRef: ModuleRef,
    @Inject('PRIVATE_REGISTRATION_ID') private registrationId: number,
  ) {}

  async onModuleInit() {
    if (this.config?.handlers) {
      this.registerHandlers()
    }

    await completeModuleRegistration(this.registrationId)

    // const handler = transportHandler<TModuleApi | TRemoteApi>(
    //   this.transport,
    //   this.config,
    // )
    // reduce handlers to array of [path, handler]
  }

  private registerHandlers() {
    const leaves = getLeafAddresses(this.config?.handlers)

    for (const [path, token] of leaves) {
      // check dep injection
      const service = this.moduleRef.get(token as Type, {
        strict: false,
      })

      if (service) {
        const methods = getFunctionValues<
          Record<string, (...args: unknown[]) => unknown>
        >(service)
        Object.entries(methods).map(([fnName, fn]) => {
          // add the function name onto the path and handle with fn
          const route = path
            .concat([fnName])
            .join(this.rootConfig.joinSymbol)
          // build the handler function
          const handler = async (
            item: TransportCompactMessage<unknown[]>,
          ) => {
            // TODO: build referrer with ReflectMetadata
            const args = makeSafeArgs(item)
            return fn(...args)
          }

          // set the name of the handler for debugging
          Object.defineProperty(handler, 'name', {
            value: `Cheep[${service.__proto__.constructor.name}.${fnName}]@[${route}]`,
            configurable: true,
          })

          this.rootConfig.transport.on(route, handler)
        })
      }
    }
    // call
  }
}
