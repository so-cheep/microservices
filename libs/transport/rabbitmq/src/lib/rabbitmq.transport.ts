import {
  FailedMessage,
  normalizeError,
  SendMessageProps,
  SendReplyMessageProps,
  TransportBase,
  TransportOptions,
  TransportState,
  TransportUtils,
} from '@cheep/transport/core2'
import * as amqp from 'amqp-connection-manager'
import { ConfirmChannel } from 'amqplib'

export class RabbitMQTransport extends TransportBase {
  private channel: amqp.ChannelWrapper
  private queueName: string
  private responseQueueName: string
  private deadLetterQueueName: string
  private bindingSetup: any
  private failedMessagesSetup: any
  private i = 0

  constructor(
    protected options: TransportOptions & {
      moduleName: string
      amqpConnectionString: string
      publishExchangeName: string
      isTestMode?: boolean
    },
    protected utils: TransportUtils = {
      newId: () => Date.now().toString() + (this.i++).toString(),
      jsonDecode: JSON.parse,
      jsonEncode: JSON.stringify,
    },
  ) {
    super(options, utils)
  }

  /**
   * Ensures necessary queues and exchange exists in RabbitMQ
   */
  async init() {
    const {
      moduleName,
      amqpConnectionString,
      publishExchangeName,
      isTestMode,
      failedMessagesQueueName,
    } = this.options

    this.queueName = moduleName
    this.responseQueueName = `${moduleName}-response-${this.utils.newId()}`

    this.deadLetterQueueName =
      failedMessagesQueueName || `${moduleName}-failed-messages`

    const connection = amqp.connect([amqpConnectionString])

    this.channel = connection.createChannel({
      name: moduleName,
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
          x.assertQueue(this.deadLetterQueueName, {
            durable: true,
            exclusive: isTestMode ? false : undefined,
          }),
        ])
      },
    })

    await this.channel.waitForConnect()
  }

  /**
   * Registers bindings for each route and starts listening queues
   */
  async start() {
    await super.start()

    const routes = this.getRegisteredRoutes()
    const prefixes = this.getRegisteredPrefixes()

    const patterns = prefixes
      .map(x => [x, `#`].filter(x => x).join('.'))
      .concat(routes)

    this.bindingSetup = async (x: ConfirmChannel) => {
      await Promise.all(
        patterns.map(pattern =>
          x.bindQueue(
            this.queueName,
            this.options.publishExchangeName,
            pattern,
          ),
        ),
      )

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

        try {
          await this.processMessage({
            route,
            correlationId,
            message,
            replyTo,
          })
        } catch (err: any) {
          const fullMessage = this.utils.jsonDecode(message)

          await this.channel.sendToQueue(
            this.deadLetterQueueName,
            Buffer.from(
              this.utils.jsonEncode(<any>{
                ...fullMessage,
                handlingErrorData: normalizeError(err),
              }),
            ),
            {
              correlationId,
              replyTo,
              headers: {
                route,
              },
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

        x.ack(msg)

        try {
          this.processResponseMessage({
            correlationId,
            message,
            route: msg.fields.routingKey,
          })
        } catch (err) {
          console.log('processResponseMessage.error', err)
        }
      })
    }

    await this.channel.addSetup(this.bindingSetup)
  }

  /**
   * Stops listening queues
   */
  async stop() {
    await this.channel.removeSetup(
      this.bindingSetup,
      (c: ConfirmChannel, cb) => {
        c.removeAllListeners()
        cb(null)
      },
    )

    if (this.failedMessagesSetup) {
      await this.channel.removeSetup(
        this.failedMessagesSetup,
        (c: ConfirmChannel, cb) => {
          c.removeAllListeners()
          cb(null)
        },
      )

      this.failedMessagesSetup = null
    }

    await super.stop()
  }

  /**
   * Disposes allocated resources and closes RabbitMQ connection
   */
  async dispose() {
    await super.dispose()

    await this.channel.close()
  }

  async subscribeFailedMessages(
    action: (failedMessage: FailedMessage) => Promise<void> | void,
  ) {
    this.failedMessagesSetup = async (x: ConfirmChannel) => {
      x.consume(this.options.failedMessagesQueueName, async msg => {
        if (!msg) {
          return
        }

        const route = msg.properties?.headers?.route
        const correlationId = msg.properties.correlationId
        const replyTo = msg.properties.replyTo

        const messageString = msg.content
          ? msg.content.toString()
          : null

        // try to parse it as a JSON
        let message

        if (messageString) {
          try {
            message = JSON.parse(messageString)
          } catch (err) {
            /**/
          }
        }

        try {
          await action({
            route,
            correlationId,
            replyTo,
            message,
          })

          x.ack(msg)
        } catch (err) {
          console.log('Error on processing failled message', err)
        }
      })
    }

    await this.channel.addSetup(this.failedMessagesSetup)
  }

  protected async sendMessage(props: SendMessageProps) {
    const { route, message, correlationId, isRpc } = props

    await this.channel.publish(
      this.options.publishExchangeName,
      route,
      Buffer.from(message),
      {
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
    const { replyTo, correlationId, message } = props

    await this.channel.sendToQueue(replyTo, Buffer.from(message), {
      correlationId,
    })
  }

  protected onRouteHandlerAdd(route: string) {
    if (this.state !== TransportState.STARTED) {
      return
    }
  }

  protected onRouteHandlerRemove(route: string) {
    if (this.state !== TransportState.STARTED) {
      return
    }
  }
}
