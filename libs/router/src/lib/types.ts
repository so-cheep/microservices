import type { ApiWithExecutableKeys } from '@cheep/transport'

/** create a routable remote api */
export type Router<
  TRemoteApi extends ApiWithExecutableKeys,
  TRouterArgs extends Record<string, unknown>
> = ApiWithExecutableKeys<
  {
    [k in TRemoteApi['executableKeys']]: {
      $: (arg: TRouterArgs) => TRemoteApi['api'][k]
    }
  },
  TRemoteApi['executableKeys']
>
