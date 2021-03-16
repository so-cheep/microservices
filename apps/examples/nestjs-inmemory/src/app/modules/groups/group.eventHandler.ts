import { CheepApi } from '@cheep/nestjs'
import { Injectable } from '@nestjs/common'
import { Group, GroupsApi, GroupsRemoteApi } from './groups.api'

type events = GroupsApi['api']['Event']['Group']
@Injectable()
export class GroupEventHandler
  implements Partial<Record<keyof events, unknown>> {
  constructor(private api: CheepApi<GroupsRemoteApi, GroupsApi>) {}

  updated(group: Group, referrer: never) {
    console.log('group event handler')
    this.api.execute.Command.Group.addUser(
      { groupId: group.id, userId: 1 },
      referrer,
    )
  }
}
