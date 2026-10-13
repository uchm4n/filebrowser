import { request } from './client'

export interface UserScope {
  /** This is the `source` every resources endpoint requires. */
  name: string
  scope: string
}

export interface UserProfile {
  username: string
  loginMethod: string
  scopes: UserScope[]
}

/**
 * `/api/users` is the only endpoint that reveals who is signed in, and the
 * only source of the `source` value the resources endpoints demand. It must
 * not be hardcoded — the value differs per account.
 */
export async function fetchProfile(token: string): Promise<UserProfile> {
  // Note: this endpoint returns an ARRAY of user records, not a bare object —
  // verified against the live API. Easy to mistake for a single object.
  const profiles = await request<UserProfile[]>('GET', '/users', { token })
  const profile = profiles[0]
  if (!profile) throw new Error('The API returned no user record')
  return profile
}
