import { ApiWithExecutableKeys } from '@cheep/transport-api'

export type GatewayApi = ApiWithExecutableKeys

export type ConsumedApis = import('../user/user.api').UserApi &
  import('../groups/groups.api').GroupsApi &
  import('../clientAccess/clientAccess.api').ClientAccessApi
