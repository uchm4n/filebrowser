import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { onSessionExpired } from './api/client'
import { config } from './config/env'
import { useAuthStore } from './stores/auth'
import { useThemeStore } from './stores/theme'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

const auth = useAuthStore(pinia)

// Created here rather than in a component: its effect toggles the <html>
// class, and that has to happen before the first render. index.html does the
// same thing inline so the class is set before the bundle even loads.
useThemeStore(pinia)

// A rejected request that carried a token means the 2-hour session is over.
// End it here rather than in each caller: logout() clears the store and
// localStorage, and the guard on /login would bounce back anyway.
onSessionExpired(() => {
  auth.logout()
  void router.push('/login')
})

// Authenticate before the router is installed: installing it triggers the first
// navigation, so a session established afterwards is too late and the guard
// bounces to /login. Dev-only; failures fall through to the login form.
if (config.devCredentials) {
  const { username, password } = config.devCredentials
  await auth.login(username, password).catch(() => {})
}

app.use(router)
app.mount('#app')
