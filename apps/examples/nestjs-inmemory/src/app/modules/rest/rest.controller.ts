import { CheepApi } from '@cheep/nestjs'
import {
  Controller,
  Get,
  OnApplicationBootstrap,
  Param,
  Query,
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
    return this.client.execute.Query.User.getAll()
  }

  @Get('users/create')
  async createUser() {
    const id = await this.client.execute.Command.User.create({
      user: {
        email: faker.internet.email(),
        name: faker.name.findName(),
      },
    })

    return this.client.execute.Query.User.getById({ id })
  }

  @Get('groups')
  async getGroups() {
    return this.client.execute.Query.Group.getAll()
  }

  @Get('groups/create')
  async createGroup() {
    const id = await this.client.execute.Command.Group.create({
      group: {
        name: faker.commerce.department(),
        color: faker.random.arrayElement(['red', 'blue']),
      },
    })
    return this.client.execute.Query.Group.getById({ id })
  }
  execute

  /**
   * This is to show that *private* members of remote apis may still be called,
   * but without type safety
   */
  @Get('test')
  async test() {
    return await this.client.execute.Command.User['thisIsPrivate'](
      true,
    )
  }

  @Get('clients/:clientId')
  async routingTest(
    @Param('clientId') clientId: string,
    @Query('value') value?: string,
  ) {
    return await this.client.execute.Command.$({
      clientId,
    }).Ui.showBanner({ message: value ?? 'Rest call' })
  }
}
