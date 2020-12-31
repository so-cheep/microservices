import { Module } from '@nestjs/common'

import { CheepMicroservicesModule } from '@cheep/nestjs'

import { UserQueryService } from './user.query.service'
import { UserGroupQueryService } from './userGroup.query.service'
import { UserCommandService } from './user.command.service'
import { UserApi } from './types'

@Module({
  imports: [
    CheepMicroservicesModule.forModule<UserApi, never>({
      moduleName: 'User',
      queryHandlers: [UserQueryService, UserGroupQueryService],
      commandHandlers: [UserCommandService],
      listenEventsFrom: [],
    }),
  ],
  providers: [UserQueryService],
})
export class UserModule {}
