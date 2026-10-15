import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import type { Entry } from '@/stores/library'
import { useAuthStore } from '@/stores/auth'
import { useLibraryStore } from '@/stores/library'

const listDirectory = vi.hoisted(() =>
  vi.fn<() => Promise<Record<string, unknown>>>(async () => ({
    name: 'root',
    path: '/',
    source: 'u_disk',
    size: 0,
    created: '2026-01-01T00:00:00Z',
    modified: '2026-01-01T00:00:00Z',
    type: 'directory',
    hidden: false,
    hasPreview: false,
    folders: [
      {
        name: 'Books',
        size: 0,
        created: '2026-01-01T00:00:00Z',
        modified: '2026-01-01T00:00:00Z',
        type: 'directory',
        hidden: false,
        hasPreview: false,
      },
    ],
    files: [
      {
        name: 'clip.mp4',
        size: 10,
        created: '2026-01-01T00:00:00Z',
        modified: '2026-01-01T00:00:00Z',
        type: 'video/mp4',
        hidden: false,
        hasPreview: true,
        viewToken: 'vt-1',
      },
    ],
  })),
)
const fetchProfile = vi.hoisted(() =>
  vi.fn<() => Promise<Record<string, unknown>>>(async () => ({
    username: 'u',
    scopes: [{ name: 'u_disk', scope: '/' }],
  })),
)

vi.mock('@/api/resources', () => ({ listDirectory }))
vi.mock('@/api/users', () => ({ fetchProfile }))

import FilesView from '../FilesView.vue'

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    path: '/Books',
    name: 'Books',
    kind: 'folder',
    type: 'directory',
    size: 0,
    modified: '2026-01-01T00:00:00Z',
    at: 1,
    ...overrides,
  }
}

/** useStorage reads localStorage asynchronously; seed only after it lands. */
async function seedStarred(value: Record<string, Entry>) {
  const library = useLibraryStore()
  await nextTick()
  library.starred = value
  // Let the store's init() finish loading the root listing before any click.
  await flushPromises()
}

describe('FilesView collections', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    useAuthStore().token = 'test-token'
    vi.clearAllMocks()
  })

  async function mountStarred() {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: AppLayout, children: [{ path: '', component: FilesView }] },
        {
          path: '/starred',
          component: AppLayout,
          children: [{ path: '', component: FilesView, props: { collection: 'starred' } }],
        },
      ],
    })
    router.push('/starred')
    // RouterView renders nothing until the first navigation resolves.
    await router.isReady()
    const wrapper = mount(AppLayout, { global: { plugins: [router] } })
    await nextTick()
    return wrapper
  }

  // A folder has no preview, and a collection screen renders a list with no
  // tree — so without this the click looks like it did nothing at all.
  it('takes a starred folder back to the tree where it can be revealed', async () => {
    const wrapper = await mountStarred()
    await seedStarred({ '/Books': entry() })

    await wrapper.get('[data-testid="row"]').trigger('click')
    await flushPromises()

    expect(wrapper.vm.$route.path).toBe('/')
    expect(wrapper.findAll('[role="treeitem"]').length).toBeGreaterThan(0)
  })

  // A file previews where it stands; navigating away would throw that away.
  it('previews a starred file in place without leaving the screen', async () => {
    const wrapper = await mountStarred()
    await seedStarred({
      '/clip.mp4': entry({ kind: 'file', type: 'video/mp4', path: '/clip.mp4', name: 'clip.mp4' }),
    })

    await wrapper.get('[data-testid="row"]').trigger('click')
    await flushPromises()

    expect(wrapper.vm.$route.path).toBe('/starred')
  })
})