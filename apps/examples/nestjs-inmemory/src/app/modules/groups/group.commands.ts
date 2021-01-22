import { CheepEvents } from '@cheep/nestjs'
import { Injectable } from '@nestjs/common'
import { Group, GroupApi } from './groups.api'
import * as faker from 'faker'
import { AppMetadata } from '../../types'
import { GroupQueries } from './group.queries'

@Injectable()
export class GroupCommands {
  constructor(
    private events: CheepEvents<never, GroupApi>,
    private query: GroupQueries,
  ) {}
  async create(
    props: { group: Omit<Group, 'id' | 'members'> },
    meta?: AppMetadata,
  ): Promise<number> {
    const newGroup = <Group>{
      ...props.group,
      id: faker.random.number(),
      members: [],
    }
    // simulate long running creation process!
    setTimeout(
      () => this.events.publish.Group.created(newGroup, meta),
      1000,
    )
    return newGroup.id
  }

  async addUser(
    props: { groupId: number; userId: number },
    meta?: AppMetadata,
  ): Promise<void> {
    const group = await this.query.getById({ id: props.groupId })

    const updated = {
      ...group,
      members: group.members
        .filter(x => x !== props.userId)
        .concat([props.userId]),
    }

    this.events.publish.Group.updated(updated, meta)
  }
}
