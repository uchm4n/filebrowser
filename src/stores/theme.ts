import { computed, watchEffect } from 'vue'
import { defineStore } from 'pinia'
import { usePreferredDark, useStorage } from '@vueuse/core'

export type ThemeMode = 'light' | 'dark' | 'auto'

export const useThemeStore = defineStore('theme', () => {
  const mode = useStorage<ThemeMode>('filebrowser.theme', 'auto')
  const systemDark = usePreferredDark()

  const resolved = computed(() =>
    mode.value === 'auto' ? (systemDark.value ? 'dark' : 'light') : mode.value,
  )

  // Mirrors the inline script in index.html, which resolves the same
  // expression before the bundle boots. Keep the two in step.
  watchEffect(() => document.documentElement.classList.toggle('dark', resolved.value === 'dark'))

  const setMode = (next: ThemeMode) => {
    mode.value = next
  }

  return { mode, resolved, setMode }
})