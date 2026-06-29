import axios, { type AxiosInstance, type AxiosError } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
const API_TIMEOUT_MS = 15000

class ApiClient {
  private client: AxiosInstance
  private isHandlingUnauthorized = false

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          const hadToken = Boolean(localStorage.getItem('auth_token'))
          localStorage.removeItem('auth_token')
          window.dispatchEvent(new Event('auth:unauthorized'))

          if (hadToken && !this.isHandlingUnauthorized && window.location.pathname !== '/login') {
            this.isHandlingUnauthorized = true
            window.location.replace('/login')
          }
        }
        if (error.code === 'ECONNABORTED') {
          error.message = 'Request timed out. Please try again.'
        }
        return Promise.reject(error)
      }
    )
  }

  getInstance(): AxiosInstance {
    return this.client
  }
}

export const apiClient = new ApiClient().getInstance()
