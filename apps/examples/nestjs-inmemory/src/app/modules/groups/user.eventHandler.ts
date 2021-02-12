import { Injectable } from '@nestjs/common'
import { User } from '../user/user.api'
import { userApi } from './groups.api'

type userEvents = userApi['Event']['User']
@Injectable()
export class UserEventHandler implements Partial<userEvents> {
  created: (user: User) => {}
  updated: (user: User) => void
}
