import { Injectable } from '@nestjs/common'
import {
  Test,
  TestingModule,
  TestingModuleBuilder,
} from '@nestjs/testing'
import { ModuleOptionsToken, TransportToken } from '../../constants'
import {
  CheepMicroservicesModuleConfig,
  CheepNestApi,
  GenericMicroserviceApi,
  GenericNestApi,
} from '../../types'
import { CqrsHandlerRegistryService } from '../cqrsHandlerRegistry.service'
import { mockTransport } from '../../__mocks__/transport'
import { mocked } from 'ts-jest/utils'

const moduleName = 'TEST'
const mockQueryFn = jest.fn()
@Injectable()
class DummyQuery {
  aQuery = mockQueryFn
}
const queryHandlers = { Nested: DummyQuery }
const mockCommandFn = jest.fn()
@Injectable()
class DummyCommand {
  aCommand = mockCommandFn
}
const commandHandlers = DummyCommand

type Api = CheepNestApi<
  'TEST',
  typeof queryHandlers,
  typeof commandHandlers,
  never
>
let app: TestingModule
let builder: TestingModuleBuilder
const providers = [
  DummyQuery,
  DummyCommand,
  CqrsHandlerRegistryService,
  {
    provide: ModuleOptionsToken,
    useValue: <CheepMicroservicesModuleConfig<Api, never>>{
      moduleName,
      commandHandlers: commandHandlers,
      queryHandlers,
      listenEventsFrom: [],
    },
  },
  {
    provide: TransportToken,
    useValue: mockTransport,
  },
]

describe('cqrs handler registry service', () => {
  beforeEach(async () => {
    // make test module
    builder = Test.createTestingModule({
      providers,
    })
    app = await builder.compile()
  })

  afterEach(async () => {
    await app.close()
  })

  it('registers cqrs correctly', async () => {
    const service = app.get(CqrsHandlerRegistryService)

    await service.onModuleInit()

    expect(handleCqrsApi).toHaveBeenCalledTimes(1)
    console.log(
      mocked(handleCqrsApi).mock.calls[0][1].Query['Nested'],
    )
    expect(handleCqrsApi).toHaveBeenLastCalledWith(mockTransport, <
      CqrsApi<typeof moduleName, typeof queryHandlers, never>
    >{
      namespace: 'TEST',
      Query: {
        Nested: expect.objectContaining<DummyQuery>({
          aQuery: mockQueryFn,
        }),
      },
      Command: expect.objectContaining<DummyCommand>({
        aCommand: mockCommandFn,
      }),
    })
  })

  describe('degenerate configurations', () => {
    test('missing query providers', async () => {
      // make test module with missing query provider
      app = await Test.createTestingModule({
        providers: providers.filter(x => x !== DummyQuery),
      }).compile()
      const service = app.get(CqrsHandlerRegistryService)

      await expect(() => service.onModuleInit()).rejects.toThrow(
        /Query handlers could not be resolved/,
      )
    })

    test('missing top level (non-nested) provider does not throw', async () => {
      // make test module with missing query provider
      app = await Test.createTestingModule({
        providers: providers.filter(x => x !== DummyCommand),
      }).compile()
      const service = app.get(CqrsHandlerRegistryService)

      await expect(service.onModuleInit()).resolves.not.toThrow(
        /Command handlers could not be resolved/,
      )
    })
  })
})
