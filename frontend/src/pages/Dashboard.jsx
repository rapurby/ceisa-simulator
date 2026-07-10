import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { declarationAPI } from '../services/api.js'
import { Inbox, CheckCircle, XCircle, Clock, TrendingUp, ArrowRight } from 'lucide-react'

export default function Dashboard() {
  const [stats,   setStats]   = useState(null)
  const [recent,  setRecent]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([declarationAPI.stats(), declarationAPI.list({ limit: 5 })])
      .then(([s, l]) => { setStats(s.data); setRecent(l.data) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading...</div>

  const cards = [
    { label: 'Total Received', value: stats?.total,    icon: Inbox,        color: '#1565c0' },
    { label: 'Pending Review', value: stats?.pending,  icon: Clock,        color: '#e65100' },
    { label: 'Accepted',       value: stats?.accepted, icon: CheckCircle,  color: '#2e7d32' },
    { label: 'Rejected',       value: stats?.rejected, icon: XCircle,      color: '#c62828' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>CEISA Dashboard</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Monitoring incoming declarations from Cikarang Dry Port
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
        {cards.map(c => (
          <div key={c.label} style={{
            background: 'var(--card)', borderRadius: 12, padding: '18px 20px',
            border: '1px solid var(--border)', boxShadow: 'var(--shadow)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{c.label}</span>
              <c.icon size={18} color={c.color} />
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: c.color }}>{c.value ?? '—'}</div>
          </div>
        ))}
      </div>

      {/* Recent */}
      <div style={{ background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Recent Declarations</span>
          <Link to="/declarations" style={{ fontSize: 12, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
            View all <ArrowRight size={12}/>
          </Link>
        </div>
        {recent.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No declarations received yet
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Reg. Number','Importer','Invoice','Goods','Status','Time'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 16px' }}>
                    <Link to={`/declarations/${d.id}`} style={{ color: 'var(--accent)', fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>
                      {d.registration_number || '—'}
                    </Link>
                  </td>
                  <td style={{ padding: '10px 16px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.consignee || '—'}</td>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 12 }}>{d.invoice_number || '—'}</td>
                  <td style={{ padding: '10px 16px' }}>{d.goods_count ?? '—'} item</td>
                  <td style={{ padding: '10px 16px' }}><span className={`badge badge-${d.status}`}>{d.status}</span></td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontSize: 12 }}>
                    {d.received_at ? new Date(d.received_at).toLocaleString('en-US') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
