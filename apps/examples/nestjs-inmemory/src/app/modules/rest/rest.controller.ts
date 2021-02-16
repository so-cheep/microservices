import { CheepApi } from '@cheep/nestjs'
import {
  Controller,
  Get,
  OnApplicationBootstrap,
} from '@nestjs/common'
import { ConsumedApis } from './rest.api'
import * as faker from 'faker'

@Controller()
export class RestService implements OnApplicationBootstrap {
  constructor(private client: CheepApi<ConsumedApis>) {}

  onApplicationBootstrap() {
    const x$ = this.client.observe()

    x$.subscribe(e => {
      console.log('EVENT', e.type, e.payload, e.metadata),
        console.log(
          'Event span:',
          new Date((e as any).metadata.transactionStartedAt),
          '->',
          new Date(),
        )
    })
  }

  @Get('users')
  async getUsers() {
    return this.client.do.Query.User.getAll()
  }

  @Get('users/create')
  async createUser() {
    const id = await this.client.do.Command.User.create({
      user: {
        email: faker.internet.email(),
        name: faker.name.findName(),
      },
    })

    return this.client.do.Query.User.getById({ id })
  }

  @Get('groups')
  async getGroups() {
    return this.client.do.Query.Group.getAll()
  }

  @Get('groups/create')
  async createGroup() {
    const id = await this.client.do.Command.Group.create({
      group: {
        name: faker.commerce.department(),
        color: faker.random.arrayElement(['red', 'blue']),
      },
    })

    return this.client.do.Query.Group.getById({ id })
  }

  /**
   * This is to show that *private* members of remote apis may still be called,
   * but without type safety
   */
  @Get('test')
  async test() {
    return await this.client.do.Command.User['thisIsPrivate'](true)
  }
}
