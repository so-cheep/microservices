import { IHandlerMap } from '@nx-cqrs/cqrs/rpc'

export interface UserCommand extends IHandlerMap {
  login(props: {
    username: string
    password: string
  }): Promise<{
    userId: string
    authToken: string
  }>

  register(props: {
    firstName: string
    lastName: string
  }): Promise<{
    userId: string
  }>
}
