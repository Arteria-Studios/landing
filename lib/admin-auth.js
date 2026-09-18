import crypto from 'crypto'

const SESSION_COOKIE_NAME = 'arteria_admin_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24

const getSecret = () => {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET or ADMIN_PASSWORD must be set')
  }
  return secret
}

const base64UrlEncode = (value) => Buffer.from(value).toString('base64url')

const base64UrlDecode = (value) => Buffer.from(value, 'base64url').toString('utf8')

const sign = (value) =>
  crypto.createHmac('sha256', getSecret()).update(value).digest('base64url')

/** Constant-time string comparison, so timing does not leak how much matched. */
export const safeEqual = (a, b) => {
  const left = Buffer.from(String(a ?? ''))
  const right = Buffer.from(String(b ?? ''))
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

export const createAdminSessionToken = () => {
  const payload = JSON.stringify({
    role: 'admin',
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  })
  const encodedPayload = base64UrlEncode(payload)
  const signature = sign(encodedPayload)
  return `${encodedPayload}.${signature}`
}

export const verifyAdminSessionToken = (token) => {
  if (!token || !token.includes('.')) return false
  const [encodedPayload, signature] = token.split('.')
  if (!safeEqual(signature, sign(encodedPayload))) return false

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload))
    return payload.exp > Math.floor(Date.now() / 1000)
  } catch (error) {
    return false
  }
}

export const parseCookieHeader = (cookieHeader = '') =>
  cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const [name, ...rest] = part.split('=')
      acc[name] = rest.join('=')
      return acc
    }, {})

export const buildSessionCookie = (token) => {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secure}`
}

export const clearSessionCookie = () => {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`
}

export const getAdminSessionFromRequest = (req) => {
  const cookies = parseCookieHeader(req.headers.cookie)
  return cookies[SESSION_COOKIE_NAME]
}

export const isAdminAuthenticated = (req) =>
  verifyAdminSessionToken(getAdminSessionFromRequest(req))
