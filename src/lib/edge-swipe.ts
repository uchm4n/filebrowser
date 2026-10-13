import type { UseSwipeDirection } from '@vueuse/core'

export type EdgeSwipeAction = 'open-drawer' | 'close-drawer' | 'back-to-tree' | null

export interface EdgeSwipeState {
  isMobile: boolean
  drawerOpen: boolean
  /** A file is selected, so the viewer owns the screen. */
  viewerOpen: boolean
}

/**
 * One horizontal swipe has three possible meanings, and which one depends on
 * what is already on screen.
 *
 * ponytail: the gesture only starts inside `edgeZone` pixels of the left edge.
 * That is deliberate — a swipe anywhere on screen would fight the PDF viewer's
 * own horizontal panning. Widen `edgeZone` if the gesture feels unreachable.
 */
export function edgeSwipeAction(
  direction: UseSwipeDirection,
  startX: number,
  state: EdgeSwipeState,
  edgeZone = 24,
): EdgeSwipeAction {
  if (!state.isMobile) return null
  if (state.drawerOpen) return direction === 'left' ? 'close-drawer' : null
  if (startX > edgeZone || direction !== 'right') return null
  return state.viewerOpen ? 'back-to-tree' : 'open-drawer'
}
