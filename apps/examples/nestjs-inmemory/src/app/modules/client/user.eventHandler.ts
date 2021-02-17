import { CheepApi } from '@cheep/nestjs'
import { Referrer } from '@cheep/transport'
import {
  Injectable,
  OnApplicationBootstrap,
  OnModuleInit,
} from '@nestjs/common'
import { User } from '../user/user.api'
import { ClientRemoteApi } from './client.api'

type UserEvents = ClientRemoteApi['Event']['User']
@Injectable()
export class ClientUserEventHandler
  implements UserEvents, OnApplicationBootstrap {
  userList: User[] = []

  constructor(private api: CheepApi<ClientRemoteApi>) {}

  async onApplicationBootstrap() {
    this.userList = await this.api.do.Query.User.getAll()
  }

  created(user: User, ref?: Referrer<Record<string, unknown>>) {
    this.userList.push(user)
  }
  deleted(user: User, ref?: Referrer<Record<string, unknown>>) {
    this.userList = this.userList.filter(x => x.id !== user.id)
  }
  Nested: {
    single: (
      x: number,
      ref?: Referrer<Record<string, unknown>>,
    ) => void
    Deeper: {
      double: (
        x: boolean,
        ref?: Referrer<Record<string, unknown>>,
      ) => void
    }
  }
}
