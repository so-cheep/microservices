import { IHandlerMap } from '@nx-cqrs/cqrs/rpc'

export interface UserEvent extends IHandlerMap {
  userCreated(props: { userId: string; fullname: string })

  userSignedIn(props: { userId: string })

  userSignedOut(props: { userId: string })
}
