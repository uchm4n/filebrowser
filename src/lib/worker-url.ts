/**
 * Strips a Vite `?url` import down to its path.
 *
 * vite.config.ts sets `server.origin` to an http:// URL, so in development Vite
 * emits absolute asset URLs with that scheme. Behind an https reverse proxy the
 * worker request becomes mixed content, the browser blocks it, and pdf.js
 * silently falls back to a slow main-thread worker. Keeping only the path makes
 * the browser resolve it against whatever origin actually served the page.
 *
 * Production already emits a root-relative path, so this is a no-op there.
 */
export function sameOriginPath(url: string): string {
  // The base is only consulted when `url` is relative; absolute inputs ignore it.
  return new URL(url, 'http://localhost').pathname
}
