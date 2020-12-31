import { EventPublisherService } from '@cheep/nestjs'
import { Injectable } from '@nestjs/common'
import { User, UserApi } from './types'

@Injectable()
export class UserQueryService {
  constructor(private events: EventPublisherService<UserApi>) {}
  async getByEmail(props: { email: string }): Promise<User> {
    return {
      id: 1234,
      name: 'fake user',
      email: props.email,
    }
  }

  async getAll(): Promise<User[]> {
    return []
  }

  test(): number {
    this.events.publish.User.user.created({
      id: 1,
      name: 'test',
      email: '',
    })
    return 2
  }
}
