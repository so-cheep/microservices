import { PusherClientMessage } from '@nx-cqrs/pusher/api'
import { getUserByJwtToken, MessageBus } from '@nx-cqrs/shared'
import { Server } from 'http'
import { RedisClient } from 'redis'
import * as socketIO from 'socket.io'
import { createAdapter } from 'socket.io-redis'

export class PusherContextConfig {
  httpServer: Server
  tokenIssuer: string
  tokenSecret: string
  namespaces: string[]
  origins?: string | string[] | '*'
  region: string
  redisConfig?: {
    host: string
    port: number
  }
}

export class PusherContext {
  public io: socketIO.Server

  constructor(
    config: PusherContextConfig,
    private pusherMessageBus: MessageBus<PusherClientMessage>,
  ) {
    this.init(config)
  }

  init(config: PusherContextConfig) {
    const { tokenIssuer, tokenSecret, redisConfig, origins } = config

    this.io = new socketIO.Server(config.httpServer, {
      transports: ['polling', 'websocket'],
      cors: {
        origin: origins,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      cookie: {
        httpOnly: false,
      },
    })

    if (redisConfig) {
      const { host, port } = redisConfig

      const pubClient = new RedisClient({ host, port })
      const subClient = pubClient.duplicate()

      this.io.adapter(createAdapter({ pubClient, subClient }))
    }

    this.io.on(
      'connection',
      (socket: socketIO.Socket & { data: UserData }) => {
        const authTimer = setTimeout(() => disconnect(socket), 1000)

        socket.on('authentication', data => {
          clearTimeout(authTimer)

          if (!data) {
            disconnect(socket)
            return
          }

          const { appId, accessToken } = data

          if (!appId) {
            disconnect(socket)
            return
          }

          const userData = authenticate({
            accessToken,
            tokenIssuer,
            tokenSecret,
          })

          if (!userData) {
            disconnect(socket)
            return
          }

          const { userId, userRoles = [] } = userData

          socket.join([appId, userId, ...userRoles])

          socket.data = {
            appId,
            userId,
            userRoles,
            config: {},
          }

          socket.send({
            type: 'Pusher.Authenticated',
            userId,
          })

          socket.on('config', data => {
            socket.data.config = {
              ...socket.data.config,
              ...data,
            }
          })

          socket.on('message', message => {
            this.pusherMessageBus.publish(message, {
              ...socket.data.config,
              messageType: message.type,
            })
          })
        })
      },
    )
  }
}

function authenticate(props: {
  tokenIssuer: string
  tokenSecret: string
  accessToken: string
}) {
  try {
    const { tokenIssuer, tokenSecret, accessToken } = props

    if (!accessToken) {
      return null
    }

    const userData = getUserByJwtToken(accessToken, {
      tokenIssuer,
      tokenSecret,
    })
    if (!userData) {
      return null
    }

    if (userData.tokenError) {
      return null
    }

    return {
      userId: userData.viewerId,
      userRoles: userData.viewerRoles,
    }
  } catch (err) {
    return null
  }
}

function disconnect(socket: socketIO.Socket) {
  socket.send('NEED_AUTHENTICATION')
  socket.disconnect(true)
}

interface UserData {
  appId: string
  userId: string
  userRoles: string[]
  config: { [key: string]: string }
}
