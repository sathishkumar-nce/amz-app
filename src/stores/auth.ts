import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'
import type { User, LoginRequest, RegisterRequest, ChangePasswordRequest } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('auth_token'))
  const isAuthenticated = computed(() => !!token.value)

  async function login(credentials: LoginRequest) {
    const response = await authApi.login(credentials)
    token.value = response.token
    user.value = response.user
    localStorage.setItem('auth_token', response.token)
  }

  async function register(data: RegisterRequest) {
    const response = await authApi.register(data)
    token.value = response.token
    user.value = response.user
    localStorage.setItem('auth_token', response.token)
  }

  async function fetchUser() {
    if (!token.value) return
    try {
      user.value = await authApi.me()
    } catch (error) {
      logout()
    }
  }

  async function changePassword(payload: ChangePasswordRequest) {
    const response = await authApi.changePassword(payload)
    user.value = response.user
    return response
  }

  function logout() {
    user.value = null
    token.value = null
    localStorage.removeItem('auth_token')
  }

  return {
    user,
    token,
    isAuthenticated,
    login,
    register,
    fetchUser,
    changePassword,
    logout
  }
})
