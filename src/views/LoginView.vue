<script setup lang="ts">
import { Eye, EyeOff } from '@lucide/vue'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/api/client'
import { config } from '@/config/env'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

// Dev convenience only: always null in production builds (see src/config/env.ts).
const creds = config.devCredentials

const username = ref(creds?.username ?? '')
const password = ref(creds?.password ?? '')
const pending = ref(false)
const showPassword = ref(false)
const error = ref<string | null>(null)

async function submit() {
  pending.value = true
  error.value = null
  try {
    await auth.login(username.value, password.value)
    await router.push('/')
  } catch (err) {
    // A stale token that can no longer authenticate must not linger.
    if (err instanceof ApiError && err.isUnauthorized) auth.logout()
    error.value = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="flex min-h-svh items-center justify-center p-4">
    <Card class="w-full max-w-sm">
      <CardHeader>
        <CardTitle class="text-xl">Sign in</CardTitle>
        <CardDescription>Use your account credentials</CardDescription>
      </CardHeader>

      <CardContent>
        <form class="flex flex-col gap-4" @submit.prevent="submit">
          <div class="flex flex-col gap-2">
            <Label for="username">Username</Label>
            <Input
              id="username"
              v-model="username"
              name="username"
              autocomplete="username"
              required
              :disabled="pending"
            />
          </div>

          <div class="flex flex-col gap-2">
            <Label for="password">Password</Label>
            <div class="relative">
              <Input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                name="password"
                autocomplete="current-password"
                required
                :disabled="pending"
                class="pr-9"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                class="text-muted-foreground absolute top-1/2 right-1 -translate-y-1/2"
                :disabled="pending"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                :aria-pressed="showPassword"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" />
                <Eye v-else />
              </Button>
            </div>
          </div>

          <p v-if="error" role="alert" aria-live="assertive" class="text-destructive text-sm">
            {{ error }}
          </p>

          <Button type="submit" class="w-full" :disabled="pending">
            {{ pending ? 'Signing in…' : 'Sign in' }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
