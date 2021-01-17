import { Transport, TransportState } from '@cheep/transport'

export const mockTransport = <Transport>{
  state: TransportState.STARTED,
  execute: jest.fn().mockResolvedValue(undefined),
  publish: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  onEvery: jest.fn(),
  off: jest.fn(),

  // lifecycle
  init: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  dispose: jest.fn(),
}
