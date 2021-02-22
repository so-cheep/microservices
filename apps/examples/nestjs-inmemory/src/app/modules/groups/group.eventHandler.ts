import { CheepApi } from '@cheep/nestjs'
import { Injectable } from '@nestjs/common'
import { Group, GroupApi, RemoteApi } from './groups.api'

type events = GroupApi['Event']['Group']
@Injectable()
export class GroupEventHandler
  implements Partial<Record<keyof events, unknown>> {
  constructor(private api: CheepApi<RemoteApi, GroupApi>) {}

  updated(group: Group, referrer: never) {
    this.api.execute.Command.Group.addUser(
      { groupId: group.id, userId: 1 },
      referrer,
    )
  }
}
