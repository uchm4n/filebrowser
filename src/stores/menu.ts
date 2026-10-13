import { ref } from 'vue'
import type { Component } from 'vue'
import { defineStore } from 'pinia'
import { Clock, Folder, Settings, Star, Trash } from '@lucide/vue'

export interface MenuItem {
  id: string
  label: string
  icon: Component
  /**
   * Route path. Absent until the resources phase gives this item a real
   * endpoint — such items render disabled rather than linking nowhere.
   */
  to?: string
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'files', label: 'Files', icon: Folder, to: '/' },
  { id: 'recent', label: 'Recent', icon: Clock },
  { id: 'starred', label: 'Starred', icon: Star },
  { id: 'trash', label: 'Trash', icon: Trash },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export const useMenuStore = defineStore('menu', () => {
  /** Desktop only: the sidebar has collapsed to a 4rem icon rail. */
  const collapsed = ref(false)

  /** Mobile only: the sidebar is an off-canvas drawer and currently open. */
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
