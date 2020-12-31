import { Module } from '@nestjs/common'

import { CheepMicroservicesModule } from '@cheep/nestjs'

import { UserQueryService } from './user.query.service'
import { UserCommandService } from './user.command.service'
import { UserApi } from './types'

@Module({
  imports: [
    CheepMicroservicesModule.forModule<UserApi, never>({
      moduleName: 'User',
      queryHandlers: [UserQueryService],
      commandHandlers: [UserCommandService],
      listenEventsFrom: [],
    }),
  ],
  providers: [UserQueryService, UserCommandService],
})
export class UserModule {}
