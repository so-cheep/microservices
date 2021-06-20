import {
  CallStackMetadata,
  CreatedAtMetadata,
  TransactionMetadata,
} from '@cheep/transport/core2'

export type AppMetadata = CallStackMetadata &
  TransactionMetadata &
  CreatedAtMetadata
