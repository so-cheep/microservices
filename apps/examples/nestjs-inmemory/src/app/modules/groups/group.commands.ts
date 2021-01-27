import { CheepApi, CheepEvents } from '@cheep/nestjs'
import { Injectable, OnApplicationBootstrap } from '@nestjs/common'
import { Group, GroupApi } from './groups.api'
import * as faker from 'faker'
import { AppMetadata } from '../../types'
import { GroupQueries } from './group.queries'
import { Referrer } from '@cheep/transport'

@Injectable()
export class GroupCommands implements OnApplicationBootstrap {
  constructor(
    private events: CheepEvents<GroupApi, GroupApi>,
    private api: CheepApi<GroupApi>,
    private query: GroupQueries,
  ) {}

  onApplicationBootstrap() {
    this.events.on(
      e => e.Group.updated,
      (group, x) => {
        this.api.Command.Group.addUser(
          { groupId: group.id, userId: 1 },
          x,
        )
      },
    )
  }
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
    this.events.publish.Group.created(newGroup, meta)
    setTimeout(
      () => this.events.publish.Group.updated(newGroup, meta),
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
      this.events.publish.Group.updated(updated, meta),
      this.events.publish.Group.Members.changed(updated, meta),
    ])
  }
}
