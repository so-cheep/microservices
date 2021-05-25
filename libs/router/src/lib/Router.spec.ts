import {
  CallStackMetadata,
  callStackReducer,
  CreatedAtMetadata,
  createdAtReducer,
  MemoryTransport,
  TransactionMetadata,
  transactionReducer,
} from '@cheep/transport'
import { createRouter, TunnelNextHop } from './createRouter'
import { v4 } from 'uuid'
import { parse, stringify } from 'flatted'

type Meta = CreatedAtMetadata &
  CallStackMetadata &
  TransactionMetadata

let transport: MemoryTransport

const deviceId = '123456'
const mockSend = jest.fn()
let receiver: Parameters<TunnelNextHop['registerReceiver']>[0]
const mockListener = jest.fn()
const mockHandler = jest.fn()
describe('router with tunnel next hop', () => {
  beforeEach(async () => {
    // be sure to recreate memory transport each time!
    transport = new MemoryTransport(
      {
        metadataReducers: [
          callStackReducer(),
          createdAtReducer(Date.now),
          transactionReducer(v4, Date.now),
        ],
      },
      { newId: v4, jsonDecode: parse, jsonEncode: stringify },
    )
    await transport.init()
    jest.clearAllMocks()
    createRouter({
      routerId: 'ROUTER',
      transport,
      nextHops: [
        {
          type: 'TUNNEL',
          send: mockSend,
          exampleTunnelId: { deviceId: '' },
          registerReceiver: rcvr => (receiver = rcvr),
        },
      ],
    })
    transport.on('Event.server', mockListener)
    await transport.start()
  })
  afterEach(async () => await transport.dispose())

  describe('non RPC messages', () => {
    it('should route publish messages from the transport to the tunnel', async () => {
      await transport.publish({
        payload: [{}],
        route: ['Event', 'create'].join('.'),
        metadata: {
          deviceId: deviceId,
          otherThing: ['xyzx'],
        },
      })

      expect(mockSend).toHaveBeenCalledTimes(1)
      const args = mockSend.mock.calls[0]
      expect(args[1].route).toMatch('Event.create')
      expect(args[0]).toMatchObject({ deviceId })
    })

    it('should route messages from the tunnel to the transport', async () => {
      await receiver(
        { deviceId },
        {
          route: 'Event.server',
          payload: {},
          metadata: { original: 1234 },
          correlationId: '',
        },
      )

      expect(mockListener).toHaveBeenCalledTimes(1)
      const args = mockListener.mock.calls[0]
      expect(args[0].route).toMatch('Event.server')
      expect(args[0].metadata).toMatchObject({
        deviceId,
        original: 1234,
      })
    })
  })

  describe('RPC messages', () => {
    it('should route execute messages from the transport to the tunnel', async () => {
      const mockResult = 'pony'
      const result = transport.execute({
        payload: [{}],
        route: 'Command.fromServer',
        metadata: {
          deviceId: deviceId,
          otherThing: ['xyzx'],
        },
      })

      expect(mockSend).toHaveBeenCalledTimes(1)
      const args = mockSend.mock.calls[0]
      expect(args[1].route).toMatch('Command.fromServer')
      expect(args[0]).toMatchObject({ deviceId })

      // mock the return value through the tunnel
      receiver(
        { deviceId },
        {
          route: '',
          correlationId: args[1].correlationId,
          replyTo: null,
          metadata: {},
          payload: { mockResult },
        },
      )

      await expect(result).resolves.toMatchObject({ mockResult })
    })

    it('should reply to rpc messages sent by the client', async () => {
      const correlationId = 'correlate'
      const mockResult = 'puppydog'
      transport.on('Command.server', mockHandler)
      mockHandler.mockResolvedValueOnce(mockResult)
      const tunnelId = { deviceId }
      await receiver(tunnelId, {
        route: 'Command.server',
        payload: {},
        metadata: { original: 1234 },
        correlationId: correlationId,
        replyTo: 'replymessagething',
      })

      expect(mockHandler).toHaveBeenCalledTimes(1)
      const args = mockHandler.mock.calls[0]
      expect(args[0].route).toMatch('Command.server')
      expect(args[0].metadata).toMatchObject({
        deviceId,
        original: 1234,
      })

      expect(mockSend).toHaveBeenCalledTimes(1)
      const [returnTunnelId, item] = mockSend.mock.calls[0]
      expect(returnTunnelId).toMatchObject(tunnelId)
      expect(item.correlationId).toMatch(correlationId)
      expect(item.replyTo).toBeNull()
      expect(item.payload).toMatch(mockResult)
    })
  })
})
