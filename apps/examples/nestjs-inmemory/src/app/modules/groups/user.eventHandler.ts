import { CheepApi } from '@cheep/nestjs'
import { Injectable } from '@nestjs/common'
import { User } from '../user/user.api'
import { GroupApi, RemoteApi } from './groups.api'

type events = RemoteApi['Event']['User']
@Injectable()
export class UserEventHandler implements Partial<events> {
  constructor(private api: CheepApi<RemoteApi, GroupApi>) {}
  created(user: User) {
    console.log('User created handler', user)
  }
  updated(user: User) {
    console.log('User updated handler', user)
  }
}
