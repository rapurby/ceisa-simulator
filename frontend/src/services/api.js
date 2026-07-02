import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || ''

const api = axios.create({ baseURL: BASE + '/api/v1' })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('ceisa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ceisa_token')
      localStorage.removeItem('ceisa_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  me:    ()     => api.get('/auth/me'),
}

export const declarationAPI = {
  list:   (params) => api.get('/declarations', { params }),
  get:    (id)     => api.get(`/declarations/${id}`),
  review: (id, body) => api.patch(`/declarations/${id}/review`, body),
  stats:  ()       => api.get('/declarations/stats'),
}

export default api
