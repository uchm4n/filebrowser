/**
 * Contracts verified against https://files.nuc.ge/swagger/doc.json and by
 * probing the live endpoints.
 *
 * Both require the bearer token AND a source-scoped viewToken, and both answer
 * 206 with accept-ranges: bytes so the viewer can seek. Neither URL carries the
 * bearer token — Vite's dev proxy (and the production reverse proxy) inject the
 * Authorization header on the way out, so the 2-hour JWT never reaches a URL or
 * an access log.
 *
 * They are NOT interchangeable: /api/media/stream answers 403 for a PDF, and
 * /api/resources/view is the general inline-viewing endpoint.
 */

interface PreviewNode {
  path: string
  type: string
  viewToken?: string
}

function urlFor(endpoint: string, source: string, file: string, viewToken?: string) {
  const query = new URLSearchParams({ source, file })
  // Sending the literal string "undefined" would be worse than omitting it.
  if (viewToken) query.set('viewToken', viewToken)
  return `/api${endpoint}?${query}`
}

export function streamUrl(source: string, file: string, viewToken?: string): string {
  return urlFor('/media/stream', source, file, viewToken)
}

export function viewUrl(source: string, file: string, viewToken?: string): string {
  return urlFor('/resources/view', source, file, viewToken)
}

/** Media streams progressively; everything else is served as inline bytes. */
export function previewUrl(node: PreviewNode, source: string): string {
  const isMedia = node.type.startsWith('video/') || node.type.startsWith('audio/')
  return isMedia
    ? streamUrl(source, node.path, node.viewToken)
    : viewUrl(source, node.path, node.viewToken)
}
