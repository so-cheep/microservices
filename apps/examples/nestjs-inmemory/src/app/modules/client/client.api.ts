import { ClientCommands } from './client.commands'

/* eslint-disable @typescript-eslint/ban-types */
export type ClientApi = {
  Command: {
    XuLi: ClientCommands
  }
  Query: {}
  Event: {
    Socket: {
      connected: () => void
      disconnected: () => void
    }
  }
}

export type ClientRemoteApi = {
  Server: import('../user/user.api').UserApi &
    import('../groups/groups.api').Group
}
