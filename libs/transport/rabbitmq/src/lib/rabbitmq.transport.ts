import {
  SendErrorReplyMessageProps,
  SendMessageProps,
  SendReplyMessageProps,
  stringifyError,
  TransportBase,
  TransportOptions,
  TransportUtils,
} from '@cheep/transport'
import * as amqp from 'amqp-connection-manager'
import { ConfirmChannel } from 'amqplib'

interface Options {
  moduleName: string
  amqpConnectionString: string
  publishExchangeName: string

  // Only for testing
  forceTempQueues?: boolean
}

export class RabbitMQTransport extends TransportBase {
  private isStarted: boolean
  private channel: amqp.ChannelWrapper

  private queueName: string
  private responseQueueName: string

  constructor(
    protected options: TransportOptions & {
      moduleName: string
      amqpConnectionString: string
      publishExchangeName: string
      forceTempQueues?: boolean
    },
    protected utils: TransportUtils,
  ) {
    super(options, utils)
  }

  async init() {
    const {
      moduleName,
      amqpConnectionString,
      publishExchangeName,
      forceTempQueues,
    } = this.options

    this.queueName = moduleName
    this.responseQueueName = `${moduleName}Response-${this.utils.newId()}`

    const connection = amqp.connect([amqpConnectionString])

    this.channel = connection.createChannel({
      setup: async (x: ConfirmChannel) => {
        await Promise.all([
          // Hub Exchange
          x.assertExchange(publishExchangeName, 'topic', {
            durable: true,
            autoDelete: forceTempQueues,
          }),

          // Queues
          x.assertQueue(this.queueName, {
            durable: true,
            exclusive: forceTempQueues ? true : undefined,
          }),

          // Response queue
          x.assertQueue(this.responseQueueName, {
            durable: true,
            exclusive: true,
          }),
        ])

        x.consume(this.queueName, async msg => {
          if (!msg) {
            return
          }

          const message: string = msg.content
            ? msg.content.toString()
            : null

          const route = msg.fields.routingKey
          const replyTo = msg.properties.replyTo
          const correlationId = msg.properties.correlationId
          const metadata = msg.properties.headers

          try {
            await this.processMessage({
              route,
              correlationId,
              message,
              metadata,
              replyTo,
            })

            x.ack(msg)
          } catch (err) {
            x.nack(msg)
          }
        })

        x.consume(this.responseQueueName, msg => {
          if (!msg) {
            return
          }

          const message: string = msg.content
            ? msg.content.toString()
            : null

          const correlationId = msg.properties.correlationId
          const isError = msg.properties.type === 'error'

          x.ack(msg)

          try {
            this.processResponseMessage({
              correlationId,
              message,
              route: msg.fields.routingKey,
              metadata: msg.properties.headers,
              errorData: isError ? JSON.parse(message) : undefined,
            })
          } catch (err) {
            console.log('processResponseMessage.error', err)
          }
        })
      },
    })
  }

  async start() {
    this.isStarted = true

    const routes = this.getRegisteredRoutes()
    const prefixes = this.getRegisteredPrefixes()

    const patterns = prefixes.map(x => `${x}#`).concat(routes)

    const setup = (x: ConfirmChannel) =>
      Promise.all(
        patterns.map(pattern =>
          x.bindExchange(
            this.queueName,
            this.options.publishExchangeName,
            pattern,
          ),
        ),
      )

    this.channel.addSetup(setup)
  }

  async stop() {
    this.isStarted = false
  }

  async dispose() {
    await super.dispose()
  }

  protected async sendMessage(props: SendMessageProps) {
    const { route, metadata, message, correlationId, isRpc } = props

    await this.channel.publish(
      this.options.publishExchangeName,
      route,
      Buffer.from(message),
      {
        headers: metadata,
        ...(isRpc
          ? {
              replyTo: this.responseQueueName,
              correlationId,
            }
          : null),
      },
    )
  }

  protected async sendReplyMessage(
    props: SendReplyMessageProps,
  ): Promise<void> {
    const { replyTo, correlationId, message, metadata } = props

    this.channel.sendToQueue(replyTo, Buffer.from(message), {
      correlationId,
      headers: metadata,
    })
  }

  protected async sendErrorReplyMessage(
    props: SendErrorReplyMessageProps,
  ) {
    const { replyTo, correlationId, error, metadata } = props

    this.channel.sendToQueue(
      replyTo,
      Buffer.from(stringifyError(error)),
      {
        type: 'error',
        correlationId,
        headers: metadata,
      },
    )
  }
}
