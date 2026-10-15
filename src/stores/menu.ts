import { ref } from 'vue'
import type { Component } from 'vue'
import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { Clock, Folder, Settings, Star } from '@lucide/vue'

export interface MenuItem {
  id: string
  label: string
  icon: Component
  /**
   * Route path. Every item ships with one: a disabled entry is a promise the
   * feature does not keep.
   */
  to?: string
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'files', label: 'Files', icon: Folder, to: '/' },
  { id: 'recent', label: 'Recent', icon: Clock, to: '/recent' },
  { id: 'starred', label: 'Starred', icon: Star, to: '/starred' },
  { id: 'settings', label: 'Settings', icon: Settings, to: '/settings' },
]

export const useMenuStore = defineStore('menu', () => {
  /** Desktop only: the sidebar has collapsed to a 4rem icon rail. Remembered. */
  const collapsed = useStorage('filebrowser.collapsed', false)

  /** Mobile only: the sidebar is an off-canvas drawer. Never remembered: a
   * phone that loads the app with the drawer already open looks broken. */
  const drawerOpen = ref(false)

  function toggleCollapsed() {
    collapsed.value = !collapsed.value
  }

  function openDrawer() {
    drawerOpen.value = true
  }

  function closeDrawer() {
    drawerOpen.value = false
  }

  return { items: MENU_ITEMS, collapsed, drawerOpen, toggleCollapsed, openDrawer, closeDrawer }
})
