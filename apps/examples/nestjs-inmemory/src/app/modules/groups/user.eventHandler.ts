import { CheepApi } from '@cheep/nestjs'
import { Injectable } from '@nestjs/common'
import { User } from '../user/user.api'
import { GroupsApi, GroupsRemoteApi } from './groups.api'

type events = GroupsRemoteApi['api']['Event']['User']
@Injectable()
export class UserEventHandler implements Partial<events> {
  constructor(private api: CheepApi<GroupsRemoteApi, GroupsApi>) {}
  created(user: User) {
    console.log('User created handler in group module', user)
  }
  updated(user: User) {
    console.log('User updated handler', user)
  }
}
