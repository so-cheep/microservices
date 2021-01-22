import { MessageMetadata } from '@cheep/transport'

export interface AppMetadata extends MessageMetadata {
  transactionId: string
  transactionStack: string[]
  transactionStart: Date | string
}
