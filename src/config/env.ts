/**
 * Runtime configuration, read once at module evaluation and cached.
 *
 * Vite loads `.env` in the Node process during config/build and exposes only
 * `VITE_`-prefixed keys via `import.meta.env` — no dotenv package needed.
 *
 * Credentials are gated behind `import.meta.env.DEV`. Vite statically replaces
 * that flag with `false` in production builds, so this whole branch — and the
 * credential strings inside it — is dead-code-eliminated from the bundle.
 * `npm run verify:no-secrets` enforces that; nothing else fails if the guard
 * is removed.
 */

export interface DevCredentials {
  username: string
  password: string
}

const devCredentials: DevCredentials | null =
  import.meta.env.DEV && import.meta.env.VITE_DEV_USERNAME
    ? {
        username: import.meta.env.VITE_DEV_USERNAME,
        password: import.meta.env.VITE_DEV_PASSWORD,
      }
    : null

export const config = Object.freeze({ devCredentials })
