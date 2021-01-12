import {
  normalizeError,
  SendErrorReplyMessageProps,
  SendMessageProps,
  SendReplyMessageProps,
  TransportBase,
  TransportOptions,
  TransportUtils,
} from '@cheep/transport'
import * as amqp from 'amqp-connection-manager'
import { ConfirmChannel } from 'amqplib'

export class RabbitMQTransport extends TransportBase {
  private channel: amqp.ChannelWrapper
  private queueName: string
  private responseQueueName: string
  private bindingSetup: any

  constructor(
    protected options: TransportOptions & {
      moduleName: string
      amqpConnectionString: string
      publishExchangeName: string
      isTestMode?: boolean
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
      isTestMode,
    } = this.options

    this.queueName = moduleName
    this.responseQueueName = `${moduleName}Response-${this.utils.newId()}`

    const deadLetterQueueName = `${moduleName}-DLQ`

    const connection = amqp.connect([amqpConnectionString])

    this.channel = connection.createChannel({
      setup: async (x: ConfirmChannel) => {
        await Promise.all([
          // Hub Exchange
          x.assertExchange(publishExchangeName, 'topic', {
            durable: true,
            autoDelete: isTestMode ? false : false,
          }),

          // Queues
          x.assertQueue(this.queueName, {
            durable: true,
            exclusive: isTestMode ? false : undefined,
          }),

          // Response queue
          x.assertQueue(this.responseQueueName, {
            durable: true,
            exclusive: isTestMode ? false : true,
          }),

          // Dead letter queue
          x.assertQueue(deadLetterQueueName, {
            durable: true,
            exclusive: isTestMode ? false : undefined,
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
          } catch (err) {
            await this.channel.sendToQueue(
              deadLetterQueueName,
              msg.content,
              {
                correlationId,
                headers: metadata,
                replyTo,
                CC: route,
              },
            )
          }

          x.ack(msg)
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

    await this.channel.waitForConnect()
  }

  async start() {
    const routes = this.getRegisteredRoutes()
    const prefixes = this.getRegisteredPrefixes()

    const patterns = prefixes.map(x => `${x}#`).concat(routes)

    this.bindingSetup = (x: ConfirmChannel) =>
      Promise.all(
        patterns.map(pattern =>
          x.bindQueue(
            this.queueName,
            this.options.publishExchangeName,
            pattern,
          ),
        ),
      )

    await this.channel.addSetup(this.bindingSetup)

    await super.start()
  }

  async stop() {
    await this.channel.removeSetup(this.bindingSetup)

    await super.stop()
  }

  async dispose() {
    await super.dispose()

    await this.channel.close()
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

    await this.channel.sendToQueue(replyTo, Buffer.from(message), {
      correlationId,
      headers: metadata,
    })
  }

  protected async sendErrorReplyMessage(
    props: SendErrorReplyMessageProps,
  ) {
    const { replyTo, correlationId, error, metadata } = props

    await this.channel.sendToQueue(
      replyTo,
      Buffer.from(JSON.stringify(normalizeError(error))),
      {
        type: 'error',
        correlationId,
        headers: metadata,
      },
    )
  }
}
