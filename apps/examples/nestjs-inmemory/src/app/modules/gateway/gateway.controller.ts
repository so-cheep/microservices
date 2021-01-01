import { CheepApi, CheepEvents } from '@cheep/nestjs'
import {
  Controller,
  Get,
  OnApplicationBootstrap,
} from '@nestjs/common'
import { ConsumedApis } from './types'
import * as faker from 'faker'

@Controller()
export class GatewayService implements OnApplicationBootstrap {
  constructor(
    private client: CheepApi<ConsumedApis>,
    private events: CheepEvents<ConsumedApis>,
  ) {}

  onApplicationBootstrap() {
    this.events.event$.subscribe(e =>
      console.log('EVENT', e.type, e.payload),
    )
  }

  @Get('users')
  async getUsers() {
    return this.client.Query.User.getAll()
  }

  @Get('user/create')
  async createUser() {
    const id = await this.client.Command.User.create({
      user: {
        email: faker.internet.email(),
        name: faker.name.findName(),
      },
    })

    return this.client.Query.User.getById({ id })
  }

  @Get('groups')
  async getGroups() {
    return this.client.Query.Group.getAll()
  }

  @Get('group/create')
  async createGroup() {
    const id = await this.client.Command.Group.create({
      group: {
        name: faker.commerce.department(),
        color: faker.random.arrayElement(['red', 'blue']),
      },
    })

    return this.client.Query.Group.getById({ id })
  }

  /**
   * This is to show that *private* members of remote apis may still be called,
   * but without type safety
   */
  @Get('test')
  async test() {
    return await this.client.Command.User['thisIsPrivate']()
  }
}
