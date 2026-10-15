import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import type { TreeNode } from '@/stores/resources'
import { useLibraryStore } from '@/stores/library'
import { useResourcesStore } from '@/stores/resources'
import FileTreeItem from '../FileTreeItem.vue'

function node(overrides: Partial<TreeNode> = {}): TreeNode {
  return {
    path: '/Books',
    name: 'Books',
    kind: 'folder',
    type: 'directory',
    size: 0,
    modified: '2026-01-01T00:00:00Z',
    hasPreview: false,
    status: 'loaded',
    open: false,
    ...overrides,
  }
}

function render(treeNode: TreeNode) {
  setActivePinia(createPinia())
  return mount(FileTreeItem, { props: { node: treeNode, depth: 0 } })
}

describe('FileTreeItem', () => {
  it('shows the star as pressed only for a starred path', async () => {
    const wrapper = render(node())
    expect(wrapper.find('[data-testid="star"]').attributes('aria-pressed')).toBe('false')

    useLibraryStore().toggleStar(node())
    await nextTick()

    expect(wrapper.find('[data-testid="star"]').attributes('aria-pressed')).toBe('true')
  })

  // The row is a button. A star button nested inside it is invalid HTML and its
  // click handler would fire too, expanding the folder.
  it('does not expand the folder when its star is tapped', async () => {
    const wrapper = render(node())

    await wrapper.find('[data-testid="star"]').trigger('click')

    expect(useLibraryStore().isStarred('/Books')).toBe(true)
    expect(useResourcesStore().expanded['/Books']).toBeUndefined()
    expect(useResourcesStore().selected).toBeNull()
  })

  // Expanding is the parent's job: the row emits intent, the store stays put.
  it('emits toggle from the row and leaves the star alone', async () => {
    const wrapper = render(node())

    await wrapper.findAll('button')[0]!.trigger('click')

    expect(wrapper.emitted('toggle')).toEqual([[node()]])
    expect(useLibraryStore().isStarred('/Books')).toBe(false)
  })

  it('marks the selected node for assistive tech', async () => {
    const wrapper = render(node())
    useResourcesStore().select(node())
    await nextTick()

    // aria-selected belongs on the element carrying role="treeitem".
    expect(wrapper.find('[role="treeitem"]').attributes('aria-selected')).toBe('true')
  })
})