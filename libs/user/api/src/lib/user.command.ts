import { NotImplementedError } from '@nx-cqrs/shared'

export abstract class UserCommand {
  async login(props: {
    username: string
    password: string
  }): Promise<{
    userId: string
    authToken: string
  }> {
    throw new NotImplementedError()
  }

  register(props: {
    firstName: string
    lastName: string
  }): Promise<{
    userId: string
  }> {
    throw new NotImplementedError()
  }
}
