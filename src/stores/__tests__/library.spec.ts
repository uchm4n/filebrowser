import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import type { TreeNode } from '@/stores/resources'
import { useLibraryStore } from '@/stores/library'

function node(path: string, overrides: Partial<TreeNode> = {}): TreeNode {
  const name = path.split('/').pop()!
  return {
    path,
    name,
    kind: 'file',
    type: 'application/pdf',
    size: 1024,
    modified: '2026-01-01T00:00:00Z',
    hasPreview: true,
    viewToken: 'vt',
    status: 'loaded',
    open: false,
    ...overrides,
  }
}

/**
 * `useStorage` reads localStorage asynchronously, so a mutation made in the same
 * tick as the store's creation is clobbered by that read. Real app code mutates
 * long after mount; the tests have to wait the microtask out.
 */
async function makeStore() {
  const store = useLibraryStore()
  await nextTick()
  return store
}

describe('library store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  // A leaked setItem mock would turn every later test into a quota failure.
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('moves a re-touched path to the front instead of duplicating it', async () => {
    const store = await makeStore()

    store.touch(node('/a.pdf'))
    store.touch(node('/b.pdf'))
    store.touch(node('/a.pdf'))

    expect(store.recent.map((e) => e.path)).toEqual(['/a.pdf', '/b.pdf'])
  })

  it('drops the oldest entry past fifty', async () => {
    const store = await makeStore()

    for (let i = 0; i < 51; i += 1) store.touch(node(`/f${i}.pdf`))

    expect(store.recent).toHaveLength(50)
    expect(store.recent[49]?.name).toBe('f1.pdf')
  })

  // A stored viewToken would 401 the next time the entry is opened: the API's
  // token lifetime is unknown.
  it('never persists a viewToken', async () => {
    const store = await makeStore()

    store.touch(node('/a.pdf'))
    store.toggleStar(node('/a.pdf'))

    expect(JSON.stringify(store.recent)).not.toContain('viewToken')
    expect(JSON.stringify(store.starred)).not.toContain('viewToken')
  })

  it('toggles a star off again', async () => {
    const store = await makeStore()

    store.toggleStar(node('/a.pdf'))
    expect(store.isStarred('/a.pdf')).toBe(true)

    store.toggleStar(node('/a.pdf'))
    expect(store.isStarred('/a.pdf')).toBe(false)
    expect(store.starredList).toEqual([])
  })

  it('orders stars newest first', async () => {
    const store = await makeStore()

    store.toggleStar(node('/a.pdf'))
    store.toggleStar(node('/b.pdf'))

    expect(store.starredList.map((e) => e.path)).toEqual(['/b.pdf', '/a.pdf'])
  })

  it('clears both collections', async () => {
    const store = await makeStore()

    store.touch(node('/a.pdf'))
    store.toggleStar(node('/a.pdf'))
    store.clearRecent()
    store.clearStarred()

    expect(store.recent).toEqual([])
    expect(store.starredList).toEqual([])
  })

  it('survives a localStorage that throws on write', async () => {
    // iOS private browsing and a full quota both throw from setItem. The star
    // must still work in memory.
    vi.useFakeTimers()
    const errors: unknown[] = []
    const consoleError = vi.spyOn(console, 'error').mockImplementation((e) => {
      errors.push(e)
    })
    const setItem = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const store = await makeStore()

    store.toggleStar(node('/a.pdf'))
    await nextTick()

    expect(() => vi.advanceTimersByTime(300)).not.toThrow()
    expect(store.isStarred('/a.pdf')).toBe(true)
    // Reported, never rethrown: one per storage that tried to write.
    expect(errors.length).toBeGreaterThan(0)
    expect(errors.every((e) => (e as Error).message === 'QuotaExceededError')).toBe(true)

    setItem.mockRestore()
    consoleError.mockRestore()
    vi.useRealTimers()
  })

  it('coalesces a burst of writes into one setItem', async () => {
    // Seeded so useStorage's write-the-default-on-first-read does not count.
    localStorage.setItem('filebrowser.recent', '[]')
    vi.useFakeTimers()
    const setItem = vi.spyOn(localStorage, 'setItem')
    const store = await makeStore()

    store.touch(node('/a.pdf'))
    await nextTick()
    store.touch(node('/b.pdf'))
    await nextTick()
    vi.advanceTimersByTime(300)
    await nextTick()

    const writes = setItem.mock.calls.filter(([key]) => key === 'filebrowser.recent')
    expect(writes).toHaveLength(1)
    expect(JSON.parse(writes[0]![1] as string)).toHaveLength(2)

    setItem.mockRestore()
    vi.useRealTimers()
  })
})