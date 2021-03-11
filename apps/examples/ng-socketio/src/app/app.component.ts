import { Component, OnInit } from '@angular/core'
import { ClientApi, ClientRemoteApi } from '../client.api'
import { ApiService } from './api/api.service'
import { SocketService } from './socket/socket.service'
import * as faker from 'faker'
@Component({
  selector: 'cheep-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  title = 'examples-ng-socketio'
  users: unknown[]
  bannerMessage: string

  constructor(
    private readonly api: ApiService<ClientRemoteApi, ClientApi>,
    private socketService: SocketService,
  ) {}

  async ngOnInit() {
    this.users = await this.api.execute.Query.User.getAll()
    this.api.on(
      e => e.Command.Ui.showBanner,
      (_, arg) => {
        this.bannerMessage = arg.message
        return `Woo hoo!`
      },
    )
    this.api.on(
      e => e.Event.User.created,
      (_, arg) => {
        this.users = [...this.users, arg]
      },
    )

    this.api.transport.start()
  }

  async addUser() {
    await this.api.execute.Command.User.create({
      user: {
        email: faker.internet.email(),
        name: faker.internet.userName(),
      },
    })
    this.users = await this.api.execute.Query.User.getAll()
  }
}
