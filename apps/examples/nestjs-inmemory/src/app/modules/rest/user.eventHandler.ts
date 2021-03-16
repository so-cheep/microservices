import { CheepApi } from '@cheep/nestjs'
import { Injectable } from '@nestjs/common'
import { User } from '../user/user.api'
import { ConsumedApis } from './rest.api'

type events = ConsumedApis['api']['Event']['User']
@Injectable()
export class RestUserEventHandler implements Partial<events> {
  constructor(private api: CheepApi<ConsumedApis>) {}
  created(user: User) {
    console.log('User Created handler in rest', user)
  }
  updated(user: User) {
    console.log('User updated handler in rest', user)
  }
}
