import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { declarationAPI } from '../services/api.js'
import { ArrowLeft, CheckCircle, XCircle, Clock, Package, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

const Field = ({ label, value }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>{label}</span>
    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{value || '—'}</span>
  </div>
)

const Section = ({ title, children }) => (
  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', marginBottom: 14 }}>
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 14 }}>{title}</div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px 20px' }}>
      {children}
    </div>
  </div>
)

export default function DeclarationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [decl, setDecl]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes]   = useState('')
  const [acting, setActing] = useState(false)

  const load = async () => {
    try { const r = await declarationAPI.get(id); setDecl(r.data) }
    catch { toast.error('Deklarasi tidak ditemukan') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  const review = async (action) => {
    if (!window.confirm(`${action === 'accept' ? 'Terima' : 'Tolak'} deklarasi ini?`)) return
    setActing(true)
    try {
      await declarationAPI.review(id, { action, notes })
      toast.success(action === 'accept' ? 'Deklarasi diterima' : 'Deklarasi ditolak')
      load()
    } catch { toast.error('Gagal memproses') }
    finally { setActing(false) }
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Memuat...</div>
  if (!decl) return null

  const isDone = decl.status !== 'pending'

  const handleViewDoc = async () => {
    try {
      const resp = await declarationAPI.sourceDoc(decl.id)
      const url = URL.createObjectURL(resp.data)
      window.open(url, '_blank')
    } catch {
      toast.error('Gagal mengambil dokumen dari CDP')
    }
  }
  const payload = decl.raw_payload || {}
  const goods = payload.goods || []

  const statusIcon = {
    pending:  <Clock size={18} color="#e65100"/>,
    accepted: <CheckCircle size={18} color="#2e7d32"/>,
    rejected: <XCircle size={18} color="#c62828"/>,
  }[decl.status]

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <button onClick={() => navigate('/declarations')} style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
          border: '1px solid var(--border)', borderRadius: 7, background: 'var(--card)',
          color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
        }}>
          <ArrowLeft size={14}/> Kembali
        </button>
        {!isDone && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Catatan (opsional)..."
              style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13, minWidth: 200 }} />
            <button disabled={acting} onClick={() => review('reject')} style={{
              padding: '7px 14px', borderRadius: 7, background: 'rgba(198,40,40,0.1)',
              color: '#c62828', border: 'none', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5,
            }}><XCircle size={13}/> Tolak</button>
            <button disabled={acting} onClick={() => review('accept')} style={{
              padding: '7px 14px', borderRadius: 7, background: 'var(--primary)',
              color: 'white', border: 'none', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5,
            }}><CheckCircle size={13}/> Terima</button>
          </div>
        )}
      </div>

      {/* Hero */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
        padding: '20px 24px', marginBottom: 14,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            {statusIcon}
            <span className={`badge badge-${decl.status}`}>{decl.status}</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
            {decl.registration_number || 'Belum ada nomor registrasi'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Diterima: {decl.received_at ? new Date(decl.received_at).toLocaleString('id-ID') : '—'}
            {decl.reviewed_by && <span style={{ marginLeft: 12 }}>· Diproses oleh: <strong>{decl.reviewed_by}</strong></span>}
          </div>
          {decl.review_notes && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg)', padding: '6px 10px', borderRadius: 6 }}>
              Catatan: {decl.review_notes}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Sumber</div>
          <div style={{ fontSize: 12, fontWeight: 600 }}>{decl.cdp_source}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>CDP ID</div>
          <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{decl.cdp_declaration_id || '—'}</div>
          {decl.has_document && (
            <button onClick={handleViewDoc} style={{
              marginTop: 10, display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)',
              background: 'var(--bg)', color: 'var(--text-secondary)',
              fontSize: 12, cursor: 'pointer', fontWeight: 500,
            }}>
              <FileText size={13}/> Lihat Dokumen Asli
            </button>
          )}
        </div>
      </div>

      <Section title="Importer / Eksportir">
        <Field label="Importir (Consignee)" value={decl.consignee} />
        <Field label="NPWP" value={decl.npwp} />
        <Field label="Eksportir (Shipper)" value={decl.shipper} />
      </Section>

      <Section title="Dokumen & Pengiriman">
        <Field label="No. Invoice" value={decl.invoice_number} />
        <Field label="Tanggal Invoice" value={decl.invoice_date} />
        <Field label="No. B/L" value={decl.bl_number} />
        <Field label="Kapal" value={decl.vessel_name} />
        <Field label="Pelabuhan Muat" value={decl.port_of_loading} />
        <Field label="Pelabuhan Bongkar" value={decl.port_of_discharge} />
      </Section>

      <Section title="Nilai & Kemasan">
        <Field label="Mata Uang" value={decl.currency} />
        <Field label="Nilai Pabean" value={decl.declared_value?.toLocaleString()} />
        <Field label="Nilai CIF" value={decl.cif_value?.toLocaleString()} />
        <Field label="Berat Kotor (kg)" value={decl.gross_weight?.toLocaleString()} />
      </Section>

      {/* Goods table */}
      {goods.length > 0 && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Package size={14} color="var(--text-muted)"/>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Barang ({goods.length} item)
            </span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['#','HS Code','Deskripsi','Qty','Satuan','Harga Satuan','Total','Asal'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {goods.map((g, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{g.sequence ?? i+1}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>{g.hs_code || '—'}</td>
                  <td style={{ padding: '8px 12px', maxWidth: 200 }}>{g.description || '—'}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{g.quantity ?? '—'}</td>
                  <td style={{ padding: '8px 12px' }}>{g.unit || '—'}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{g.unit_price != null ? g.unit_price.toLocaleString() : '—'}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{g.total_value != null ? g.total_value.toLocaleString() : '—'}</td>
                  <td style={{ padding: '8px 12px' }}>{g.country_of_origin || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
