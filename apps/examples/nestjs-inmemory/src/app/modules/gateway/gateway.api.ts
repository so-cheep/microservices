export type GatewayApi = never

export type ConsumedApis =
  | import('../user/user.api').UserApi
  | import('../groups/groups.api').GroupApi
