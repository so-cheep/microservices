import { CheepApi } from '@cheep/nestjs'
import { Injectable } from '@nestjs/common'
import * as faker from 'faker'
import { AppMetadata } from '../../types'
import { User, UserApi } from './user.api'

@Injectable()
export class UserCommands {
  constructor(private api: CheepApi<UserApi>) {}
  async create(
    props: { user: Omit<User, 'id'> },
    referrer?,
  ): Promise<number> {
    const newUser = {
      ...props.user,
      id: faker.random.number(),
    }
    await this.api.do.Event.User.created(newUser, referrer)
    return newUser.id
  }

  private async thisIsPrivate(x: boolean): Promise<User> {
    return { id: 123, name: 'EXPLODE!', email: x ? '' : '' }
  }
}
