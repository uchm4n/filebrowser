import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { listDirectory } from '@/api/resources'
import type { ResourceEntry } from '@/api/resources'
import { fetchProfile } from '@/api/users'
import { ApiError } from '@/api/client'
import { useAuthStore } from '@/stores/auth'

export type DirectoryStatus = 'unloaded' | 'loading' | 'loaded' | 'error'

export interface TreeNode {
  name: string
  path: string
  kind: 'folder' | 'file'
  /** MIME type, or "directory". Needed to decide what can be played. */
  type: string
  size: number
  modified: string
  hasPreview: boolean
  viewToken?: string
  status: DirectoryStatus
  error?: string
  /** Whether the node is currently expanded. */
  open: boolean
  /** Present only while the node is expanded. */
  children?: TreeNode[]
}

interface DirectoryState {
  status: DirectoryStatus
  error?: string
  entries: TreeNode[]
}

const ROOT = '/'

export const useResourcesStore = defineStore('resources', () => {
  const source = ref<string | null>(null)
  const username = ref<string | null>(null)
  const rootError = ref<string | null>(null)
  // Flat so expand() is an O(1) lookup; the nested tree is materialised below.
  const directories = ref<Record<string, DirectoryState>>({})
  const expanded = ref<Record<string, boolean>>({})
  const selected = ref<TreeNode | null>(null)

  function toNode(entry: ResourceEntry, path: string, kind: TreeNode['kind']): TreeNode {
    return {
      name: entry.name,
      path,
      kind,
      type: entry.type,
      size: entry.size,
      modified: entry.modified,
      hasPreview: entry.hasPreview,
      viewToken: entry.viewToken,
      status: 'unloaded',
      open: false,
    }
  }

  async function load(path: string) {
    const token = useAuthStore().token
    if (!token || !source.value) return

    directories.value[path] = { status: 'loading', entries: directories.value[path]?.entries ?? [] }

    try {
      const info = await listDirectory(path, source.value, token)
      const folders = (info.folders ?? []).map((f) => toNode(f, `${info.path}${f.name}`, 'folder'))
      const files = (info.files ?? []).map((f) => toNode(f, `${info.path}${f.name}`, 'file'))

      directories.value[path] = {
        status: 'loaded',
        entries: [
          ...folders.sort((a, b) => a.name.localeCompare(b.name)),
          ...files.sort((a, b) => a.name.localeCompare(b.name)),
        ],
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load this folder'
      directories.value[path] = {
        status: 'error',
        error: message,
        entries: directories.value[path]?.entries ?? [],
      }
    }
  }

  function buildNodes(dirPath: string): TreeNode[] {
    const state = directories.value[dirPath]
    if (!state) return []

    return state.entries.map((entry) => {
      if (entry.kind === 'file') return entry

      const child = directories.value[entry.path]
      const isOpen = Boolean(expanded.value[entry.path])
      return {
        ...entry,
        status: child?.status ?? 'unloaded',
        error: child?.error,
        open: isOpen,
        children: isOpen ? buildNodes(entry.path) : undefined,
      }
    })
  }

  const tree = computed(() => buildNodes(ROOT))

  async function expand(path: string) {
    if (expanded.value[path]) return
    expanded.value[path] = true
    // Fetch on first open only; collapsing and reopening must not refetch.
    if (directories.value[path]?.status !== 'loaded') await load(path)
  }

  async function toggle(path: string) {
    if (!expanded.value[path]) return expand(path)
    expanded.value[path] = false
  }

  /** Every folder containing `path`, outermost first. */
  function ancestorsOf(path: string) {
    const out: string[] = []
    let acc = '/'
    // Drop the leading '' and the trailing name, keeping each folder's '/'.
    for (const part of path.split('/').slice(1, -1)) out.push((acc += `${part}/`))
    return out
  }

  /**
   * Selects a node by path for recents and starred entries. Stored entries hold
   * no viewToken — its lifetime is unknown — so the node is taken from the
   * freshly loaded parent directory instead of from storage.
   *
   * Paths are child-node paths, which carry no trailing slash even for folders:
   * the slash belongs to the listing's own `FileInfo.path`.
   */
  async function openPath(path: string) {
    for (const ancestor of ancestorsOf(path)) await expand(ancestor)

    const dir = path.slice(0, path.lastIndexOf('/') + 1) || '/'
    if (directories.value[dir]?.status !== 'loaded') await load(dir)

    const node = directories.value[dir]?.entries.find((e) => e.path === path)
    if (!node) {
      const error = directories.value[dir]?.error ?? 'That file is no longer here.'
      return { ok: false as const, error }
    }
    select(node)
    return { ok: true as const }
  }

  async function init() {
    const token = useAuthStore().token
    if (!token || source.value) return

    rootError.value = null
    try {
      const profile = await fetchProfile(token)
      username.value = profile.username
      source.value = profile.scopes[0]?.name ?? null
      if (!source.value) {
        rootError.value = 'Your account has no accessible location.'
        return
      }
      await load(ROOT)
    } catch (err) {
      rootError.value = err instanceof ApiError ? err.message : 'Failed to load your account'
    }
  }

  function select(node: TreeNode) {
    selected.value = node
  }

  function clearSelection() {
    selected.value = null
  }

  return {
    source,
    username,
    rootError,
    tree,
    expanded,
    selected,
    init,
    toggle,
    expand,
    openPath,
    select,
    clearSelection,
    load,
  }
})
