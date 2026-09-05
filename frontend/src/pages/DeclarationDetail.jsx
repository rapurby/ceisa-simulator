import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { declarationAPI } from '../services/api.js'
import { ArrowLeft, CheckCircle, XCircle, Clock, Package, FileText, FileSpreadsheet, MessageSquare } from 'lucide-react'
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
    catch { toast.error('Declaration not found') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  const review = async (action) => {
    if (!notes.trim() && action === 'reject') {
      toast.error('Please provide a reason for rejection')
      return
    }
    if (!window.confirm(`${action === 'accept' ? 'Accept' : 'Reject'} this declaration?`)) return
    setActing(true)
    try {
      await declarationAPI.review(id, { action, notes })
      toast.success(action === 'accept' ? 'Declaration accepted' : 'Declaration rejected')
      load()
    } catch { toast.error('Failed to process') }
    finally { setActing(false) }
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading...</div>
  if (!decl) return null

  const isDone = decl.status !== 'pending'

  const handleViewDoc = async () => {
    try {
      const resp = await declarationAPI.sourceDoc(decl.id)
      const url = URL.createObjectURL(resp.data)
      window.open(url, '_blank')
    } catch {
      toast.error('Failed to retrieve document from CDP')
    }
  }

  const handleDownloadExcel = async () => {
    try {
      const resp = await declarationAPI.ajuExcel(decl.id)
      const url = URL.createObjectURL(resp.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `AJU_${decl.id.slice(0, 8)}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to retrieve Excel AJU attachment')
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
          <ArrowLeft size={14}/> Back
        </button>
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
            {decl.registration_number || 'No registration number yet'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Received: {decl.received_at ? new Date(decl.received_at).toLocaleString('en-US') : '—'}
            {decl.reviewed_by && <span style={{ marginLeft: 12 }}>· Reviewed by: <strong>{decl.reviewed_by}</strong></span>}
          </div>
          {decl.review_notes && (
            <div style={{
              marginTop: 10, display: 'flex', alignItems: 'flex-start', gap: 8,
              background: decl.status === 'rejected' ? 'rgba(198,40,40,0.07)' : 'rgba(13,159,110,0.07)',
              border: `1px solid ${decl.status === 'rejected' ? 'rgba(198,40,40,0.2)' : 'rgba(13,159,110,0.2)'}`,
              padding: '10px 14px', borderRadius: 8,
            }}>
              <MessageSquare size={14} style={{ marginTop: 1, flexShrink: 0, color: decl.status === 'rejected' ? '#c62828' : '#0d9f6e' }} />
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: decl.status === 'rejected' ? '#c62828' : '#0d9f6e', marginBottom: 3 }}>
                  Review Notes
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{decl.review_notes}</div>
              </div>
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Source</div>
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
              <FileText size={13}/> View Original Document
            </button>
          )}
          {decl.has_aju_excel && (
            <button onClick={handleDownloadExcel} style={{
              marginTop: 8, display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)',
              background: 'var(--bg)', color: 'var(--text-secondary)',
              fontSize: 12, cursor: 'pointer', fontWeight: 500,
            }}>
              <FileSpreadsheet size={13}/> Download Excel AJU
            </button>
          )}
        </div>
      </div>

      {/* Review panel — only shown while pending */}
      {!isDone && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
          padding: '18px 20px', marginBottom: 14,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 12 }}>
            <MessageSquare size={13} style={{ verticalAlign: 'middle', marginRight: 5 }}/>
            Review Decision
          </div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            Notes to sender <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(required for rejection)</span>
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Enter notes for the CDP operator — they will see this message on their declaration page..."
            rows={3}
            style={{
              width: '100%', padding: '10px 12px',
              border: '1px solid var(--border)', borderRadius: 8,
              fontSize: 13, resize: 'vertical', fontFamily: 'inherit',
              background: 'var(--bg)', color: 'var(--text-primary)',
              boxSizing: 'border-box', marginBottom: 12,
            }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button disabled={acting} onClick={() => review('reject')} style={{
              padding: '8px 18px', borderRadius: 8, background: 'rgba(198,40,40,0.1)',
              color: '#c62828', border: '1px solid rgba(198,40,40,0.2)', fontWeight: 600,
              fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
            }}>
              <XCircle size={14}/> Reject
            </button>
            <button disabled={acting} onClick={() => review('accept')} style={{
              padding: '8px 18px', borderRadius: 8, background: 'var(--primary)',
              color: 'white', border: 'none', fontWeight: 600,
              fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
            }}>
              <CheckCircle size={14}/> Accept
            </button>
          </div>
        </div>
      )}

      <Section title="Importer / Exporter">
        <Field label="Importer (Consignee)" value={decl.consignee} />
        <Field label="NPWP" value={decl.npwp} />
        <Field label="Exporter (Shipper)" value={decl.shipper} />
      </Section>

      <Section title="Document & Shipment">
        <Field label="Invoice No." value={decl.invoice_number} />
        <Field label="Invoice Date" value={decl.invoice_date} />
        <Field label="B/L No." value={decl.bl_number} />
        <Field label="Vessel" value={decl.vessel_name} />
        <Field label="Port of Loading" value={decl.port_of_loading} />
        <Field label="Port of Discharge" value={decl.port_of_discharge} />
      </Section>

      <Section title="Value & Packaging">
        <Field label="Currency" value={decl.currency} />
        <Field label="Customs Value" value={decl.declared_value?.toLocaleString()} />
        <Field label="CIF Value" value={decl.cif_value?.toLocaleString()} />
        <Field label="Gross Weight (kg)" value={decl.gross_weight?.toLocaleString()} />
      </Section>

      {/* Goods table */}
      {goods.length > 0 && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Package size={14} color="var(--text-muted)"/>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Goods ({goods.length} items)
            </span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['#','HS Code','Description','Qty','Unit','Unit Price','Total','Origin'].map(h => (
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
