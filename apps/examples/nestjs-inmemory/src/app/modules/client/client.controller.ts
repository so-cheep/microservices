import { CheepApi } from '@cheep/nestjs'
import { Controller, Get } from '@nestjs/common'
import { ClientApi, ClientRemoteApi } from './client.api'

@Controller('client')
export class ClientController {
  constructor(private api: CheepApi<ClientRemoteApi, ClientApi>) {}

  @Get()
  async test() {
    const result = await this.api.do.Server.Query.User.getAll()
    return result
  }
}
