import { CheepApi } from '@cheep/nestjs'
import { Injectable } from '@nestjs/common'
import * as faker from 'faker'
import { inspect } from 'util'

import { User, UserApi, UserRemoteApi } from './user.api'

@Injectable()
export class UserCommands {
  constructor(private api: CheepApi<UserRemoteApi, UserApi>) {}
  async create(
    props: { user: Omit<User, 'id'> },
    referrer?,
  ): Promise<number> {
    const newUser = {
      ...props.user,
      id: faker.random.number(),
    }

    if (referrer.metadata.clientId) {
      // this was sent from a client, so let them know it was successful!
      this.api.execute.Command.$({
        clientId: referrer.metadata.clientId,
      }).Ui.showBanner({
        message: `Thanks for creating user id ${newUser.id}`,
      })
    }
    await this.api.publish.Event.User.created(newUser, referrer)
    return newUser.id
  }

  private async thisIsPrivate(x: boolean): Promise<User> {
    return { id: 123, name: 'EXPLODE!', email: x ? '' : '' }
  }
}
