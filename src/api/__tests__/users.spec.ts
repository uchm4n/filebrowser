import { describe, expect, it, vi } from 'vitest'
import { fetchProfile } from '../users'

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response
}

describe('fetchProfile', () => {
  // /api/users answers with an ARRAY of user records. This shape is easy to
  // mistake for a bare object, and getting it wrong fails at runtime only.
  it('unwraps the first record from the array the API returns', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse([{ username: 'u', scopes: [{ name: 'u_disk' }] }])),
    )

    await expect(fetchProfile('tok')).resolves.toMatchObject({ username: 'u' })
  })

  it('throws rather than returning undefined when the list is empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([])))

    await expect(fetchProfile('tok')).rejects.toThrow('no user record')
  })
})
