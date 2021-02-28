import { Injectable } from '@nestjs/common'

@Injectable()
export class ClientCommands {
  private theThing: number
  async doTheThing(arg: { num: number }, ref?): Promise<string> {
    return `I give you ${this.theThing}, you sent ${arg.num}`
  }

  async storeTheThing(arg: { num: number }): Promise<string> {
    this.theThing = arg.num
    return `Stored ${this.theThing}`
  }
}
