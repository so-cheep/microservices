import {
  CallStackMetadata,
  CreatedAtMetadata,
  TransactionMetadata,
} from '@cheep/transport'

export type AppMetadata = CallStackMetadata &
  TransactionMetadata &
  CreatedAtMetadata
