import { CheepEvents } from '@cheep/nestjs'
import { Injectable, OnApplicationBootstrap } from '@nestjs/common'
import { Group, GroupApi } from './groups.api'

@Injectable()
export class GroupQueries implements OnApplicationBootstrap {
  private groups: Group[] = [
    { id: 0, name: 'default', color: 'red', members: [] },
  ]

  constructor(private events: CheepEvents<GroupApi>) {}

  onApplicationBootstrap() {
    // update query model from events!
    this.events.on(
      e => e.Group.created,
      group => {
        this.groups.push(group)
      },
    )
  }

  async getById(props: { id: number }): Promise<Group> {
    return this.groups.find(u => u.id === props.id)
  }

  async getAll(): Promise<Group[]> {
    return this.groups
  }
}
