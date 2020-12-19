import { PusherCommand } from '@nx-cqrs/pusher/api'
import { Props } from '@nx-cqrs/shared'
import { PusherContext } from './pusher.context'

export class PusherCommandImpl implements PusherCommand {
  constructor(private ctx: PusherContext) {}

  async sendToSocket(
    props: Props<PusherCommand['sendToSocket']>,
  ): ReturnType<PusherCommand['sendToSocket']> {
    const { socketId, message } = props

    this.ctx.io.to(socketId).send(message)
  }

  async sentToChannel(
    props: Props<PusherCommand['sentToChannel']>,
  ): ReturnType<PusherCommand['sentToChannel']> {
    const { channel, message } = props

    this.ctx.io.to(channel).send(message)
  }

  async sendToEveryone(
    props: Props<PusherCommand['sendToEveryone']>,
  ): ReturnType<PusherCommand['sendToEveryone']> {
    const { message } = props

    this.ctx.io.send(message)
  }

  async joinChannels(
    props: Props<PusherCommand['joinChannels']>,
  ): ReturnType<PusherCommand['joinChannels']> {
    const { socketId, channels } = props

    this.ctx.io.of('/').sockets.get(socketId).join(channels)
  }

  async leaveChannels(
    props: Props<PusherCommand['leaveChannels']>,
  ): ReturnType<PusherCommand['leaveChannels']> {
    const { socketId, channels } = props

    const socket = this.ctx.io.of('/').sockets.get(socketId)
    if (socket) {
      channels.forEach(channel => socket.leave(channel))
    }
  }
}
