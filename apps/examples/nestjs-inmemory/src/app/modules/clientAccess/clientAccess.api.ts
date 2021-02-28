/* eslint-disable @typescript-eslint/ban-types */

import { Router } from '@cheep/router'

export type ClientAccessApi = Router<
  import('../client/client.api').ClientApi,
  { clientId: string }
>

export type ClientAccessRemoteApi = import('../user/user.api').UserApi &
  import('../groups/groups.api').GroupApi
