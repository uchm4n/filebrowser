/**
 * The single place that knows about HTTP.
 *
 * Stores and views must never call fetch directly — they go through here so that
 * the base path, auth header and error shape are defined exactly once.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }

  /** Server could not be reached at all: wrong credentials are not the cause. */
  get isNetworkError(): boolean {
    return this.status === 0
  }

  get isUnauthorized(): boolean {
    return this.status === 401
  }
}

export interface RequestOptions {
  body?: unknown
  token?: string | null
  signal?: AbortSignal
  /**
   * How to read a successful response. 'json' (default) throws ApiError(0) when
   * the body is not JSON, which catches a wrong host or an HTML error page.
   * Use 'text' for endpoints that answer with a bare string — /auth/login
   * returns a raw JWT, which JSON.parse would reject.
   */
  parse?: 'json' | 'text'
  /** Merged over the computed headers; use for endpoint-specific headers. */
  headers?: Record<string, string>
}

interface ErrorBody {
  message?: string
}

const UNREACHABLE = 'Cannot reach the server. Check your connection and try again.'

/**
 * Called when the API rejects a request that carried a token — the session is
 * gone and cannot be recovered, because POST /auth/renew returns the
 * byte-identical token (expiry never moves) and rejects already-expired ones.
 *
 * Registered rather than imported: reaching for the auth store directly would
 * make client -> stores/auth -> api/auth -> client a cycle. One handler is all
 * that is needed.
 */
let notifySessionExpired: (() => void) | null = null

export function onSessionExpired(handler: () => void): void {
  notifySessionExpired = handler
}

export async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, token, signal, parse = 'json', headers: extraHeaders } = options

  const headers: Record<string, string> = {
    ...extraHeaders,
    Accept: 'application/json',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch {
    throw new ApiError(UNREACHABLE, 0)
  }

  const raw = await res.text()

  // Errors are always JSON: {"status":401,"message":"..."}
  if (!res.ok) {
    // Only when WE sent a token. Login also answers 401 ("user
    // unauthorized") and that must not tear down the session — it is the form
    // reporting a bad password.
    if (res.status === 401 && token) notifySessionExpired?.()

    let message = res.statusText
    try {
      message = (JSON.parse(raw) as ErrorBody)?.message ?? message
    } catch {
      /* keep statusText */
    }
    throw new ApiError(message || 'Request failed', res.status)
  }

  if (parse === 'text') return raw as T

  if (!raw) throw new ApiError(UNREACHABLE, 0)
  try {
    return JSON.parse(raw) as T
  } catch {
    throw new ApiError(UNREACHABLE, 0)
  }
}
