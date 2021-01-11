import { CheepMicroservicesModule } from '@cheep/nestjs'
import { Module } from '@nestjs/common'
import { UserApi } from './types'
import { UserCommands } from './user.commands'
import { UserQueries } from './user.query.service'

@Module({
  imports: [
    CheepMicroservicesModule.forModule<UserApi, never>({
      moduleName: 'User',
      queryHandlers: [UserQueries],
      commandHandlers: [UserCommands],
      listenEventsFrom: [],
    }),
  ],
  providers: [UserQueries, UserCommands],
})
export class UserModule {}
