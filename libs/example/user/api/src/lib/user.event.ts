import { IHandlerMap } from '@cheep/microservices'

export interface UserEvent extends IHandlerMap {
  userCreated(props: { userId: string; fullname: string })

  userSignedIn(props: { userId: string })

  userSignedOut(props: { userId: string })
}
