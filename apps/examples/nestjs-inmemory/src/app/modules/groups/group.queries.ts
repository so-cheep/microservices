import { CheepApi } from '@cheep/nestjs'
import { Injectable, OnApplicationBootstrap } from '@nestjs/common'
import { Group, GroupApi } from './groups.api'

@Injectable()
export class GroupQueries implements OnApplicationBootstrap {
  private groups: Group[] = [
    { id: 0, name: 'default', color: 'red', members: [] },
  ]

  constructor(private api: CheepApi<GroupApi>) {}

  onApplicationBootstrap() {
    // update query model from events!
    this.api
      .observe(e => [e.Event.Group.created])
      .subscribe(({ payload }) => {
        this.groups.push(payload[0])
      })
  }

  async getById(props: { id: number }): Promise<Group> {
    return this.groups.find(u => u.id === props.id)
  }

  async getAll(): Promise<Group[]> {
    return this.groups
  }
}
