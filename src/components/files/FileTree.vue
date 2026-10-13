<script setup lang="ts">
import type { TreeNode } from '@/stores/resources'
import FileTreeItem from './FileTreeItem.vue'

/**
 * Presentational only: takes nodes, emits intent. No store import, no fetching,
 * so this can be dropped into any page with any data source.
 */
defineProps<{
  nodes: TreeNode[]
  depth?: number
}>()

const emit = defineEmits<{
  toggle: [node: TreeNode]
  select: [node: TreeNode]
}>()

function onToggle(node: TreeNode) {
  emit('toggle', node)
}

function onSelect(node: TreeNode) {
  emit('select', node)
}
</script>

<template>
  <ul v-if="nodes.length" role="group" class="flex flex-col">
    <FileTreeItem
      v-for="node in nodes"
      :key="node.path"
      :node="node"
      :depth="depth ?? 0"
      @toggle="onToggle"
      @select="onSelect"
    />
  </ul>
  <p v-else class="text-muted-foreground px-2 py-1 text-sm">Empty folder</p>
</template>
