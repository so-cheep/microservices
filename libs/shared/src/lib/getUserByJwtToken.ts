import * as jwt from 'jsonwebtoken'

export function getUserByJwtToken(
  token: string,
  config: JwtTokenConfig,
) {
  try {
    const { tokenSecret: secret, tokenIssuer: issuer } = config

    const options = { issuer }
    const decoded: any = jwt.verify(token, secret, options)

    if (!decoded || !decoded['user']) {
      return null
    }

    return {
      viewerId: decoded['user']['id'],
      viewerRoles: decoded['user']['roles'] || [],
      token,
    }
  } catch (err) {
    return {
      token,
      tokenError: err,
    }
  }
}

export function getHttpToken(
  request: any,
  tokenName: string,
): string {
  const authorization = <string>request.headers['authorization']

  if (authorization) {
    const parts = authorization.split(' ')

    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      return parts[1]
    }
  }

  return getDefaultHttpToken(request, tokenName)
}

function getDefaultHttpToken(request: any, tokenName: string) {
  if (request.query && request.query.token) {
    return request.query.token
  }

  const cookie = request.headers.cookie
  if (!cookie) {
    return null
  }

  const cookieMap = cookie
    .split(';')
    .map((x: string) => {
      if (!x) {
        return null
      }

      const subItems = x.split('=')
      if (!subItems || subItems.length !== 2) {
        return null
      }

      return {
        key: subItems[0].trim(),
        value: subItems[1].trim(),
      }
    })
    .filter((x: any) => !!x)
    .reduce((r: any, x: any) => {
      r[x.key] = x.value
      return r
    }, {})

  return cookieMap[tokenName]
}

export interface JwtTokenConfig {
  tokenIssuer: string
  tokenSecret: string
}
