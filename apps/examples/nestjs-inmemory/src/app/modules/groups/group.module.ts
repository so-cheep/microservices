import { CheepMicroservicesModule } from '@cheep/nestjs'
import { Module } from '@nestjs/common'
import { GroupApi } from './groups.api'
import { GroupCommands } from './group.commands'
import { GroupQueries } from './group.queries'

@Module({
  imports: [
    CheepMicroservicesModule.forModule<GroupApi, never>({
      moduleName: 'Group',
      queryHandlers: GroupQueries,
      commandHandlers: GroupCommands,
      listenEventsFrom: [],
    }),
  ],
  providers: [GroupQueries, GroupCommands],
})
export class GroupModule {}
