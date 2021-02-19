import { Inject, Injectable, OnModuleInit } from '@nestjs/common'

import type {
  MessageMetadata,
  Referrer,
  Transport,
  TransportCompactMessage,
} from '@cheep/transport'

import {
  ModuleConfigToken,
  RootConfigToken,
  TransportToken,
} from '../constants'
import {
  Api,
  CallableApi,
  transportApi,
  TransportHandlerOptions,
  RouteMap,
  RouteMapReturn,
  CheepOperators,
} from '@cheep/transport-api'
import {
  CheepMicroservicesModuleConfig,
  CheepMicroservicesRootConfig,
} from '../types'
import { processArgsSafely } from '../util/processArgsSafely'
import { Observable, Subject } from 'rxjs'
import { getLeafAddresses } from '@cheep/utils'

import { filter, share } from 'rxjs/operators'

@Injectable()
export class CheepApi<
  /** remote api definition */
  TRemoteApi extends Api,
  /** local api definition, *only required for publishing or handling local events* */
  // eslint-disable-next-line @typescript-eslint/ban-types
  TLocalApi extends Api = {},
  /** the type of the metadata object *optional* */
  TMeta extends MessageMetadata = MessageMetadata,
  TExecutablePrefixes extends keyof (TRemoteApi | TLocalApi) =
    | 'Query'
    | 'Command'
> implements OnModuleInit {
  private mergedConfig: CheepMicroservicesRootConfig &
    Pick<
      CheepMicroservicesModuleConfig<TLocalApi, TRemoteApi>,
      keyof TransportHandlerOptions
    >

  /** call remote api and receive responses */
  get do(): CallableApi<
    Pick<TRemoteApi & TLocalApi, TExecutablePrefixes | CheepOperators>
  > {
    return transportApi(this.transport, {
      mode: 'EXECUTE',
      joinSymbol: this.mergedConfig.joinSymbol,
      argsProcessor: processArgsSafely,
    })
  }

  /** publish remote api, will resolve once message is successfully sent */
  get publish(): CallableApi<TRemoteApi & TLocalApi> {
    return transportApi(this.transport, {
      mode: 'PUBLISH',
      joinSymbol: this.mergedConfig.joinSymbol,
      argsProcessor: processArgsSafely,
    })
  }

  // for observable events
  private event$ = new Subject<
    EventWithMetadata & { route: string }
  >()

  constructor(
    @Inject(TransportToken) private transport: Transport,
    @Inject(RootConfigToken)
    private rootConfig: CheepMicroservicesRootConfig,
    @Inject(ModuleConfigToken)
    private moduleConfig: CheepMicroservicesModuleConfig<
      TLocalApi,
      TRemoteApi
    >,
  ) {}

  onModuleInit() {
    this.mergedConfig = this.getMergedOptions()
    this.setupEvents()
  }

  /**
   * Observe all messages received, optionally filtered to a set of cheep routes, provided by the first argument.
   *
   * In order for events to appear in this observable the beginning of their route **must** be present in the module config `listenEvery` property
   */
  observe<
    TEventSelection extends RouteMapReturn<unknown[], string[]>,
    TPayload extends Array<
      unknown
    > = TEventSelection extends RouteMapReturn<infer R, string[]>
      ? R extends Array<unknown>
        ? R
        : never
      : never,
    TPath extends string[] = TEventSelection extends RouteMapReturn<
      TPayload,
      infer R
    >
      ? R
      : never
  >(
    route?: (
      eventPick: RouteMap<TRemoteApi & TLocalApi>,
    ) => TEventSelection[],
  ): Observable<EventWithMetadata<TPayload, TPath, TMeta>> {
    if (!route) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return this.event$ as any
    }
    // this allows the callback pick of events using the proxy.
    // BUT the proxy has a liar's type, so we need to call the returned proxy to get the path
    const events = (route(
      generateEventHandlerProxy([]),
    ) as unknown) as (() => string[])[]

    const keys = events
      .map(e => e().join(this.mergedConfig.joinSymbol))
      .filter(x => !!x)

    return this.event$.pipe(
      // protect for case where user provides no event pick filter by checking key length for 0, which should pass
      filter(e => keys.length === 0 || keys.includes(e.route)),
      share(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any
  }

  private setupEvents() {
    // consume the listenEvery option from the module config
    const listenPaths = getLeafAddresses(
      this.moduleConfig.listenEvery ?? {},
    ).map(([path]) => path.join(this.getMergedOptions().joinSymbol))

    function handler(item: TransportCompactMessage<unknown[]>) {
      const processed = processArgsSafely(item.payload ?? [])
      this.event$.next({
        metadata: item.metadata,
        // the event function type requires a single arg, so this is safe
        payload: processed.payload,
        // split by `.` then remove the first, which is the EventRouteKey (Event)
        type: item.route.split('.').slice(1),
        route: item.route,
        referrer: processed.referrer,
      })
    }
    Object.defineProperty(handler, 'name', {
      value: `handle[${listenPaths.join('|')}]`,
      configurable: true,
    })

    this.transport.onEvery(listenPaths, handler.bind(this))
  }

  //#region helpers
  /**
   * get the root and module config options, merged
   */
  private getMergedOptions(): CheepMicroservicesRootConfig &
    Pick<
      CheepMicroservicesModuleConfig<TLocalApi, TRemoteApi>,
      keyof TransportHandlerOptions
    > {
    return {
      ...this.rootConfig,
      ...(this.moduleConfig as CheepMicroservicesModuleConfig<
        Api,
        Api
      >),
    }
  }
}

export type EventWithMetadata<
  TEventPayload = unknown,
  TEventPath extends string[] = string[],
  TMetadata extends MessageMetadata = MessageMetadata
> = {
  type: TEventPath
  payload: TEventPayload
  metadata: TMetadata
  referrer: Referrer<TMetadata>
}

function generateEventHandlerProxy(path: string[]) {
  return new Proxy(() => undefined, {
    get: (_, prop) => {
      return generateEventHandlerProxy([...path, String(prop)])
    },
    apply: () => path,
  })
}
