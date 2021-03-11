import { Injectable } from '@angular/core'
import { MemoryTransport } from '@cheep/transport'
import {
  ApiWithExecutableKeys,
  TransportApi,
  createTransportApi,
  createTransportHandler,
} from '@cheep/transport-api'
import { parse, stringify } from 'flatted'
import { v4 } from 'uuid'

@Injectable({
  providedIn: 'root',
})
export class ApiService<
  TRemoteApi extends ApiWithExecutableKeys,
  TLocalApi extends ApiWithExecutableKeys = ApiWithExecutableKeys
> {
  readonly transport: MemoryTransport
  constructor() {
    this.transport = new MemoryTransport(
      {},
      {
        jsonDecode: parse,
        jsonEncode: stringify,
        newId: v4,
      },
    )
    this.transport.init()
  }

  get execute(): TransportApi<
    TRemoteApi['api'],
    TRemoteApi['executableKeys']
  >['execute'] {
    return createTransportApi<ApiWithExecutableKeys>(this.transport, {
      joinSymbol: '.',
    }).execute
  }

  get publish(): TransportApi<
    TRemoteApi['api'],
    TRemoteApi['executableKeys']
  >['publish'] {
    return createTransportApi<ApiWithExecutableKeys>(this.transport, {
      joinSymbol: '.',
    }).publish
  }

  get on() {
    return createTransportHandler<TLocalApi & TRemoteApi>(
      this.transport,
      { joinSymbol: '.' },
    ).on
  }
}
