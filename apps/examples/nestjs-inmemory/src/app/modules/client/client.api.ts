/* eslint-disable @typescript-eslint/ban-types */
export type ClientApi = {
  Command: {
    XuLi: {
      doTheThing(arg: { num: number }): Promise<boolean>
    }
  }
  Query: {}
  Event: {}
}

export type ClientRemoteApi = {
  Server: import('../user/user.api').UserApi
}
