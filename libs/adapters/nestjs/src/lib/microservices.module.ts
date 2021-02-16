import {
  Module,
  DynamicModule,
  OnModuleInit,
  Inject,
  Type,
} from '@nestjs/common'

import type {
  CheepMicroservicesModuleConfig,
  CheepMicroservicesRootConfig,
} from './types'
import {
  ModuleConfigToken,
  RootConfigToken,
  TransportToken,
} from './constants'
import { CheepApi } from './services/api.service'
import type {
  TransportBase,
  TransportCompactMessage,
} from '@cheep/transport'
import { TransportApi } from '@cheep/transport-api'
import { getLeafAddresses } from './util/getLeafAddresses'
import { ModuleRef } from '@nestjs/core'
import { getFunctionValues } from './util/getFunctionValues'
import { makeSafeArgs } from './util/makeSafeArgs'

@Module({})
export class CheepMicroservicesModule<
  TModuleApi extends TransportApi,
  TRemoteApi extends TransportApi
> implements OnModuleInit {
  static forModule<
    TModuleApi extends TransportApi,
    TRemoteApi extends TransportApi
  >(
    config: CheepMicroservicesModuleConfig<TModuleApi, TRemoteApi>,
  ): DynamicModule {
    return {
      module: CheepMicroservicesModule,
      providers: [
        CheepApi,
        {
          provide: ModuleConfigToken,
          useValue: config,
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
  ) {}

  onModuleInit() {
    if (this.config?.handlers) {
      this.registerHandlers()
    }
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
            .join(this.config.joinSymbol)
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
            value: `Cheep[${fnName ?? 'Handler'}]@[${route}]`,
            configurable: true,
          })

          this.rootConfig.transport.on(route, handler)
        })
      }
    }
    // call
  }
}
