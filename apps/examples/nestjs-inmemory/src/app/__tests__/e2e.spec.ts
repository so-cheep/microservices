import * as request from 'supertest'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AppModule } from '../app.module'
import { UserQueries } from '../modules/user/user.query.service'
import { User } from '../modules/user/user.api'
import { GroupQueries } from '../modules/groups/group.queries'
import { Group } from '../modules/groups/groups.api'

describe('example e2e test', () => {
  let app: INestApplication
  let userQuery: UserQueries
  let groupQuery: GroupQueries

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    await app.init()
    userQuery = moduleRef.get(UserQueries)
    groupQuery = moduleRef.get(GroupQueries)
  })

  it('GET /users', () => {
    return request(app.getHttpServer())
      .get('/users')
      .expect(200)
      .expect(userQuery['users'])
  })

  it('POST /user/create', async () => {
    const { body: newUser } = await request(app.getHttpServer())
      .get('/user/create')
      .expect(200)

    expect(newUser).toMatchObject(
      expect.objectContaining<User>({
        id: expect.any(Number),
        name: expect.any(String),
        email: expect.any(String),
      }),
    )

    const { body: updatedUsers } = await request(app.getHttpServer())
      .get('/users')
      .expect(200)
      .expect(userQuery['users'])

    expect(updatedUsers).toHaveLength(2)
    expect(updatedUsers).toContainEqual(newUser)
  })

  it('GET /groups', () => {
    return request(app.getHttpServer())
      .get('/groups')
      .expect(200)
      .expect(groupQuery['groups'])
  })

  it('POST /group/create', async () => {
    const { body: newgroup } = await request(app.getHttpServer())
      .get('/group/create')
      .expect(200)

    expect(newgroup).toMatchObject(
      expect.objectContaining<Group>({
        id: expect.any(Number),
        name: expect.any(String),
        color: expect.any(String),
      }),
    )

    const { body: updatedgroups } = await request(app.getHttpServer())
      .get('/groups')
      .expect(200)
      .expect(groupQuery['groups'])

    expect(updatedgroups).toHaveLength(2)
    expect(updatedgroups).toContainEqual(newgroup)
  })
})
