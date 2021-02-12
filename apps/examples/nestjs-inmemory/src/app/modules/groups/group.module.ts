import { CheepMicroservicesModule } from '@cheep/nestjs'
import { Module } from '@nestjs/common'
import { GroupApi, newApi } from './groups.api'
import { GroupCommands } from './group.commands'
import { GroupQueries } from './group.queries'
import { UserEventHandler } from './user.eventHandler'

@Module({
  imports: [
    CheepMicroservicesModule.forModule<newApi, never>({
      handlers: {
        Query: { Group: GroupQueries },
        Command: { Group: GroupCommands },
        Event: {
          User: UserEventHandler,
        },
      },
      listenEvery: {
        Event: true,
      },
    }),
  ],
  providers: [GroupQueries, GroupCommands],
})
export class GroupModule {}
