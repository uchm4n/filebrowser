import { computed } from 'vue'
import { defineStore } from 'pinia'
import { debounceFilter, useStorage } from '@vueuse/core'
import type { TreeNode } from '@/stores/resources'

/**
 * A pointer to a file, not the file. Everything the list needs to render a row
 * is here; nothing more.
 */
export interface Entry {
  /** A child node's path: no trailing slash, for folders too. */
  path: string
  name: string
  kind: 'file' | 'folder'
  /** MIME type, or "directory". Picks the icon and the preview endpoint. */
  type: string
  size: number
  modified: string
  /** Epoch ms. Recent ordering only. */
  at: number
}

/**
 * The fields an Entry is built from. Both a tree node and an already-stored
 * Entry satisfy it, so a row in the starred list can re-star itself.
 */
export type EntrySource = Pick<TreeNode, 'path' | 'name' | 'kind' | 'type' | 'size' | 'modified'>

const RECENT_KEY = 'filebrowser.recent'
const STARRED_KEY = 'filebrowser.starred'
const RECENT_LIMIT = 50

/**
 * `Date.now()` has millisecond resolution, so two stars made in the same tick
 * tie and "newest first" degrades to insertion order. Nudging the clock forward
 * keeps the ordering total.
 */
let lastStamp = 0

function stamp(): number {
  lastStamp = Math.max(Date.now(), lastStamp + 1)
  return lastStamp
}

export const useLibraryStore = defineStore('library', () => {
  // `eventFilter` wraps the write watcher, not the ref: the UI updates on the
  // same tick while a burst of taps collapses into one setItem.
  const recent = useStorage<Entry[]>(RECENT_KEY, [], undefined, {
    eventFilter: debounceFilter(200),
  })
  const starred = useStorage<Record<string, Entry>>(STARRED_KEY, {}, undefined, {
    eventFilter: debounceFilter(200),
  })

  const starredList = computed(() => Object.values(starred.value).sort((a, b) => b.at - a.at))

  function entry(node: EntrySource): Entry {
    return {
      path: node.path,
      name: node.name,
      kind: node.kind,
      type: node.type,
      size: node.size,
      modified: node.modified,
      at: stamp(),
    }
    // viewToken is deliberately absent: its lifetime is unknown, so a persisted
    // one 401s. Opening an entry re-reads the parent directory instead.
  }

  function touch(node: EntrySource) {
    recent.value = [entry(node), ...recent.value.filter((e) => e.path !== node.path)].slice(
      0,
      RECENT_LIMIT,
    )
  }

  const isStarred = (path: string) => Boolean(starred.value[path])

  function toggleStar(node: EntrySource) {
    const next = { ...starred.value }
    if (next[node.path]) delete next[node.path]
    else next[node.path] = entry(node)
    starred.value = next
  }

  function clearRecent() {
    recent.value = []
  }

  function clearStarred() {
    starred.value = {}
  }

  return {
    recent,
    starred,
    starredList,
    touch,
    isStarred,
    toggleStar,
    clearRecent,
    clearStarred,
  }
})
