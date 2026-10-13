import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/api/client'
import { useAuthStore } from '@/stores/auth'

type ListDirectory = (
  path: string,
  source: string,
  token: string,
) => Promise<Record<string, unknown>>

const listDirectory = vi.hoisted(() => vi.fn<ListDirectory>())
const fetchProfile = vi.hoisted(() => vi.fn<() => Promise<Record<string, unknown>>>())

vi.mock('@/api/resources', () => ({ listDirectory }))
vi.mock('@/api/users', () => ({ fetchProfile }))

import { useResourcesStore } from '../resources'

function info(overrides: Record<string, unknown> = {}) {
  return {
    name: 'root',
    path: '/',
    source: 'u_disk',
    size: 0,
    created: '2026-01-01T00:00:00Z',
    modified: '2026-01-01T00:00:00Z',
    type: 'directory',
    hidden: false,
    hasPreview: false,
    ...overrides,
  }
}

function entry(name: string, extra: Record<string, unknown> = {}) {
  return {
    name,
    size: 1,
    created: '2026-01-01T00:00:00Z',
    modified: '2026-01-01T00:00:00Z',
    type: 'application/pdf',
    hidden: false,
    hasPreview: false,
    ...extra,
  }
}

describe('resources store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
    useAuthStore().token = 'test-token'
    fetchProfile.mockResolvedValue({
      username: 'u',
      scopes: [{ name: 'u_disk', scope: '/Tutorials' }],
    })
  })

  it('reads the source from the profile rather than assuming one', async () => {
    listDirectory.mockResolvedValue(info({ folders: [], files: [] }))
    const store = useResourcesStore()

    await store.init()

    expect(store.source).toBe('u_disk')
  })

  // The API omits `files`/`folders` entirely when a directory is empty.
  it('survives a directory whose files and folders keys are absent', async () => {
    listDirectory.mockResolvedValue(info())
    const store = useResourcesStore()

    await store.init()

    expect(store.tree).toEqual([])
  })

  it('orders folders before files and puts folders ahead in the list', async () => {
    listDirectory.mockResolvedValue(
      info({ folders: [entry('Zeta', { type: 'directory' })], files: [entry('alpha.pdf')] }),
    )
    const store = useResourcesStore()

    await store.init()

    expect(store.tree.map((n) => `${n.kind}:${n.name}`)).toEqual(['folder:Zeta', 'file:alpha.pdf'])
  })

  it('builds child paths from the parent path the server returned', async () => {
    listDirectory.mockResolvedValue(
      info({ path: '/Books/', folders: [entry('Table-Books', { type: 'directory' })], files: [] }),
    )
    const store = useResourcesStore()

    await store.init()

    expect(store.tree[0]?.path).toBe('/Books/Table-Books')
  })

  it('loads a folder only when it is expanded', async () => {
    // Realistic per-path responses: each directory returns its own canonical
    // path, so children never point back at their parent.
    listDirectory.mockImplementation(async (path: string) =>
      path === '/'
        ? info({ path: '/', folders: [entry('Table-Books', { type: 'directory' })], files: [] })
        : info({ path: '/Table-Books/', name: 'Table-Books', files: [entry('deep.pdf')] }),
    )
    const store = useResourcesStore()
    await store.init()
    expect(listDirectory).toHaveBeenCalledTimes(1)

    await store.toggle('/Table-Books')

    expect(listDirectory).toHaveBeenCalledTimes(2)
    expect(store.expanded['/Table-Books']).toBe(true)
    expect(store.tree[0]?.children?.map((n) => n.name)).toEqual(['deep.pdf'])
  })

  it('does not refetch an already loaded folder when collapsed and reopened', async () => {
    listDirectory.mockImplementation(async (path: string) =>
      path === '/'
        ? info({ path: '/', folders: [entry('Table-Books', { type: 'directory' })], files: [] })
        : info({ path: '/Table-Books/', name: 'Table-Books', files: [] }),
    )
    const store = useResourcesStore()
    await store.init()

    await store.toggle('/Table-Books')
    await store.toggle('/Table-Books')
    await store.toggle('/Table-Books')

    expect(listDirectory).toHaveBeenCalledTimes(2)
  })

  // The mobile viewer needs a way back to the tree that is not a route change.
  it('clears the selection so the viewer can step back to the tree', async () => {
    listDirectory.mockResolvedValue(info({ files: [entry('deep.pdf')], folders: [] }))
    const store = useResourcesStore()
    await store.init()
    store.select(store.tree[0]!)
    expect(store.selected?.name).toBe('deep.pdf')

    store.clearSelection()

    expect(store.selected).toBeNull()
  })

  it('keeps the error on the node instead of throwing', async () => {
    listDirectory.mockResolvedValueOnce(
      info({ path: '/', folders: [entry('Locked', { type: 'directory' })], files: [] }),
    )
    const store = useResourcesStore()
    await store.init()

    listDirectory.mockRejectedValue(new ApiError('Forbidden (access denied)', 403))
    await store.toggle('/Locked')

    const node = store.tree[0]
    expect(node?.status).toBe('error')
    expect(node?.error).toBe('Forbidden (access denied)')
  })
})
