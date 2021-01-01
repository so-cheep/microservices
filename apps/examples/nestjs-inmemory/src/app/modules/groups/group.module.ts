import { CheepMicroservicesModule } from '@cheep/nestjs'
import { Module } from '@nestjs/common'
import { GroupApi } from './types'
import { GroupCommandService } from './group.command.service'
import { GroupQueryService } from './group.query.service'

@Module({
  imports: [
    CheepMicroservicesModule.forModule<GroupApi, never>({
      moduleName: 'Group',
      queryHandlers: [GroupQueryService],
      commandHandlers: [GroupCommandService],
      listenEventsFrom: [],
    }),
  ],
  providers: [GroupQueryService, GroupCommandService],
})
export class GroupModule {}
