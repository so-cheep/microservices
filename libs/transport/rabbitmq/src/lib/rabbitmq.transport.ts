import {
  MessageMetadata,
  PublishProps,
  PublishResult,
  RpcTimeoutError,
  Transport,
  TransportItem,
} from '@nx-cqrs/transport/shared'
import * as amqp from 'amqp-connection-manager'
import { ConfirmChannel } from 'amqplib'
import { Observable, Subject } from 'rxjs'
import { filter } from 'rxjs/operators'

interface Options {
  moduleName: string
  amqpConnectionString: string
  publishExchangeName: string
  newId: () => string

  // Only for testing
  forceTempQueues?: boolean
}

export class RabbitMQTransport<TMetadata extends MessageMetadata>
  implements Transport<TMetadata> {
  moduleName: string

  private channel: amqp.ChannelWrapper
  private rpcResponseQueueName: string

  private internal$ = new Subject<
    TransportItem<TMetadata & { originModule: string }>
  >()

  private internalResponse$ = new Subject<
    TransportItem<TMetadata & { originModule: string }>
  >()

  message$: Observable<
    TransportItem<TMetadata & { originModule: string }>
  >

  constructor(private options: Options) {
    const { moduleName, newId } = options

    this.moduleName = moduleName
    this.rpcResponseQueueName = `${moduleName}Response-${newId()}`

    this.message$ = this.internal$

    this.channel = this.init(this.rpcResponseQueueName)

    this.setupSubscription()
  }

  private init(responseQueueName: string) {
    const {
      amqpConnectionString,
      publishExchangeName,
      forceTempQueues,
    } = this.options

    const connection = amqp.connect([amqpConnectionString])

    const channel = connection.createChannel({
      setup: (c: ConfirmChannel) =>
        Promise.all([
          // Hub Exchange
          c.assertExchange(publishExchangeName, 'topic', {
            durable: true,
          }),

          // Queues
          c.assertQueue(this.moduleName, {
            durable: true,
            exclusive: forceTempQueues ? true : undefined,
          }),

          // Response queue
          c.assertQueue(responseQueueName, {
            durable: true,
            exclusive: true,
          }),
        ]),
    })

    return channel
  }

  private setupSubscription() {
    const setup = (x: ConfirmChannel) => {
      x.consume(this.moduleName, msg => {
        if (!msg) {
          return
        }

        const message: string = msg.content
          ? msg.content.toString()
          : null

        const replyTo = msg.properties.replyTo
        const correlationId = msg.properties.correlationId

        const metadata = <any>msg.properties.headers

        this.internal$.next({
          message,
          route: msg.fields.routingKey,
          metadata,
          correlationId,
          complete: (isSuccess = true) => {
            if (isSuccess) {
              this.channel.ack(msg)
            } else {
              this.channel.nack(msg)
            }
          },

          sendReply: replyTo
            ? async (result, resultMetadata) =>
                this.channel.sendToQueue(
                  replyTo,
                  Buffer.from(JSON.stringify(result ?? null)),
                  {
                    correlationId,
                    headers: {
                      ...metadata,
                      ...resultMetadata,
                    },
                  },
                )
            : () => Promise.resolve(),

          sendErrorReply: replyTo
            ? async err =>
                this.channel.sendToQueue(
                  replyTo,
                  Buffer.from(
                    JSON.stringify({
                      name: err.name,
                      message: err.message,
                      stack: err.stack,
                    }),
                  ),
                  {
                    type: 'error',
                    correlationId,
                    headers: metadata,
                  },
                )
            : () => Promise.resolve(),
        })
      })

      x.consume(this.rpcResponseQueueName, msg => {
        if (!msg) {
          return
        }

        const message: string = msg.content
          ? msg.content.toString()
          : null

        const correlationId = msg.properties.correlationId
        const isError = msg.properties.type === 'error'

        x.ack(msg)

        this.internalResponse$.next({
          isError,
          message,
          route: msg.fields.routingKey,
          metadata: <any>msg.properties.headers,
          correlationId,
          complete: () => null,
          sendReply: () => Promise.resolve(),
          sendErrorReply: () => Promise.resolve(),
        })
      })
    }

    this.channel.addSetup(setup)
  }

  async publish<TMeta extends TMetadata = TMetadata>(
    props: PublishProps<TMeta>,
  ): Promise<PublishResult<TMeta> | null> {
    if (!this.channel) {
      return
    }

    const { publishExchangeName, newId } = this.options

    const { route, message, metadata, rpc } = props

    const correlationId = rpc ? newId() : undefined

    const result = rpc?.enabled
      ? new Promise<PublishResult<TMeta>>((resolve, reject) => {
          const sub = this.internalResponse$
            .pipe(filter(x => x.correlationId === correlationId))
            .subscribe(x => {
              sub.unsubscribe()
              clearTimeout(timer)

              if (x.isError) {
                const err: any = x.message
                reject(new Error(err.message))
              } else {
                resolve({
                  result: <any>x.message,
                  metadata: <any>x.metadata,
                })
              }

              x.complete()
            })

          const timer = setTimeout(() => {
            sub.unsubscribe()
            clearTimeout(timer)

            reject(new RpcTimeoutError(<any>props))
          }, rpc.timeout)
        })
      : Promise.resolve(null)

    await this.channel.publish(
      publishExchangeName,
      route,
      Buffer.from(JSON.stringify(message)),
      {
        headers: metadata,
        ...(rpc?.enabled
          ? {
              replyTo: this.rpcResponseQueueName,
              correlationId,
            }
          : null),
      },
    )

    return result
  }

  listenPatterns(patterns: string[]) {
    if (!this.channel) {
      return
    }

    if (!patterns?.length) {
      return
    }

    const rabbitMqPatterns = patterns.map(x => x + '#')

    this.channel.addSetup((c: ConfirmChannel) => {
      rabbitMqPatterns.map(patern =>
        c.bindQueue(
          this.moduleName,
          this.options.publishExchangeName,
          patern,
        ),
      )
    })
  }

  start() {
    if (this.channel) {
      return
    }
  }

  stop() {
    if (!this.channel) {
      return
    }

    this.channel.close()
    this.channel = null
  }

  dispose() {
    this.stop()
  }
}
