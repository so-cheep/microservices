import { MessageMetadata } from '@cheep/transport'

export interface AppMetadata extends MessageMetadata {
  transactionId: string
}
