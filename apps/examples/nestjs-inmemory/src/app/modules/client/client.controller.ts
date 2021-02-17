import { CheepApi } from '@cheep/nestjs'
import { Controller, Get, Query } from '@nestjs/common'
import { ClientApi, ClientRemoteApi } from './client.api'
import { ClientUserEventHandler } from './user.eventHandler'

@Controller()
export class ClientController {
  constructor(
    private api: CheepApi<ClientRemoteApi, ClientApi>,
    private cache: ClientUserEventHandler,
  ) {}

  @Get('users')
  async test() {
    const result = await this.api.do.Query.User.getAll()
    return result
  }

  @Get('cache')
  readCache() {
    return this.cache.userList
  }

  @Get('store')
  async store(@Query('value') value?: string) {
    return await this.api.do.Command.XuLi.storeTheThing({
      num: Number(value ?? Math.round(Math.random() * 100)),
    })
  }
}
