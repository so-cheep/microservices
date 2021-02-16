import { CheepMicroservicesModule } from '@cheep/nestjs'
import { Module } from '@nestjs/common'
import { GroupApi } from './groups.api'
import { GroupCommands } from './group.commands'
import { GroupQueries } from './group.queries'
import { UserEventHandler } from './user.eventHandler'
import { GroupEventHandler } from './group.eventHandler'

@Module({
  imports: [
    CheepMicroservicesModule.forModule<GroupApi, never>({
      handlers: {
        Query: { Group: GroupQueries },
        Command: { Group: GroupCommands },
        Event: {
          User: UserEventHandler,
          Group: GroupEventHandler,
        },
      },
      listenEvery: {
        Event: true,
      },
    }),
  ],
  providers: [
    GroupQueries,
    GroupCommands,
    UserEventHandler,
    GroupEventHandler,
  ],
})
export class GroupModule {}
