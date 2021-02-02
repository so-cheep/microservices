import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppNatsTransportModule } from './app/app.nats-transport.module'

async function bootstrap() {
  const app = await NestFactory.create(AppNatsTransportModule)
  await app.listen(3000)
  const url = await app.getUrl()
  new Logger('startup', true).log(`Example running at ${url}`)
}
bootstrap()
