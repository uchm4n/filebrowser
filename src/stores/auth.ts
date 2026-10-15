import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as authApi from '@/api/auth'

const STORAGE_KEY = 'filebrowser.token'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(STORAGE_KEY))

  const isAuthenticated = () => token.value !== null

  async function login(username: string, password: string) {
    const session = await authApi.login({ username, password })
    token.value = session.token
    localStorage.setItem(STORAGE_KEY, session.token)
    document.cookie = `fb_token=${session.token}; path=/; max-age=7200; SameSite=Strict; Secure`
  }

  function logout() {
    token.value = null
    localStorage.removeItem(STORAGE_KEY)
    document.cookie = 'fb_token=; path=/; max-age=0'
  }

  return { token, isAuthenticated, login, logout }
})
