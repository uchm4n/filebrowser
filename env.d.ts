/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Dev-only auto-login credentials. Gated behind import.meta.env.DEV so that
   * production builds tree-shake the branch and never contain these values.
   */
  readonly VITE_DEV_USERNAME: string
  readonly VITE_DEV_PASSWORD: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}