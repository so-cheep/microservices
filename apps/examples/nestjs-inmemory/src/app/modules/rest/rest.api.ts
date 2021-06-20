import { ApiWithExecutableKeys } from '@cheep/transport/core2'

export type GatewayApi = ApiWithExecutableKeys<
  Record<never, never>,
  never
>

export type ConsumedApis = import('../user/user.api').UserApi &
  import('../groups/groups.api').GroupsApi &
  import('../clientAccess/clientAccess.api').ClientAccessApi
