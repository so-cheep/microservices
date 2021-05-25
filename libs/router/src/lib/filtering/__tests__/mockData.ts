import { BROADCAST } from '../constants'
import type { OutboundRouterFilter } from '../types'

type FilterTestApi = {
  Abs: {
    false: () => void
    true: () => void
    meta: () => void
    broadcast: () => void
    other: () => void
    nested: {
      deeper: () => void
    }
  }
  Short: {
    But: {
      Much: {
        Deeper: {
          path: () => void
        }
        Alternate: {
          Route: {
            Deeper: () => void
          }
        }
      }
    }
  }
  ShallowButLong: {
    pathName: () => void
  }
}

export const filterTestMap: OutboundRouterFilter<
  FilterTestApi,
  { clientId: string }
> = {
  '': () => false,
  Abs: {
    '': () => true,
    false: () => false,
    true: () => true,
    meta: () => ({ clientId: 'id' }),
    broadcast: () => BROADCAST,
  },
  Short: {
    But: {
      Much: {
        Deeper: {
          '': () => false,
          path: () => BROADCAST,
        },
      },
    },
  },
  ShallowButLong: {
    pathName: () => BROADCAST,
  },
}
