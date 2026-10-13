<script setup lang="ts">
import { ChevronRight, File, Folder, FolderOpen, Loader2 } from '@lucide/vue'
import type { TreeNode } from '@/stores/resources'
import FileTree from './FileTree.vue'

const props = defineProps<{
  node: TreeNode
  depth: number
}>()

const emit = defineEmits<{
  toggle: [node: TreeNode]
  select: [node: TreeNode]
}>()

function activate() {
  if (props.node.kind === 'folder') emit('toggle', props.node)
  else emit('select', props.node)
}
</script>

<template>
  <li
    role="treeitem"
    :aria-expanded="node.kind === 'folder' ? node.open : undefined"
    :aria-selected="undefined"
  >
    <button
      type="button"
      class="hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-1.5 rounded-sm py-1 pr-2 text-left text-sm transition-colors"
      :class="node.kind === 'folder' ? 'font-medium' : 'text-muted-foreground font-normal'"
      :style="{ paddingLeft: `${depth * 12 + 8}px` }"
      @click="activate"
    >
      <template v-if="node.kind === 'folder'">
        <ChevronRight
          class="text-muted-foreground size-4 shrink-0 transition-transform"
          :class="node.open ? 'rotate-90' : ''"
        />
        <FolderOpen v-if="node.open" class="size-4 shrink-0" />
        <Folder v-else class="size-4 shrink-0" />
      </template>
      <File v-else class="size-4 shrink-0" />

      <span class="truncate">{{ node.name }}</span>

      <Loader2
        v-if="node.status === 'loading'"
        class="text-muted-foreground ml-auto size-3.5 shrink-0 animate-spin"
      />
    </button>

    <p
      v-if="node.status === 'error'"
      class="text-destructive py-0.5 pr-2 text-xs"
      :style="{ paddingLeft: `${(depth + 1) * 12 + 8}px` }"
    >
      {{ node.error }}
    </p>

    <FileTree
      v-else-if="node.open && node.children"
      :nodes="node.children"
      :depth="depth + 1"
      @toggle="emit('toggle', $event)"
      @select="emit('select', $event)"
    />
  </li>
</template>
