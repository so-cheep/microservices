import { Props } from '@nx-cqrs/shared'
import { UserCommand } from '@nx-cqrs/user/api'
import { UserContext } from './user.context'

export class UserCommandImpl implements UserCommand {
  constructor(private ctx: UserContext) {}

  async login(
    props: Props<UserCommand['login']>,
  ): ReturnType<UserCommand['login']> {
    const { username, password } = props

    if (username !== password) {
      throw new Error('INVALID_CREDENTIALS')
    }

    return { authToken: '', userId: '' }
  }

  async register(
    props: Props<UserCommand['register']>,
  ): ReturnType<UserCommand['register']> {
    const {} = props

    return {
      userId: '',
    }
  }
}
