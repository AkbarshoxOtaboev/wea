import { reactive } from 'vue'
import { api } from './api'

export const auth = reactive({
  user: null,
  ready: false,
})

export async function bootAuth() {
  const token = localStorage.getItem('wea_token')
  if (!token) {
    auth.ready = true
    return
  }
  try {
    auth.user = await api('/api/auth/me')
  } catch {
    localStorage.removeItem('wea_token')
    auth.user = null
  } finally {
    auth.ready = true
  }
}

export async function login(email, password) {
  const data = await api('/api/auth/login', { method: 'POST', body: { email, password } })
  localStorage.setItem('wea_token', data.token)
  auth.user = data.user
  return data.user
}

export async function register(payload) {
  const data = await api('/api/auth/register', { method: 'POST', body: payload })
  localStorage.setItem('wea_token', data.token)
  auth.user = data.user
}

export function logout() {
  localStorage.removeItem('wea_token')
  auth.user = null
}
