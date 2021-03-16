import { CheepMicroservicesModule } from '@cheep/nestjs'
import { Module } from '@nestjs/common'
import { UserApi, UserRemoteApi } from './user.api'
import { UserCommands } from './user.commands'
import { UserQueries } from './user.query.service'

@Module({
  imports: [
    CheepMicroservicesModule.forModule<UserApi, UserRemoteApi>({
      handlers: {
        Command: { User: UserCommands },
        Query: { User: UserQueries },
      },
      listenEvery: {
        Event: true,
      },
    }),
  ],
  providers: [UserQueries, UserCommands],
})
export class UserModule {}
