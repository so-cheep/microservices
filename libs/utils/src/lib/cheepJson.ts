/* eslint-disable no-fallthrough */

export const transformKeys = {
  Date: '#DATE',
}

/*

encodes dates from this:
{
	myDate: Date(...)
}

to this:
{
	myDate: {
		'#DATE': '0000-00-00T00:00:00.000Z'
	}
}

*/

/**
 * get an object with `parse` and `stringify` functions, with special encoding provided for useful RPC types
 *
 * Currently handles:
 *  - `Date`
 *
 * @param altJson an alternative json implementation (i.e. flatted)
 * @returns
 */
export function cheepJson(
  altJson: Pick<typeof JSON, 'parse' | 'stringify'> = JSON,
) {
  return {
    stringify(value: any, __?: any, spaces = 0): string {
      return altJson.stringify(
        value,
        (_, x) => {
          switch (typeof x) {
            // remove functions!
            case 'function':
              return undefined
            case 'object': {
              // need to swap out dates before we reach their specific key-values, as they get stringified upstream of this callback
              return Object.fromEntries(
                Object.entries(x).map(([k, v]) => {
                  switch (typeof v) {
                    case 'function':
                      return [k, undefined]
                    case 'object': {
                      // detect date
                      if (
                        Object.prototype.toString.call(v) ===
                        '[object Date]'
                      ) {
                        return [
                          k,
                          {
                            [transformKeys.Date]: (v as Date).toISOString(),
                          },
                        ]
                      }
                      // allowing fallthrough intentionally here!
                    }
                    default:
                      return [k, v]
                  }
                }),
              )

              // allowing fallthrough intentionally here!
            }
            default:
              return x
          }
        },
        spaces,
      )
    },

    parse<T>(value: string): T {
      return altJson.parse(value, (k, v) => {
        switch (typeof v) {
          case 'object': {
            // detect keys of the object
            switch (Object.keys(v).shift()) {
              case transformKeys.Date:
                return new Date(v[transformKeys.Date])
              // allowing fallthrough intentionally here!
            }
            // allowing fallthrough intentionally here!
          }
          default:
            return v
        }
      })
    },
  }
}
