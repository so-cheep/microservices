# @cheep/nestjs

An adapter to use the @cheep/microservices library in the NestJS framework.

# Setup

## App Level

Import the `CheepMicroservicesModule.forRoot` in a top-level module, **once** per application/microservice. This establishes the primary transport for all feature modules in this process.

```ts
@Module({
  imports: [
    CheepMicroservicesModule.forRoot({
      // MemoryTransport is included by default in @cheep/transport,
      // others are also available!
      transport: new MemoryTransport({ moduleName: 'App' }),
    }),
    /* ...other providers */
  ],
})
export class AppModule {}
```

## Feature module

Defines a distinct microservice API namespace.

First, delcare your API in pure Typescript

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
export type UserApi = CheepNestApi<
  // Namespace definition for this module, must be globally unique
  'User',
  // Array of Query Handlers (recommend only using *one*)
  [UserQueryService],
  // Array of Command Handlers (recommend only using *one*)
  [UserCommandService],
  // Event Map: events are addressed by their path in the object,
  // the function arguments are the payload of the event when fired
  {
    created: (user: User) => void
  }
>

/**
 * UserRemoteApi
 * a union type of the api types that are consumed by this module
 * it's helpful to use import(...) syntax here to allow tools like NX
 * to differentiate the dependencies, as these dependencies will disappear
 * after typescript compilation (keeping your bundle size small!)
 */
export type UserRemoteApi =
  | import('../groups/group.api.ts').GroupApi
  | import('../accounts/account.api.ts').AccountApi
```

With those types defined, import the `CheepMicroservicesModule.forModule` in your module

```ts
// user.module.ts

@Module({
  imports: [
    // call for module with this module's api, and the remote api union to be consumed
    CheepMicroservicesModule.forModule<UserApi, UserRemoteApi>({
      // typescript will restrict this to match your Api namespace!
      moduleName: 'User',
      // queryHandlers and commandHandlers must match the api type as well!
      queryHandlers: [UserQueryService],
      commandHandlers: [UserCommandService],
      // declare which remote api namespaces you wish to receive events from
      // helpful when you have a very noisy event layer, can improve performance
      // will be limited to namespaces of the UserRemoteApi union
      listenEventsFrom: ['Groups'],
    }),
    /* ...other providers */
  ],
  // be sure to also provide the query and command handler services to Nest!
  providers: [UserQueryService, UserCommandService],
})
export class UserModule {}
```

# Usage

Once the setup is complete, you may consume the exported services from `CheepMicroservicesModule.forModule`, specifically `CheepApi` and `CheepEvents`

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
    // ConsumedApis is a union type = UserApi | GroupApi
    private client: CheepApi<ConsumedApis>,
  ) {}

  @Get('users')
  async getUsers() {
    // calling a query
    return this.client.Query.User.getAll()
  }

  @Get('user/create')
  async createUser() {
    // calling commands
    const id = await this.client.Command.User.create({
      user: {
        email: faker.internet.email(),
        name: faker.name.findName(),
      },
    })

    return this.client.Query.User.getById({ id })
  }

  @Get('groups')
  async getGroups() {
    // the query object has keys for each unique namespace
    return this.client.Query.Group.getAll()
  }

  @Get('group/create')
  async createGroup() {
    // the command object has keys for each unique namespace
    const id = await this.client.Command.Group.create({
      group: {
        name: faker.commerce.department(),
        color: faker.random.arrayElement(['red', 'blue']),
      },
    })

    return this.client.Query.Group.getById({ id })
  }

  /**
   * This is to show that *private* members of remote apis may still be
   * called without type safety, just like private functions in JS at runtime
   *
   * If the handler doesn't exist or does not return a promise,
   * Cheep will throw an error
   */
  @Get('test')
  async test() {
    return await this.client.Command.User['thisIsPrivate']() // will be *any*
  }
}
```

## CheepEvents

```ts
// user.command.ts

@Injectable()
export class UserCommandService implements OnApplicationBootstrap {
  /**
   * CheepEvents takes two type args:
   * 1. Union of Apis of events to handle
   * 2. Api of events to publish
   */
  constructor(private events: CheepEvents<UserRemoteApi, UserApi>) {}

  onApplicationBootstrap() {
    /**
     * listen for group deleted events and update affected users
     * all Cheep services are available in ApplicationBootstrap,
     * but *not* in ModuleInit
     */
    this.events.on(
      // the return of this arrow function is the event type to handle
      e => e.Group.deleted,
      // second arg is handler, args are type safe based on the event type!
      group => {
        /**
         * some logic to do user updates here
         */
      },
    )
  }

  async create(props: { user: Omit<User, 'id'> }): Promise<number> {
    const newUser = {
      ...props.user,
      id: faker.random.number(),
    }
    // events may be published by using `CheepEvents#publish#...`
    // the shape of this object is dynamically generated in typescript,
    // and will reflect changes to remote api types instantly
    this.events.publish.User.user.created(newUser)
    return newUser.id
  }
}
```
