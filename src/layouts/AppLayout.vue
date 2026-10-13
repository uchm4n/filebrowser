<script setup lang="ts">
import { computed, ref } from 'vue'
import { Folder, LogOut, Menu } from '@lucide/vue'
import { useSwipe } from '@vueuse/core'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth'
import { useMenuStore } from '@/stores/menu'
import { useResourcesStore } from '@/stores/resources'
import { useIsMobile } from '@/lib/use-is-mobile'
import { edgeSwipeAction } from '@/lib/edge-swipe'

const auth = useAuthStore()
const menu = useMenuStore()
const resources = useResourcesStore()
const route = useRoute()
const router = useRouter()
const isMobile = useIsMobile()
const root = ref<HTMLElement | null>(null)

// Captured on swipe start because useSwipe's own coords are not readable from
// inside the options object at the moment onSwipeEnd fires.
let startX = 0

useSwipe(root, {
  threshold: 50,
  onSwipeStart: (e) => {
    startX = e.touches[0]?.clientX ?? 0
  },
  onSwipeEnd: (_e, direction) => {
    const action = edgeSwipeAction(direction, startX, {
      isMobile: isMobile.value,
      drawerOpen: menu.drawerOpen,
      viewerOpen: Boolean(resources.selected),
    })
    if (action === 'open-drawer') menu.openDrawer()
    else if (action === 'close-drawer') menu.closeDrawer()
    else if (action === 'back-to-tree') resources.clearSelection()
  },
})

// Three presentations share one <aside>: a wide sidebar, a 4rem icon rail on
// desktop, and a fixed off-canvas drawer on mobile. `rail` is the only one that
// hides labels, and it is deliberately false on mobile — the drawer is always
// full width.
const rail = computed(() => !isMobile.value && menu.collapsed)

const asideClasses = computed(() =>
  isMobile.value
    ? menu.drawerOpen
      ? 'w-60 translate-x-0'
      : 'w-60 -translate-x-full'
    : menu.collapsed
      ? 'w-16'
      : 'w-60',
)

function onMenuToggle() {
  if (!isMobile.value) {
    menu.toggleCollapsed()
  } else if (menu.drawerOpen) {
    menu.closeDrawer()
  } else {
    menu.openDrawer()
  }
}

// Derived from the route, never stored — one source of truth.
const isActive = (to?: string) => to !== undefined && route.path === to

async function signOut() {
  auth.logout()
  await router.push('/login')
}
</script>

<template>
  <div ref="root" class="bg-sidebar text-sidebar-foreground flex h-dvh w-full md:h-svh">
    <div
      v-if="isMobile && menu.drawerOpen"
      class="fixed inset-0 z-30 bg-black/50"
      @click="menu.closeDrawer"
    />

    <aside
      class="border-sidebar-border bg-sidebar fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col border-r transition-[width,transform] duration-200 md:static"
      :class="asideClasses"
    >
      <div
        class="border-sidebar-border flex h-14 shrink-0 items-center border-b font-semibold"
        :class="rail ? 'justify-center px-0' : 'px-4'"
      >
        <template v-if="!rail">FileBrowser UI</template>
        <Folder v-else class="size-5" />
      </div>

      <nav class="flex-1 space-y-1 overflow-y-auto p-2">
        <template v-for="item in menu.items" :key="item.id">
          <RouterLink
            v-if="item.to"
            :to="item.to"
            class="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex h-9 items-center gap-3 rounded-md text-sm transition-colors"
            :class="[
              rail ? 'justify-center px-0' : 'px-2',
              isActive(item.to)
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                : '',
            ]"
            :title="rail ? item.label : undefined"
            @click="menu.closeDrawer"
          >
            <component :is="item.icon" class="size-4 shrink-0" />
            <span v-if="!rail">{{ item.label }}</span>
          </RouterLink>

          <button
            v-else
            type="button"
            disabled
            class="text-sidebar-foreground/40 flex h-9 w-full cursor-not-allowed items-center gap-3 rounded-md text-sm"
            :class="rail ? 'justify-center px-0' : 'px-2'"
            :title="rail ? `${item.label} (coming soon)` : undefined"
          >
            <component :is="item.icon" class="size-4 shrink-0" />
            <span v-if="!rail">{{ item.label }}</span>
          </button>
        </template>
      </nav>

      <div v-if="auth.isAuthenticated()" class="border-sidebar-border border-t p-2">
        <Button
          variant="ghost"
          class="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full justify-start"
          :class="rail ? 'justify-center px-0' : 'justify-start'"
          :title="rail ? 'Sign out' : undefined"
          @click="signOut"
        >
          <LogOut />
          <span v-if="!rail">Sign out</span>
        </Button>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header class="border-border flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <Button
          variant="ghost"
          size="icon"
          :aria-label="
            isMobile
              ? menu.drawerOpen
                ? 'Close menu'
                : 'Open menu'
              : menu.collapsed
                ? 'Expand menu'
                : 'Collapse menu'
          "
          :aria-expanded="isMobile ? menu.drawerOpen : !menu.collapsed"
          @click="onMenuToggle"
        >
          <Menu />
        </Button>
      </header>

      <main class="flex-1 overflow-auto">
        <RouterView />
      </main>
    </div>
  </div>
</template>
