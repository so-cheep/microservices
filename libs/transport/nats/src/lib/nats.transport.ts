import {
  SendMessageProps,
  SendReplyMessageProps,
  TransportBase,
  TransportOptions,
  TransportUtils,
} from '@cheep/transport'
import { connect, NatsConnection, Subscription } from 'nats'

// TODO: support chunking large messages over the wire
// TODO: support NKey authentication
// TODO: support Certificat authentication
// TODO: implement dead letter queue

export class NatsTransport extends TransportBase {
  protected nc: NatsConnection
  protected subscriptions: Subscription[]
  protected correlationIdHeader = 'X-CHEEP-CORRELATION-ID'

  private i = 0

  constructor(
    protected options: TransportOptions & {
      moduleName: string
      /** array of urls to connect to, may optionally contain username and password or token encoded in the url */
      natsServerUrls?: string[] | string
      isTestMode?: boolean
      maxPingOut?: number

      /** optional authentication method with password */
      user?: string
      /** optional authentication method with user */
      password?: string

      /** optional authentication method */
      token?: string
    },
    protected utils: TransportUtils = {
      newId: () => Date.now().toString() + (this.i++).toString(),
      jsonDecode: JSON.parse,
      jsonEncode: JSON.stringify,
    },
  ) {
    super(options, utils)
  }

  async init(): Promise<void> {
    this.nc = await connect({
      servers: this.options.natsServerUrls,
      name: this.options.moduleName,
      maxPingOut: this.options.maxPingOut ?? 5,
      // we want to receive our own events, just in case
      noEcho: false,
      user: this.options.user,
      pass: this.options.password,
      token: this.options.token,
      reconnect: true,
    })
  }

  async start() {
    if (!this.nc || this.nc?.isClosed()) {
      await this.init()
    }
    // specific route handlers
    const routes = this.getRegisteredRoutes()
    // wildcard ending routes
    const prefixes = this.getRegisteredPrefixes()
    // everyone together!
    const patterns = prefixes
      // put the nats wildcard suffix on the prefix routes
      .map(x => `${x}.>`)
      // remove any routes that are already covered by prefixes
      // this avoids duplicate delivery
      .concat(
        routes.filter(r => !prefixes.find(p => r.startsWith(p))),
      )

    console.log(`NATS subscriptions:`, patterns)

    this.subscriptions = patterns.map(p =>
      this.nc.subscribe(p, {
        callback: async (err, msg) => {
          if (!msg) {
            return
          }

          const message: string = msg?.data?.toString() ?? null

          const route = msg.subject
          const replyTo = msg.reply

          try {
            await this.processMessage({
              route,
              correlationId: null,
              message,
              replyTo,
            })
          } catch (err) {
            // TODO: dead letter queue
            // await this.channel.sendToQueue(
            //   this.deadLetterQueueName,
            //   msg.content,
            //   {
            //     correlationId,
            //     replyTo,
            //     CC: route,
            //   },
            // )
          }

          // TODO: ack!
        },
      }),
    )

    await super.start()
  }

  async stop() {
    // ensure all messages have been sent
    await this.nc.flush()
    // ensure all messages in flight have been processed
    await this.nc.drain()

    await super.stop()
  }

  async dispose() {
    if (!this.nc.isClosed()) {
      // ensure all messages have been sent
      await this.nc.flush()
      // ensure all messages in flight have been processed
      await this.nc.drain()

      await this.nc.close()
    }

    await super.dispose()
  }

  protected async sendMessage(
    props: SendMessageProps,
  ): Promise<void> {
    if (props.isRpc) {
      const msg = await this.nc.request(
        props.route,
        Buffer.from(props.message),
        {
          timeout: this.options.defaultRpcTimeout,
        },
      )

      const message: string = msg?.data?.toString() ?? null

      this.processResponseMessage({
        correlationId: props.correlationId,
        message,
        route: msg.subject,
      })
    } else {
      this.nc.publish(props.route, Buffer.from(props.message), {})
    }
  }

  protected async sendReplyMessage(
    props: SendReplyMessageProps,
  ): Promise<void> {
    this.nc.publish(props.replyTo, Buffer.from(props.message), {})
  }
}
