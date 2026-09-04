import axios from 'axios'
import { useAuthStore } from '../store/auth.store'

export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')

const api = axios.create({
  baseURL: API_BASE_URL,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout()
      if (window.location.pathname !== '/login') {
        const from = `${window.location.pathname}${window.location.search}`
        window.location.href = `/login?redirect=${encodeURIComponent(from)}`
      }
    }
    return Promise.reject(err)
  },
)

export default api
