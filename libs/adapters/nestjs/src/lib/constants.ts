import { CheepMicroservicesRootConfig } from './types'

export const TransportToken = Symbol('CheepMicroservices Transport')
export const RootConfigToken = Symbol('CheepTransport RootConfig')

export const defaultRootConfig = {
  executablePrefixes: ['Command', 'Query'],
  joinSymbol: '.',
} as Partial<CheepMicroservicesRootConfig>

export const ModuleConfigToken = Symbol(
  'CheepMicroservices ModuleOptions',
)

export const CheepReferrerToken = Symbol('Cheep Referrer')
