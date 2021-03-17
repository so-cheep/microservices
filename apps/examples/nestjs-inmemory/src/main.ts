import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app/app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: '*',
    },
  })
  await app.listen(3000)
  const url = await app.getUrl()
  new Logger('startup', true).log(`Example running at ${url}`)
}
bootstrap()
