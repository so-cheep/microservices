import { TransportUtils } from '@cheep/transport'
import { decodeRpc } from './decodeRpc'
import { encodeRpc } from './encodeRpc'
import { v4 } from 'uuid'

/** preset TransportUtils object to supply to Cheep Transport constructor */
export const MicroserviceTransportUtils = <TransportUtils>{
  jsonEncode: encodeRpc,
  jsonDecode: decodeRpc,
  newId: v4,
}
