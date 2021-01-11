import { HandlerMap } from '@cheep/microservices'

export interface UserEvent extends HandlerMap {
  userCreated(props: { userId: string; fullname: string })

  userSignedIn(props: { userId: string })

  userSignedOut(props: { userId: string })
}
