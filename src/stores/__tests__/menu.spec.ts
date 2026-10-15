import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useMenuStore } from '../menu'

describe('menu store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // The bug this store had: one flag meant both "desktop rail" and "mobile
  // drawer open", so a phone loaded the app with the drawer already open.
  it('opens neither the drawer nor the rail by default', () => {
    const store = useMenuStore()

    expect(store.drawerOpen).toBe(false)
    expect(store.collapsed).toBe(false)
  })

  it('opens and closes the drawer without touching the desktop rail', () => {
    const store = useMenuStore()
    store.toggleCollapsed()

    store.openDrawer()
    expect(store.drawerOpen).toBe(true)
    expect(store.collapsed).toBe(true)

    store.closeDrawer()
    expect(store.drawerOpen).toBe(false)
    expect(store.collapsed).toBe(true)
  })

  // A menu item with no `to` renders disabled, so a finished feature must ship
  // its route. Trash is gone: nothing here may delete a file.
  it('routes every item and has no Trash', () => {
    const { items } = useMenuStore()

    expect(items.map((i) => i.id)).toEqual(['files', 'recent', 'starred', 'settings'])
    expect(items.every((i) => typeof i.to === 'string')).toBe(true)
  })
})
