import { Injectable } from '@nestjs/common'
import { UserGroup } from './types'

@Injectable()
export class UserGroupQueryService {
  async groupById(props: { id: number }): Promise<UserGroup> {
    return {
      id: props.id,
      name: 'fake group',
    }
  }

  private async testprivate() {
    return 2
  }
}
