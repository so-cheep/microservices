import { CheepApi } from '@cheep/nestjs'
import { Controller, Get, Param, Query } from '@nestjs/common'
import { ClientApi, ClientRemoteApi } from './client.api'

@Controller()
export class ClientController {
  constructor(private api: CheepApi<ClientRemoteApi, ClientApi>) {}

  @Get('users')
  async test() {
    const result = await this.api.do.Server.Query.User.getAll()
    return result
  }

  @Get('store')
  async store(@Query('value') value?: string) {
    return await this.api.do.Command.XuLi.storeTheThing({
      num: Number(value ?? Math.round(Math.random() * 100)),
    })
  }
}
