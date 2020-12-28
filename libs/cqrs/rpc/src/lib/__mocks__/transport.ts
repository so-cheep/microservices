import { Subject } from 'rxjs'
import { Transport } from '../../../../types/src'
import { encodeRpc } from '../utils/encodeRpc'

export const mockTransport = <Transport>{
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
