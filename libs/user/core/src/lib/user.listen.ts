import { PusherClientAction } from '@nx-cqrs/pusher/api'
import { MessageBus } from '@nx-cqrs/shared'
import { UserClientAction } from '@nx-cqrs/user/shared'

export class UserListen {
  constructor(
    eventBus: MessageBus<PusherClientAction | UserClientAction>,
  ) {
    eventBus.message$.subscribe(x => {
      switch (x.type) {
        case 'Socket.Online':
          break

        case 'Socket.Offline':
          break

        case 'User.Login':
          break

        case 'User.Register':
          break
      }
    })
  }
}
