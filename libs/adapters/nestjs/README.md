# @cheep/nestjs

An adapter to use the @cheep/microservices library in the NestJS framework.

# Transport Module (once per application)

Import `CheepTransportModule.forRoot()` in a top-level module, **once** per application/microservice. This establishes the primary transport for all feature modules in this process.

```ts
import {
  CheepTransportModule,
  NestTransportUtils,
} from '@cheep/nestjs'
// ... more imports!

@Module({
  imports: [
    CheepTransportModule.forRoot({
      // MemoryTransport is included by default in @cheep/transport,
      // others are also available!
      transport: new MemoryTransport(
        {
          // optional metadata config goes here
        },
        // this is the set of external plugins / functional callbacks cheep will utilise
        // we provide a default object for your convenience, but you can override it
        NestTransportUtils,
      ),
    }),
    /* ...other imports, providers, etc. */
  ],
})
export class AppModule {}
```

# Feature module

## Declare the exposed API

First, create some services which you would like to expose functions from
(UserCommandService and UserQueryService, in this example)
then delcare your API in pure Typescript (this file will disappear after compilation)

```ts
// user.api.ts
/**
 * *NOTE* use of import type - the api definition file should never
 * import anything other than types.
 *
 * UserQueryService and UserCommandService are normal
 * NestJS Injectable services
 */
import type { UserCommandService } from './user.command.service'
import type { UserQueryService } from './user.query.service'

/**
 * UserApi
 * a declarative type of the public api of this module,
 * consumed by other modules and used to ensure all handlers
 * are adequately provided in this module
 */
export type UserApi = ApiWithExecutableKeys<
  // this is the shape of the api itself, can be either imported classes
  // or function definitions
  {
    Query: {
      User: UserQueryService //<-- This must be an @Injectable() decorated class!
    }
    Command: {
      User: UserCommandService
    }
    Event: {
      created: (user: User) => void
    }
  },
  // this is a union of the top level keys from the object which can be "executed",
  // meaning they can be awaited for a response
  'Query' | 'Command'
>

/**
 * UserRemoteApi
 * an intersection type of the api types that are consumed by this module
 * it's helpful to use import(...) syntax here to allow tools like NX
 * to differentiate the dependencies, as these dependencies will disappear
 * after typescript compilation (keeping your bundle size small!)
 */
export type UserRemoteApi = import('../groups/group.api.ts').GroupApi & // <-- Note the use of intersection (&) here and not union (|)!
  import('../accounts/account.api.ts').AccountApi
```

## Module setup

With those types defined, import the `CheepMicroservicesModule.forModule` in your module

```ts
// user.module.ts

@Module({
  imports: [
    // call for module with this module's api, and the remote api union to be consumed
    CheepMicroservicesModule.forModule<UserApi, UserRemoteApi>({
      // this registers your services as handlers of the various API routes available from
      // the intersection of remote and local api types
      handlers:{
        Query: {
          User: UserQueryService
        },
        Command:{
          User: UserCommandService
        }
      }
      // for any events which will be subscribed with observables, include them in this
      // map by setting them to true; you can set specific routes, or whole subtrees
      listenEventsFrom: {
        Event:{
          Group: true
        }
      },
    }),
    /* ...other providers */
  ],
  // be sure to also provide the query and command handler services to Nest!
  providers: [UserQueryService, UserCommandService],
})
export class UserModule {}
```

# Usage

Once the setup is complete, you may consume the exported services from `CheepMicroservicesModule.forModule` using `CheepApi` in other modules

## CheepApi

The CheepApi is for executing queries or commands on remote modules, such as from
a gateway controller which is not in the same module/microservice.

Usage of the API is transparent, and has instant type safety to changes in the
remote module.

```ts
// gateway.controller.ts

@Controller()
export class GatewayService implements OnApplicationBootstrap {
  constructor(
    // ConsumedApis is an intersection type = UserApi & GroupApi
    private api: CheepApi<ConsumedApis>,
  ) {}

  @Get('users')
  async getUsers() {
    // calling a query
    return this.api.execute.Query.User.getAll()
  }

  @Get('user/create')
  async createUser() {
    // calling commands
    const id = await this.api.execute.Command.User.create({
      user: {
        email: faker.internet.email(),
        name: faker.name.findName(),
      },
    })

    return this.api.execute.Query.User.getById({ id })
  }

  @Get('groups')
  async getGroups() {
    // the query object has keys for each unique namespace
    return this.api.execute.Query.Group.getAll()
  }

  @Get('group/create')
  async createGroup() {
    // the command object has keys for each unique namespace
    const id = await this.api.execute.Command.Group.create({
      group: {
        name: faker.commerce.department(),
        color: faker.random.arrayElement(['red', 'blue']),
      },
    })

    return this.api.execute.Query.Group.getById({ id })
  }

  /**
   * This is to show that *private* members of remote apis may still be
   * called without type safety, just like private functions in JS at runtime
   *
   */
  @Get('test')
  async test() {
    return await this.api.execute.Command.User['thisIsPrivate']() // will be *any*
  }
}
```
