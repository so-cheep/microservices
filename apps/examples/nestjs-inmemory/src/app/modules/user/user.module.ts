import { CheepMicroservicesModule } from '@cheep/nestjs'
import { Module } from '@nestjs/common'
import { UserApi } from './user.api'
import { UserCommands } from './user.commands'
import { UserQueries } from './user.query.service'

@Module({
  imports: [
    CheepMicroservicesModule.forModule<UserApi, never>({
      moduleName: 'User',
      queryHandlers: { Test: UserQueries },
      commandHandlers: [UserCommands],
      listenEventsFrom: [],
    }),
  ],
  providers: [UserQueries, UserCommands],
})
export class UserModule {}
