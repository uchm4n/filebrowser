import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, onSessionExpired, request } from '../client'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response
}

function textResponse(body: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    text: () => Promise.resolve(body),
  } as unknown as Response
}

describe('request', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // Reset the registered handler so cases cannot leak into each other.
    onSessionExpired(() => {})
  })

  it('throws ApiError with the status on a 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ status: 401, message: 'user unauthorized' }, 401)),
    )

    await expect(request('POST', '/auth/login')).rejects.toThrowError(ApiError)
    await expect(request('POST', '/auth/login')).rejects.toMatchObject({
      status: 401,
      message: 'user unauthorized',
    })
  })

  it('resolves to the parsed body on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ token: 'abc123' })))

    await expect(request('POST', '/auth/login')).resolves.toEqual({ token: 'abc123' })
  })

  it('throws ApiError rather than crashing on an unparseable body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve('<html>not json</html>'),
      } as unknown as Response),
    )

    await expect(request('GET', '/resources')).rejects.toThrowError(ApiError)
  })

  it('reports status 0 when the server is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const err = await request('GET', '/resources').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(0)
  })

  it('prefixes /api and attaches the bearer token when given one', async () => {
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>()
    fetchMock.mockResolvedValue(jsonResponse({}))
    vi.stubGlobal('fetch', fetchMock)

    await request('GET', '/resources', { token: 'secret-token' })

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('/api/resources')
    const headers = (init?.headers ?? {}) as Record<string, string>
    expect(headers.Authorization).toBe('Bearer secret-token')
  })

  // /api/auth/login answers with a bare JWT, which is not valid JSON. Without
  // parse: 'text' this is reported as "cannot reach the server".
  it('returns a non-JSON body verbatim in text mode', async () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJGaWxlQnJvd3NlciJ9.sig'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(textResponse(jwt)))

    await expect(request('POST', '/auth/login', { parse: 'text' })).resolves.toBe(jwt)
  })

  it('still reports a non-JSON body as unreachable in json mode', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(textResponse('eyJhbGciOiJIUzI1NiJ9.x.y')))

    await expect(request('GET', '/resources')).rejects.toThrowError(ApiError)
  })

  it('sends caller-supplied headers alongside the auth header', async () => {
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>()
    fetchMock.mockResolvedValue(textResponse('token'))
    vi.stubGlobal('fetch', fetchMock)

    await request('POST', '/auth/login', {
      parse: 'text',
      token: 'bearer-token',
      headers: { 'X-Password': 'Pa%24%24w0rd' },
    })

    const [, init] = fetchMock.mock.calls[0] ?? []
    const headers = (init?.headers ?? {}) as Record<string, string>
    expect(headers.Authorization).toBe('Bearer bearer-token')
    expect(headers['X-Password']).toBe('Pa%24%24w0rd')
  })
})

describe('session expiry', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // A token that no longer works can never recover: POST /auth/renew returns the
  // byte-identical token (expiry never moves) and rejects already-expired ones.
  // So an expired session must end, not retry.
  it('notifies when the server rejects a request that carried a token', async () => {
    const expired = vi.fn<() => void>()
    onSessionExpired(expired)
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ status: 401, message: 'invalid token: token is expired by 3h17m' }, 401),
        ),
    )

    await expect(request('GET', '/users', { token: 'dead-token' })).rejects.toThrowError(ApiError)

    expect(expired).toHaveBeenCalledOnce()
  })

  // Login also answers 401 ("user unauthorized"). Tearing the session down there
  // would be wrong — it is the login form reporting a bad password.
  it('does not notify when the request carried no token', async () => {
    const expired = vi.fn<() => void>()
    onSessionExpired(expired)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ status: 401, message: 'user unauthorized' }, 401)),
    )

    await expect(request('POST', '/auth/login')).rejects.toThrowError(ApiError)

    expect(expired).not.toHaveBeenCalled()
  })

  it('does not notify on a non-401 failure', async () => {
    const expired = vi.fn<() => void>()
    onSessionExpired(expired)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ status: 403, message: 'Forbidden' }, 403)),
    )

    await expect(request('GET', '/resources', { token: 'live-token' })).rejects.toThrowError(
      ApiError,
    )

    expect(expired).not.toHaveBeenCalled()
  })
})
