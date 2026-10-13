import {fileURLToPath, URL} from 'node:url'
import {defineConfig, loadEnv} from 'vite'
import type {ProxyOptions} from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

const API = 'https://files.nuc.ge'

/**
 * A <video src> cannot send an Authorization header, and /api/media/stream
 * rejects requests without one. So the proxy injects it on the way out and the
 * 2-hour JWT never appears in a URL or an access log.
 *
 * The token is minted at startup from the .env credentials so it cannot go
 * stale — a static token would silently break playback two hours later.
 *
 * ponytail: one fixed token, so media is fetched as that identity rather than
 * whoever is logged into the SPA. Fine for a single-user install; move to a
 * per-request cookie if a second user ever signs in.
 */
async function mintMediaToken(mode: string): Promise<string | null> {
  const env = loadEnv(mode, process.cwd(), '')
  const username = env.VITE_DEV_USERNAME
  if (!username) return null

  try {
    const res = await fetch(
      `${API}/api/auth/login?username=${encodeURIComponent(username)}`,
      {
        method: 'POST',
        headers: {'X-Password': encodeURIComponent(env.VITE_DEV_PASSWORD ?? '')},
      },
    )
    if (!res.ok) {
      console.warn(`[proxy] media token: API returned ${res.status}`)
      return null
    }
    return (await res.text()).trim()
  } catch (err) {
    console.warn(`[proxy] media token: ${(err as Error).message}`)
    return null
  }
}

/**
 * Reads the CURRENT token on every request rather than capturing one, so the
 * interval below can swap it out without re-registering the proxy.
 */
function rewriteRequest(getToken: () => string | null): ProxyOptions['configure'] {
  return (proxy) => {
    proxy.on('proxyReq', (proxyReq) => {
      // The API has no CORS support; make the request look server-to-server.
      proxyReq.removeHeader('origin')
      proxyReq.removeHeader('referer')
      const token = getToken()
      if (token) proxyReq.setHeader('authorization', `Bearer ${token}`)
    })
  }
}

// The token TTL is 120 minutes. Refreshing at 50 leaves ~70 minutes of margin,
// so the proxy can never hold something close to expiry — a stale token here
// kills all video silently while the SPA still looks healthy.
const MEDIA_TOKEN_REFRESH_MS = 50 * 60 * 1000

// https://vite.dev/config/
export default defineConfig(async ({command, mode}) => {
  let mediaToken = await mintMediaToken(mode)
  if (!mediaToken) {
    console.warn(
      '[proxy] no media token — video playback will 401 until VITE_DEV_USERNAME is set in .env',
    )
  }

  // serve-only, and unref'd: `vite build` and vitest both load this config, and
  // a live timer would hold either process open.
  if (command === 'serve') {
    setInterval(async () => {
      const next = await mintMediaToken(mode)
      if (next) mediaToken = next
    }, MEDIA_TOKEN_REFRESH_MS).unref()
  }

  return {
    plugins: [
      vue(),
      tailwindcss(),
      vueDevTools(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      // Respond to all network requests
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      // Point the asset origin back to Lerd's project domain
      origin: 'http://filebrowser.test:5173',
      hmr: {
        host: 'filebrowser.test',
      },
      // The API sends no CORS headers, so the SPA talks to a same-origin /api/* path.
      // Same shape in dev and prod; swap to an absolute URL only if the API grows CORS.
      proxy: {
        '/api': {
          target: API,
          changeOrigin: true,
          configure: rewriteRequest(() => mediaToken),
        },
      },
    },
  }
})