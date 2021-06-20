import { TransportUtils } from '@cheep/transport'
import * as flatted from 'flatted'
import { v4 } from 'uuid'

export const NestTransportUtils = <TransportUtils>{
  jsonEncode: flatted.stringify,
  jsonDecode: flatted.parse,
  newId: v4,
}
