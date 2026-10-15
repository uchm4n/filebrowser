import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import type { Entry } from '@/stores/library'
import { useLibraryStore } from '@/stores/library'
import { useMenuStore } from '@/stores/menu'
import { useThemeStore } from '@/stores/theme'
import SettingsView from '../SettingsView.vue'

function entry(path: string): Entry {
  return {
    path,
    name: path.slice(1),
    kind: 'file',
    type: 'application/pdf',
    size: 10,
    modified: '2026-01-01T00:00:00Z',
    at: 1,
  }
}

function render() {
  setActivePinia(createPinia())
  return mount(SettingsView)
}

describe('SettingsView', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    vi.restoreAllMocks()
  })

  it('switches the theme and writes the key', async () => {
    const wrapper = render()

    await wrapper.get('[data-testid="theme-dark"]').trigger('click')
    await nextTick()

    expect(useThemeStore().mode).toBe('dark')
    // A bare string, not JSON: index.html's inline script reads this key before
    // the bundle loads and must not JSON.parse it.
    expect(localStorage.getItem('filebrowser.theme')).toBe('dark')
  })

  it('remembers the collapsed sidebar', async () => {
    const wrapper = render()

    await wrapper.get('#collapse-sidebar').setValue(true)
    await nextTick()

    expect(useMenuStore().collapsed).toBe(true)
    expect(localStorage.getItem('filebrowser.collapsed')).toBe('true')
  })

  it('clears recents and stars', async () => {
    const wrapper = render()
    // Seeded after render: render() installs a fresh Pinia, so a store built
    // before it is a different instance.
    const library = useLibraryStore()
    library.recent = [entry('/a.pdf')]
    library.starred = { '/b.pdf': entry('/b.pdf') }
    await nextTick()

    await wrapper.get('[data-testid="clear-recent"]').trigger('click')
    await wrapper.get('[data-testid="clear-starred"]').trigger('click')

    expect(library.recent).toEqual([])
    expect(library.starredList).toEqual([])
  })
})