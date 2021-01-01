import { Transport } from '@cheep/transport'
import { Subject } from 'rxjs'
import { RpcMetadata } from '../cqrs/types'
import { encodeRpc } from '../utils/encodeRpc'

export const mockTransport = <Transport<RpcMetadata>>{
  publish: jest.fn().mockResolvedValue({
    result: encodeRpc(undefined),
    metadata: {},
  }),
  dispose: jest.fn(),
  listenPatterns: jest.fn(),
  message$: new Subject(),
  start: jest.fn(),
  stop: jest.fn(),
  moduleName: 'TEST',
}
