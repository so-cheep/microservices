import { CqrsClientService } from '@cheep/nestjs'
import { Controller, Get } from '@nestjs/common'
import { UserApi } from '../user/types'

@Controller()
export class GatewayService {
  constructor(private client: CqrsClientService<UserApi>) {}

  @Get('users')
  async getUsers() {
    this.client.Query.User.getAll()
  }
}
