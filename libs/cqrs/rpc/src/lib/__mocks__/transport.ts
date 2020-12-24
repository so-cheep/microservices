import { Subject } from 'rxjs'
import { ITransport } from '../../../../types/src'
import { encodeRpc } from '../encodeRpc'

export const mockTransport = <ITransport>{
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
