<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted } from 'vue'
import { AlertCircle, ChevronLeft, FileQuestion } from '@lucide/vue'
import FileTree from '@/components/files/FileTree.vue'
import { previewUrl } from '@/api/media'
import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/lib/use-is-mobile'
import { useAuthStore } from '@/stores/auth'
import { useResourcesStore } from '@/stores/resources'

// Loaded only when a file is actually previewed, so the viewer and its
// stylesheet never weigh down the initial bundle.
const FileViewerPane = defineAsyncComponent(() => import('@/components/files/FileViewerPane.vue'))

const auth = useAuthStore()
const resources = useResourcesStore()
const isMobile = useIsMobile()

onMounted(() => resources.init())

const greeting = computed(() => (resources.username ? `Signed in as ${resources.username}` : ''))

const selected = computed(() => {
  const node = resources.selected
  // Folders are navigation, not previews.
  if (!node || node.kind !== 'file' || !resources.source) return null
  return { node, src: previewUrl(node, resources.source) }
})

function onToggle(node: { path: string }) {
  resources.toggle(node.path)
}

// Below `md` the two panes take turns in the viewport instead of sitting side
// by side; at `md` and up both are always visible, exactly as today. The
// display class is chosen in JS rather than by mixing `hidden` and `md:flex`
// in the template, where the winner would depend on Tailwind's output order.
const showTree = computed(() => !isMobile.value || !selected.value)
const showViewer = computed(() => !isMobile.value || Boolean(selected.value))
</script>

<template>
  <div class="flex h-full min-h-0 flex-col md:flex-row">
    <!-- Tree -->
    <div class="min-w-0 flex-1 flex-col border-r" :class="showTree ? 'flex' : 'hidden'">
      <div class="border-border flex h-12 shrink-0 items-center justify-between border-b px-4">
        <h1 class="text-sm font-medium">{{ resources.source ?? 'Files' }}</h1>
        <span class="text-muted-foreground text-xs">{{ greeting }}</span>
      </div>

      <div class="flex-1 overflow-auto p-2">
        <p v-if="!auth.isAuthenticated()" class="text-muted-foreground p-4 text-sm">
          Not signed in.
        </p>

        <p
          v-else-if="resources.rootError"
          class="text-destructive flex items-center gap-2 p-4 text-sm"
        >
          <AlertCircle class="size-4 shrink-0" />
          {{ resources.rootError }}
        </p>

        <p
          v-else-if="resources.tree.length === 0 && resources.source"
          class="text-muted-foreground p-4 text-sm"
        >
          This folder is empty.
        </p>

        <FileTree v-else :nodes="resources.tree" @toggle="onToggle" @select="resources.select" />
      </div>
    </div>

    <!-- Preview -->
    <div class="min-w-0 flex-1 flex-col" :class="showViewer ? 'flex' : 'hidden'">
      <!-- Mobile only: the tree is off-screen, so the viewer needs its own way out. -->
      <div
        v-if="selected"
        class="flex h-12 shrink-0 items-center gap-1 border-b border-border px-1 md:hidden"
      >
        <Button
          variant="ghost"
          size="icon"
          aria-label="Back to files"
          @click="resources.clearSelection()"
        >
          <ChevronLeft />
        </Button>
        <span class="truncate text-sm font-medium">{{ selected.node.name }}</span>
      </div>

      <!-- The viewer is height:100%; without this wrapper it would overflow by
           the back bar's 48px and get clipped at the bottom on mobile. -->
      <div class="min-h-0 flex-1">
        <FileViewerPane
          v-if="selected"
          :key="selected.src"
          :src="selected.src"
          :file-name="selected.node.name"
          :mime-type="selected.node.type"
        />

        <div
          v-else
          class="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 p-8 text-center"
        >
          <FileQuestion class="size-8" />
          <p class="text-sm">Select a file to preview it here.</p>
        </div>
      </div>
    </div>
  </div>
</template>
