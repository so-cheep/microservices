import { v4 } from 'uuid'
import * as flatted from 'flatted'
import { TransportUtils } from '@cheep/transport'

export const NestTransportUtils = <TransportUtils>{
  jsonEncode: flatted.stringify,
  jsonDecode: flatted.parse,
  newId: v4,
}
