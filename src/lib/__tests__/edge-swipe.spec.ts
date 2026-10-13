import { describe, expect, it } from 'vitest'
import { edgeSwipeAction } from '../edge-swipe'

const closed = { isMobile: true, drawerOpen: false, viewerOpen: false }

describe('edgeSwipeAction', () => {
  it('does nothing on desktop', () => {
    expect(edgeSwipeAction('right', 0, { ...closed, isMobile: false })).toBeNull()
  })

  it('opens the drawer on a right swipe from the left edge', () => {
    expect(edgeSwipeAction('right', 12, closed)).toBe('open-drawer')
  })

  it('ignores a right swipe that starts away from the edge', () => {
    expect(edgeSwipeAction('right', 220, closed)).toBeNull()
  })

  it('closes the drawer on a left swipe from anywhere', () => {
    expect(edgeSwipeAction('left', 300, { ...closed, drawerOpen: true })).toBe('close-drawer')
  })

  it('steps back to the tree instead of opening the drawer when a file is open', () => {
    expect(edgeSwipeAction('right', 12, { ...closed, viewerOpen: true })).toBe('back-to-tree')
  })

  it('ignores vertical swipes', () => {
    expect(edgeSwipeAction('up', 12, closed)).toBeNull()
  })
})
