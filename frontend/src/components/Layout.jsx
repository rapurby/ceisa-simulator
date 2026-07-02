import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FileText, LogOut, Shield } from 'lucide-react'
import { clearAuth, getUser } from '../utils/auth.js'

const NAV = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/declarations', icon: FileText,         label: 'Deklarasi Masuk' },
]

export default function Layout({ children }) {
  const navigate = useNavigate()
  const user = getUser()

  const logout = () => { clearAuth(); navigate('/login') }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, background: 'var(--primary)', color: 'white',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        {/* Brand */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={22} color="white" />
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.3px' }}>CEISA</div>
              <div style={{ fontSize: 10, opacity: 0.65, marginTop: 1 }}>Bea Cukai Simulator</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px' }}>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8, marginBottom: 2,
              color: 'white', fontSize: 13, fontWeight: 500,
              background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
              opacity: isActive ? 1 : 0.8,
              transition: 'all 0.15s',
            })}>
              <Icon size={16} />{label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 2 }}>Logged in as</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.name || '—'}</div>
          <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 10 }}>{user?.role}</div>
          <button onClick={logout} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 7,
            color: 'white', padding: '6px 10px', fontSize: 12, width: '100%', cursor: 'pointer',
          }}>
            <LogOut size={13}/> Log Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
