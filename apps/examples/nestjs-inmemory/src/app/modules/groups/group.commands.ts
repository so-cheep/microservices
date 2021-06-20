import { CheepApi } from '@cheep/nestjs'
import { Injectable } from '@nestjs/common'
import { Group, GroupsApi } from './groups.api'
import * as faker from 'faker'
import { AppMetadata } from '../../types'
import { GroupQueries } from './group.queries'
import { Referrer } from '@cheep/transport/core2'

@Injectable()
export class GroupCommands {
  constructor(
    private api: CheepApi<GroupsApi>,
    private query: GroupQueries,
  ) {}

  async create(
    props: { group: Omit<Group, 'id' | 'members'> },
    meta?: Referrer<AppMetadata>,
  ): Promise<number> {
    const newGroup = <Group>{
      ...props.group,
      id: faker.random.number(),
      members: [],
    }
    // simulate long running creation process!
    await this.api.publish.Event.Group.created(newGroup, meta)
    setTimeout(
      () => this.api.publish.Event.Group.updated(newGroup, meta),
      1000,
    )
    return newGroup.id
  }

  async addUser(
    props: { groupId: number; userId: number },
    meta?: Referrer<AppMetadata>,
  ): Promise<void> {
    const group = await this.query.getById({ id: props.groupId })

    const updated = {
      ...group,
      members: group.members
        .filter(x => x !== props.userId)
        .concat([props.userId]),
    }

    await Promise.all([
      this.api.publish.Event.Group.updated(updated, meta),
      this.api.publish.Event.Group.Members.changed(updated, meta),
    ])
  }
}
