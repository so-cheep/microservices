import { CheepApi } from '@cheep/nestjs'
import { Injectable } from '@nestjs/common'
import { Group } from '../groups/groups.api'
import { ConsumedApis } from './rest.api'

type events = ConsumedApis['api']['Event']['Group']

@Injectable()
export class RestGroupEventHandler implements Partial<events> {
  constructor(private api: CheepApi<ConsumedApis>) {}

  updated(group: Group) {
    console.log('rest group handler', group)
  }
}
