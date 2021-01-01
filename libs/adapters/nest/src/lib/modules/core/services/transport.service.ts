import {
  Inject,
  Injectable,
  OnApplicationBootstrap,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common'
import type { Transport } from '@cheep/transport/shared'
import { MissingTransportError } from '../errors/missingTransport.error'
import { RpcMetadata } from '@cheep/microservices'
import { RootOptionsToken } from '../constants'
import { CheepMicroservicesRootConfig } from '../types'

@Injectable()
export class TransportService
  implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy {
  private _transport: Transport<RpcMetadata>
  public get transport(): Transport<RpcMetadata> {
    if (!this._transport) {
      throw new MissingTransportError()
    }
    return this._transport
  }
  public set transport(v: Transport<RpcMetadata>) {
    // only allow transport to be set once!
    if (this._transport === undefined) {
      this._transport = v
    }
  }

  constructor(
    @Inject(RootOptionsToken)
    private rootOptions: CheepMicroservicesRootConfig,
  ) {}

  onModuleInit() {
    this._transport = this.rootOptions.transport as any
  }

  async onApplicationBootstrap() {
    await this.transport.start()
  }

  async onModuleDestroy() {
    await this.transport.stop()
  }
}
