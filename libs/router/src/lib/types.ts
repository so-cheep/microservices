/** create a routable remote api */
export type Router<
  TRemoteApi,
  TRouterArgs extends Record<string, unknown>
> = {
  $: (arg: TRouterArgs) => TRemoteApi
}
