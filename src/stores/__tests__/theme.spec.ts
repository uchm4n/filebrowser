import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

// jsdom implements no matchMedia, so useMediaQuery reports light and the auto
// path could never be exercised. Only the reporter is faked; useStorage stays
// real so persistence is still under test.
const systemDark = ref(false)
vi.mock('@vueuse/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@vueuse/core')>()),
  usePreferredDark: () => systemDark,
}))

import { useThemeStore } from '../theme'

describe('theme store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    systemDark.value = false
  })

  it('adds the class for dark and removes it for light', async () => {
    const store = useThemeStore()

    store.setMode('dark')
    await nextTick()
    expect(store.resolved).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    store.setMode('light')
    await nextTick()
    expect(store.resolved).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('follows the system when the mode is auto', async () => {
    const store = useThemeStore()
    systemDark.value = true
    await nextTick()

    expect(store.resolved).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    systemDark.value = false
    await nextTick()
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('remembers the mode across store instances', async () => {
    useThemeStore().setMode('dark')
    await nextTick()

    setActivePinia(createPinia())
    const store = useThemeStore()
    await nextTick()

    expect(store.mode).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})