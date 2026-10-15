<script setup lang="ts">
import { useLibraryStore } from '@/stores/library'
import { useMenuStore } from '@/stores/menu'
import { useThemeStore } from '@/stores/theme'
import type { ThemeMode } from '@/stores/theme'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const library = useLibraryStore()
const menu = useMenuStore()
const theme = useThemeStore()

const MODES: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'auto', label: 'System' },
]
</script>

<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <div class="flex items-center justify-between gap-4">
          <span class="text-sm">Theme</span>
          <div class="flex gap-2" role="group" aria-label="Theme">
            <Button
              v-for="mode in MODES"
              :key="mode.value"
              :data-testid="`theme-${mode.value}`"
              variant="outline"
              size="sm"
              :aria-pressed="theme.mode === mode.value"
              @click="theme.setMode(mode.value)"
            >
              {{ mode.label }}
            </Button>
          </div>
        </div>

        <div class="flex items-center justify-between gap-4">
          <label class="text-sm" for="collapse-sidebar">Collapse sidebar</label>
          <!-- Native checkbox: nothing is installed that does this better. -->
          <input
            id="collapse-sidebar"
            type="checkbox"
            :checked="menu.collapsed"
            @change="menu.toggleCollapsed()"
          />
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Library</CardTitle>
      </CardHeader>
      <CardContent class="flex flex-wrap gap-2">
        <Button
          data-testid="clear-recent"
          variant="outline"
          size="sm"
          :disabled="library.recent.length === 0"
          @click="library.clearRecent()"
        >
          Clear recent files
        </Button>
        <Button
          data-testid="clear-starred"
          variant="outline"
          size="sm"
          :disabled="library.starredList.length === 0"
          @click="library.clearStarred()"
        >
          Clear starred
        </Button>
      </CardContent>
    </Card>
  </div>
</template>