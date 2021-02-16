/* eslint-disable @typescript-eslint/ban-types */
export type ClientApi = {
  Command: {}
  Query: {}
  Event: {}
}

export type ClientRemoteApi = {
  Server: import('../user/user.api').UserApi
}
