/* eslint-disable @typescript-eslint/ban-types */

export type ClientAccessApi = {
  ClientAccess: ClientAccessRoutedApi
}

export type ClientAccessRemoteApi = {}

export type ClientAccessRoutedApi = {
  $({ clientId }): import('../client/client.api').ClientApi
}
