<script setup lang="ts">
import type { TreeNode } from '@/stores/resources'
import FileTreeItem from './FileTreeItem.vue'

/**
 * Renders nodes and emits intent. Reads Pinia stores for star and selection
 * state — that is deliberate, these components live only inside this app. It
 * never fetches: everything arrives as nodes.
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
