import { Transport } from '@cheep/transport'
import * as AWS from 'aws-sdk'
import { LambdaTransport } from '../lambda.transport'

jest.setTimeout(20000) // need for aws setup

describe('lambda.transport', () => {
  it('should work on all steps', async done => {
    // Step 1 - Create transport
    const transport: Transport = new LambdaTransport(
      {
        topicArn: '',
        responseQueueUrl: '',
        deadLetterQueueUrl: '',
        initialMessages: [],

        defaultRpcTimeout: 1000,
      },
      {
        newId: () => '',
        getSns: () => new AWS.SNS(),
        getSqs: () => new AWS.SQS(),
        getMessageGroup: route => '',
        jsonEncode: JSON.stringify,
        jsonDecode: JSON.parse,
      },
    )

    // Step 2 - Initialize and wait
    await transport.init()

    // Step 3 - Register handlers (async for registering the route)
    transport.on('Command.User.Login', async x => {
      const { username, password } = x.message as any

      if (username !== password) {
        throw new Error('INVALID_CREDENTIALS')
      }

      return {
        userId: 'u1',
        authToken: 'jwt...',
      }
    })

    // Step 4 - Start processing messages
    await transport.start()

    // Step 5 - Now you can publish messages or execute RPC calls
    await transport.publish({
      route: 'Event.User.Joined',
      message: {},
      metadata: {},
    })

    const loginResult = await transport.execute({
      route: 'Command.User.Login',
      message: {
        username: 'ezeki',
        password: 'ezeki',
      },
      metadata: {},
      rpcTimeout: 500,
    })

    expect(loginResult).toBeTruthy()
    expect((loginResult as any).authToken).toBeTruthy()
  })
})
