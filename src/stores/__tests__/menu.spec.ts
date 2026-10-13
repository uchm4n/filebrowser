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
})
