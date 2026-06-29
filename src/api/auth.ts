import { apiClient } from './client'
import type { LoginRequest, RegisterRequest, AuthResponse, User, ChangePasswordRequest, AdminCreateUserRequest } from '@/types'

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/api/v1/auth/login', data)
    return response.data
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/api/v1/auth/register', data)
    return response.data
  },

  me: async (): Promise<User> => {
    const response = await apiClient.get<User>('/api/v1/auth/me')
    return response.data
  },

  changePassword: async (data: ChangePasswordRequest): Promise<{ message: string, user: User }> => {
    const response = await apiClient.post<{ message: string, user: User }>('/api/v1/auth/change-password', data)
    return response.data
  },

  listUsers: async (): Promise<User[]> => {
    const response = await apiClient.get<{ users: User[] }>('/api/v1/users')
    return response.data.users
  },

  adminCreateUser: async (data: AdminCreateUserRequest): Promise<{ user: User, default_password: string }> => {
    const response = await apiClient.post<{ user: User, default_password: string }>('/api/v1/users', data)
    return response.data
  },

  deleteUser: async (userId: number): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/api/v1/users/${userId}`)
    return response.data
  }
}
