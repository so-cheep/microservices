import { CheepEvents } from '@cheep/nestjs'
import { Injectable, OnApplicationBootstrap } from '@nestjs/common'
import { User, UserApi } from './types'

@Injectable()
export class UserQueryService implements OnApplicationBootstrap {
  private users: User[] = [
    { id: 0, name: 'default', email: 'default' },
  ]

  constructor(private events: CheepEvents<UserApi>) {}

  onApplicationBootstrap() {
    // update query model from events!
    this.events.on(
      e => e.User.user.created,
      user => {
        this.users.push(user)
      },
    )
  }

  async getById(props: { id: number }): Promise<User> {
    return this.users.find(u => u.id === props.id)
  }

  async getByEmail(props: { email: string }): Promise<User> {
    return this.users.find(u => u.email === props.email)
  }

  async getAll(): Promise<User[]> {
    return this.users
  }
}
