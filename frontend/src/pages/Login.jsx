import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api.js'
import { setAuth } from '../utils/auth.js'
import { Shield, LogIn } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Login() {
  const [email, setEmail]   = useState('admin@ceisa.go.id')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authAPI.login({ email, password })
      setAuth(res.data.access_token, res.data.user)
      navigate('/')
    } catch { toast.error('Email atau password salah') }
    finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'white', borderRadius: 16, padding: '40px 36px',
        width: 380, boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, background: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
          }}>
            <Shield size={28} color="white" />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>CEISA Simulator</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Portal Petugas Bea Cukai</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: 'var(--text-secondary)' }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8 }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: 'var(--text-secondary)' }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="ceisa2026"
              style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8 }}
            />
          </div>
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '11px', background: 'var(--primary)', color: 'white',
            border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}>
            <LogIn size={15}/> {loading ? 'Masuk...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  )
}
