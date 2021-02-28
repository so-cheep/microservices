import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'

import { ClientAppModule } from './app/clientApp.module'

async function bootstrap() {
  const app = await NestFactory.create(ClientAppModule)
  await app.listen(3001)
  const url = await app.getUrl()
  new Logger('startup', true).log(`Example running at ${url}`)
}
bootstrap()
