<script setup lang="ts">
import { computed } from 'vue'
import { File, Folder, Star } from '@lucide/vue'
import type { Entry } from '@/stores/library'
import { useLibraryStore } from '@/stores/library'
import { formatBytes } from '@/lib/format'

const props = defineProps<{
  entries: Entry[]
  /** Shown when there is nothing to list. Each collection words its own. */
  emptyText: string
}>()

const emit = defineEmits<{
  open: [entry: Entry]
}>()

const library = useLibraryStore()

const empty = computed(() => (props.entries.length === 0 ? props.emptyText : ''))

const formatDate = (iso: string) => new Date(iso).toLocaleDateString()
</script>

<template>
  <p v-if="empty" class="text-muted-foreground p-4 text-sm">{{ empty }}</p>

  <ul v-else class="flex flex-col">
    <li v-for="entry in entries" :key="entry.path" class="flex items-center">
      <button
        type="button"
        data-testid="row"
        class="hover:bg-accent hover:text-accent-foreground flex min-w-0 flex-1 items-center gap-2 rounded-sm py-1.5 pl-2 pr-2 text-left text-sm transition-colors"
        @click="emit('open', entry)"
      >
        <Folder v-if="entry.kind === 'folder'" class="size-4 shrink-0" />
        <File v-else class="text-muted-foreground size-4 shrink-0" />

        <span class="truncate">{{ entry.name }}</span>

        <span class="text-muted-foreground ml-auto shrink-0 text-xs">
          {{ formatBytes(entry.size) }} · {{ formatDate(entry.modified) }}
        </span>
      </button>

      <!-- A sibling of the row button, never a child: a button inside a button
           is invalid HTML and the row's handler would fire on a star tap. -->
      <button
        type="button"
        data-testid="star"
        :aria-pressed="library.isStarred(entry.path)"
        :aria-label="library.isStarred(entry.path) ? `Unstar ${entry.name}` : `Star ${entry.name}`"
        class="text-muted-foreground hover:text-foreground shrink-0 rounded-sm p-2"
        :class="library.isStarred(entry.path) ? 'text-foreground' : ''"
        @click="library.toggleStar(entry)"
      >
        <Star class="size-4" :class="library.isStarred(entry.path) ? 'fill-current' : ''" />
      </button>
    </li>
  </ul>
</template>