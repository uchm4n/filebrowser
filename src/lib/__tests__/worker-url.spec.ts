import { describe, expect, it } from 'vitest'
import { sameOriginPath } from '../worker-url'

// Dropping this line does not break PDF rendering — pdf.js falls back to a
// main-thread worker that still draws pages, just slowly and CPU-bound, with
// only a console error to show for it. Hence the test.
describe('sameOriginPath', () => {
  it('strips the insecure dev origin Vite emits for ?url imports', () => {
    expect(
      sameOriginPath('http://filebrowser.test:5173/node_modules/pdfjs-dist/build/pdf.worker.mjs'),
    ).toBe('/node_modules/pdfjs-dist/build/pdf.worker.mjs')
  })

  it('leaves a production root-relative path unchanged', () => {
    expect(sameOriginPath('/assets/pdf.worker-PhvoOpM7.mjs')).toBe(
      '/assets/pdf.worker-PhvoOpM7.mjs',
    )
  })

  it('drops the scheme and port but keeps an https path intact', () => {
    expect(sameOriginPath('https://filebrowser.test/a/b.mjs')).toBe('/a/b.mjs')
  })
})
