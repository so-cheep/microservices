import { TransportMessage } from '@cheep/transport'

export interface SqsTransportMessage extends TransportMessage {
  receiptHandle: string
}
