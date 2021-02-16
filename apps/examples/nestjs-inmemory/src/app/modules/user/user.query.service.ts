import { CheepApi } from '@cheep/nestjs'
import { Injectable, OnApplicationBootstrap } from '@nestjs/common'
import { User, UserApi } from './user.api'

@Injectable()
export class UserQueries implements OnApplicationBootstrap {
  private users: User[] = [
    { id: 0, name: 'default', email: 'default' },
  ]

  constructor(private api: CheepApi<UserApi>) {}

  onApplicationBootstrap() {
    // update query model from events!
    this.api
      .observe(e => [e.Event.User.created])
      .subscribe(({ payload }) => {
        this.users.push(payload[0])
      })
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
