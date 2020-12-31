import { IHandlerMap } from '@cheep/microservices'

export interface UserQuery extends IHandlerMap {
  user(id: string): Promise<User>
  users(): Promise<User[]>
}

interface User {
  id: string
  name: string
}
