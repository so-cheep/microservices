/* eslint-disable @typescript-eslint/ban-types */

import type { Router } from '@cheep/router'

type ClientRouter = Router<
  import('../../../../../ng-socketio/src/client.api').ClientApi,
  { clientId: string }
>
export type ClientAccessApi = ClientRouter

export type ClientAccessRemoteApi = import('../user/user.api').UserApi &
  import('../groups/groups.api').GroupsApi
