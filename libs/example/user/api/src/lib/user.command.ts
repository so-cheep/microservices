import { HandlerMap } from '@cheep/microservices'

export interface UserCommand extends HandlerMap {
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
