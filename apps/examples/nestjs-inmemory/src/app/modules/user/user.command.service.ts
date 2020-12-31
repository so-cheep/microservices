import { EventPublisherService } from '@cheep/nestjs'
import { Injectable } from '@nestjs/common'
import { User, UserApi } from './types'

@Injectable()
export class UserCommandService {
  constructor(private events: EventPublisherService<UserApi>) {}
  async create(props: { user: Omit<User, 'id'> }): Promise<number> {
    const newUser = {
      ...props.user,
      id: 1234,
    }
    this.events.publish.User.user.created(newUser)
    return newUser.id
  }

  private async thisIsPrivate(x: boolean): Promise<User> {
    return { id: 123, name: '', email: x ? '' : '' }
  }
}
