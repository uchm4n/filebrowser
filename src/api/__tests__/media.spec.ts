import { describe, expect, it } from 'vitest'
import { previewUrl, streamUrl } from '../media'

function params(url: string) {
  return Object.fromEntries(new URL(url, 'http://x').searchParams)
}

describe('streamUrl', () => {
  it('targets the proxied media endpoint', () => {
    const url = streamUrl('u_disk', '/a/b.mp4', 'vt123')

    expect(url.startsWith('/api/media/stream?')).toBe(true)
    expect(params(url)).toEqual({ source: 'u_disk', file: '/a/b.mp4', viewToken: 'vt123' })
  })

  it('never puts the bearer token in the URL — the proxy injects it', () => {
    expect(streamUrl('u_disk', '/a/b.mp4', 'vt123')).not.toContain('auth')
  })

  // Real names in this tree: "Architecture&Patterns", spaces everywhere,
  // "Евгений Паромов - Продвинутая типизация (TypeScript) (2025)".
  it('survives ampersands, spaces and non-latin characters in a path', () => {
    const name =
      '/Евгений Паромов - Продвинутая типизация (TypeScript) (2025)/Architecture&Patterns/clip.mp4'
    const url = streamUrl('u_disk', name, 'vt123')

    // The invariant that matters: the server must receive the path unchanged.
    // URLSearchParams writes spaces as "+", which is valid in a query string.
    expect(params(url).file).toBe(name)
    expect(url).toContain('%26')
  })
})

// Verified against the live API: /api/media/stream answers 403 for a PDF, while
// /api/resources/view serves any file with Range support (206, accept-ranges).
describe('previewUrl', () => {
  const node = (type: string, path = '/Books/x.pdf', viewToken = 'vt123') =>
    ({ path, type, viewToken }) as { path: string; type: string; viewToken?: string }

  it('routes media through the range-capable stream endpoint', () => {
    const url = previewUrl(node('video/mp4', '/v/clip.mp4'), 'u_disk')

    expect(url).toContain('/api/media/stream?')
    expect(params(url).file).toBe('/v/clip.mp4')
  })

  it('routes audio through the stream endpoint too', () => {
    expect(previewUrl(node('audio/mpeg', '/m/song.mp3'), 'u_disk')).toContain('/api/media/stream?')
  })

  it('routes pdf, office, text and images through the general view endpoint', () => {
    expect(previewUrl(node('application/pdf'), 'u_disk')).toContain('/api/resources/view?')
    expect(previewUrl(node('text/plain'), 'u_disk')).toContain('/api/resources/view?')
    expect(previewUrl(node('image/png'), 'u_disk')).toContain('/api/resources/view?')
    expect(previewUrl(node('application/epub+zip'), 'u_disk')).toContain('/api/resources/view?')
  })

  it('routes an unfamiliar video/* type to the stream endpoint anyway', () => {
    expect(previewUrl(node('video/x-matroska'), 'u_disk')).toContain('/api/media/stream?')
  })

  it('never puts the bearer token in the URL — the proxy injects it', () => {
    expect(previewUrl(node('application/pdf'), 'u_disk')).not.toContain('auth')
  })

  it('omits viewToken rather than sending undefined when the entry has none', () => {
    const url = previewUrl({ path: '/a.pdf', type: 'application/pdf' } as never, 'u_disk')

    expect(url).not.toContain('viewToken')
    expect(url).toContain('file=%2Fa.pdf')
  })
})
