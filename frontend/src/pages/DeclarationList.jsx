import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { declarationAPI } from '../services/api.js'
import { Search, Filter, ChevronRight } from 'lucide-react'

const FILTERS = [
  { value: '', label: 'Semua Status' },
  { value: 'pending',  label: 'Pending' },
  { value: 'accepted', label: 'Diterima' },
  { value: 'rejected', label: 'Ditolak' },
]

export default function DeclarationList() {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [status,  setStatus]  = useState('')
  const [search,  setSearch]  = useState('')

  const load = async (s) => {
    setLoading(true)
    try {
      const res = await declarationAPI.list(s ? { status: s } : {})
      setData(res.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load(status) }, [status])

  const filtered = data.filter(d =>
    !search ||
    (d.consignee || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.registration_number || '').includes(search) ||
    (d.invoice_number || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>Deklarasi Masuk</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{data.length} deklarasi diterima dari CDP</p>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari importir, nomor registrasi, invoice..."
            style={{ width: '100%', padding: '8px 10px 8px 30px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card)' }} />
        </div>
        <div style={{ position: 'relative' }}>
          <Filter size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <select value={status} onChange={e => setStatus(e.target.value)}
            style={{ padding: '8px 10px 8px 28px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card)', cursor: 'pointer' }}>
            {FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Memuat...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Tidak ada deklarasi ditemukan</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['No. Registrasi','Importir','Invoice','Nilai (CIF)','Barang','Status','Diterima'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{d.registration_number || '—'}</td>
                  <td style={{ padding: '10px 14px', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.consignee || '—'}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12 }}>{d.invoice_number || '—'}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>
                    {d.cif_value ? `${d.currency || 'USD'} ${d.cif_value.toLocaleString()}` : '—'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>{d.goods_count ?? '—'} item</td>
                  <td style={{ padding: '10px 14px' }}><span className={`badge badge-${d.status}`}>{d.status}</span></td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 12 }}>
                    {d.received_at ? new Date(d.received_at).toLocaleString('id-ID') : '—'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <Link to={`/declarations/${d.id}`} style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
                      <ChevronRight size={15}/>
                    </Link>
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
