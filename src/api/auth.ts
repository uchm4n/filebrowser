import { request } from './client'

export interface AuthSession {
  token: string
}

export interface Credentials {
  username: string
  password: string
}

/**
 * Contract verified against https://files.nuc.ge/swagger/doc.json:
 *
 *   POST /api/auth/login?username=<user>
 *   X-Password: <url-encoded password>
 *   <empty body>
 *
 * A 200 answers with a bare JWT string, not a JSON object. The password goes
 * in a header (URL-encoded) specifically so characters like ^ % £ € survive.
 */
export async function login(creds: Credentials): Promise<AuthSession> {
  const token = await request<string>(
    'POST',
    `/auth/login?username=${encodeURIComponent(creds.username)}`,
    {
      parse: 'text',
      headers: { 'X-Password': encodeURIComponent(creds.password) },
    },
  )

  const value = token.trim()
  if (!value) throw new Error('Login succeeded but the API returned an empty token')

  return { token: value }
}

/**
 * Renew exists (POST /api/auth/renew) and the JWT lives 2 hours
 * (exp - iat = 7200). Not wired up yet: expiry handling needs its own change.
 */
export async function renew(token: string): Promise<AuthSession> {
  const renewed = await request<string>('POST', '/auth/renew', { parse: 'text', token })
  return { token: renewed.trim() }
}

/**
 * Sign-out is client-side only. POST /auth/logout exists; its revocation
 * semantics are unverified, so we do not call it.
 */
export async function logout(): Promise<void> {}
