import { CheepMicroservicesModule } from '@cheep/nestjs'
import { Module } from '@nestjs/common'
import { UserApi } from './types'
import { UserCommandService } from './user.command.service'
import { UserQueryService } from './user.query.service'
import { UserGroupQueryService } from './userGroup.query.service'

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
