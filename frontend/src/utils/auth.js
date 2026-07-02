export const getToken = () => localStorage.getItem('ceisa_token')
export const getUser  = () => { try { return JSON.parse(localStorage.getItem('ceisa_user')) } catch { return null } }
export const setAuth  = (token, user) => { localStorage.setItem('ceisa_token', token); localStorage.setItem('ceisa_user', JSON.stringify(user)) }
export const clearAuth = () => { localStorage.removeItem('ceisa_token'); localStorage.removeItem('ceisa_user') }
export const isLoggedIn = () => !!getToken()
