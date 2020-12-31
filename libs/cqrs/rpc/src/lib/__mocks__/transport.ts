import { Subject } from 'rxjs'
import { encodeRpc } from '../utils/encodeRpc'
import { RpcMetadata } from '../types'
import { Transport } from '@cheep/transport/shared'

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
