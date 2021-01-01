import { CheepEvents } from '@cheep/nestjs'
import { Injectable } from '@nestjs/common'
import { Group, GroupApi } from './types'
import * as faker from 'faker'

@Injectable()
export class GroupCommandService {
  constructor(private events: CheepEvents<GroupApi>) {}
  async create(props: { group: Omit<Group, 'id'> }): Promise<number> {
    const newUser = {
      ...props.group,
      id: faker.random.number(),
    }
    this.events.publish.Group.created(newUser)
    return newUser.id
  }
}
