import axios from 'axios'
import { usePOSAuthStore } from '../stores/posAuthStore'

const posApi = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

posApi.interceptors.request.use((config) => {
  const token = usePOSAuthStore.getState().posToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

posApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) usePOSAuthStore.getState().posLogout()
    return Promise.reject(err)
  }
)

export default posApi
