import { CheepEvents } from '@cheep/nestjs'
import { Injectable } from '@nestjs/common'
import * as faker from 'faker'
import { User, UserApi } from './user.api'

@Injectable()
export class UserCommands {
  constructor(private events: CheepEvents<never, UserApi>) {}
  async create(props: { user: Omit<User, 'id'> }): Promise<number> {
    const newUser = {
      ...props.user,
      id: faker.random.number(),
    }
    this.events.publish.User.created(newUser)
    return newUser.id
  }

  private async thisIsPrivate(x: boolean): Promise<User> {
    return { id: 123, name: 'EXPLODE!', email: x ? '' : '' }
  }
}