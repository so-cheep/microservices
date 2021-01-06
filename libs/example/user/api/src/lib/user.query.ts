import { HandlerMap } from '@cheep/microservices'

export interface UserQuery extends HandlerMap {
  user(id: string): Promise<User>
  users(): Promise<User[]>
}

interface User {
  id: string
  name: string
}
