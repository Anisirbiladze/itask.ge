'use client'
import { useEffect, useState } from 'react'
import { Avatar } from '@/components/AppShell'

interface User {
  id: string; name: string; displayName: string; email: string
  role: 'CEO' | 'MEMBER'; jobTitle: string; functionGroup: string
  archived: boolean
  companies: { id: string; name: string; color: string }[]
}

export default function PeoplePage() {
  const [users, setUsers] = useState<User[]>([])
  const [filter, setFilter] = useState<'active' | 'archived' | 'all'>('active')
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [tempPw, setTempPw] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/users?filter=${filter}`)
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  async function resetPassword(userId: string) {
    const res = await fetch(`/api/users/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset-password' }),
    })
    const data = await res.json()
    if (res.ok) setTempPw(data.tempPassword)
  }

  async function restore(userId: string) {
    await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: false }),
    })
    load()
  }

  const selStyle: React.CSSProperties = {
    fontSize: 14, color: 'var(--ink)', fontWeight: 500, background: 'var(--surface)',
    border: '1px solid var(--line)', borderRadius: 9, padding: '9px 30px 9px 12px',
    appearance: 'none', cursor: 'pointer', minHeight: 44,
    backgroundImage: "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236B7480' stroke-width='1.7' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 11px center',
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 9, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filter} onChange={e => setFilter(e.target.value as any)} style={selStyle}>
          <option value="active">Active people</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </select>
        <button onClick={() => setAddOpen(true)} style={{ background: 'var(--ink)', color: '#fff', border: 0, borderRadius: 9, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, minHeight: 44 }}>
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          Add person
        </button>
      </div>

      {loading ? <p style={{ color: 'var(--muted)' }}>Loading…</p> : (
        users.map(u => (
          <div key={u.id} style={{
            background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 11,
            padding: '13px 15px', marginBottom: 7,
            display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: 13, alignItems: 'center',
            opacity: u.archived ? 0.55 : 1,
          }}>
            <Avatar name={u.displayName} size={36} />
            <div>
              <b style={{ fontWeight: 600 }}>{u.displayName}</b>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                {u.jobTitle}
                {u.companies.length > 0 && (
                  <span> · {u.companies.map(c => c.name).join(', ')}</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 5, marginTop: 4, flexWrap: 'wrap' }}>
                {u.companies.map(c => (
                  <span key={c.id} style={{ width: 7, height: 7, borderRadius: '50%', background: c.color, display: 'inline-block' }} />
                ))}
              </div>
            </div>
            <span style={{
              fontSize: 11.5, fontWeight: 600, padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap',
              background: u.archived ? '#F3F4F5' : u.role === 'CEO' ? '#EEF0FE' : '#EFF2F5',
              color: u.archived ? '#9AA3AD' : u.role === 'CEO' ? '#3B4DBF' : 'var(--muted)',
            }}>
              {u.archived ? 'Archived' : u.role === 'CEO' ? 'CEO' : 'Member'}
            </span>
            {u.archived ? (
              <button onClick={() => restore(u.id)} style={{ background: 'none', border: 0, color: '#1C6FD0', fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>Restore</button>
            ) : u.role === 'CEO' ? (
              <button onClick={() => setEditUser(u)} style={{ background: 'none', border: 0, color: '#1C6FD0', fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>Edit</button>
            ) : (
              <button onClick={() => resetPassword(u.id)} style={{ background: 'none', border: 0, color: '#1C6FD0', fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>Reset password</button>
            )}
          </div>
        ))
      )}

      {/* Temp password reveal */}
      {tempPw && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(18,24,31,.45)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 14, padding: '28px 28px', maxWidth: 400, width: '100%', boxShadow: '0 18px 48px rgba(18,24,31,.22)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Temporary password</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13.5, marginBottom: 16 }}>Share this once. The user will be prompted to change it on first login.</p>
            <code style={{ display: 'block', background: 'var(--paper)', borderRadius: 9, padding: '12px 16px', fontSize: 16, fontWeight: 700, letterSpacing: 2, textAlign: 'center', border: '1px solid var(--line)' }}>{tempPw}</code>
            <button onClick={() => setTempPw(null)} style={{ marginTop: 18, width: '100%', background: 'var(--ink)', color: '#fff', border: 0, borderRadius: 9, padding: 11, fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 44 }}>
              Done — I copied it
            </button>
          </div>
        </div>
      )}

      {addOpen && <AddPersonModal companies={[]} onClose={() => setAddOpen(false)} onCreated={(pw) => { setTempPw(pw); setAddOpen(false); load() }} />}
    </div>
  )
}

function AddPersonModal({ companies: _ignored, onClose, onCreated }: {
  companies: unknown[]
  onClose: () => void
  onCreated: (tempPw: string) => void
}) {
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [functionGroup, setFunctionGroup] = useState('')
  const [role, setRole] = useState<'CEO' | 'MEMBER'>('MEMBER')
  const [companyIds, setCompanyIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/companies').then(r => r.json()).then(setCompanies).catch(() => {})
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function toggleCompany(id: string) {
    setCompanyIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, displayName: displayName || name, email, jobTitle, functionGroup, role, companyIds }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed'); return }
      onCreated(data.tempPassword)
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  const inpStyle: React.CSSProperties = { width: '100%', fontSize: 14.5, color: 'var(--ink)', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 9, padding: '10px 12px' }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={{ position: 'fixed', inset: 0, background: 'rgba(18,24,31,.45)', zIndex: 60, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '26px 14px', overflowY: 'auto' }}>
      <div style={{ background: 'var(--surface)', borderRadius: 14, width: '100%', maxWidth: 540, overflow: 'hidden', boxShadow: '0 18px 48px rgba(18,24,31,.22)' }}>
        <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid var(--line-soft)', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 13, right: 13, width: 30, height: 30, borderRadius: 8, border: 0, background: '#F1F4F6', color: 'var(--muted)', cursor: 'pointer', fontSize: 17 }}>×</button>
          <h2 style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em' }}>Add person</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '15px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
              <div><label style={lblStyle}>Name</label><input style={inpStyle} value={name} onChange={e => setName(e.target.value)} required placeholder="First name" /></div>
              <div><label style={lblStyle}>Shown as</label><input style={inpStyle} value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g. Keti J." /></div>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: -8 }}>Use the second field when two people share a first name.</p>
            <div><label style={lblStyle}>Email</label><input type="email" required style={inpStyle} value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.ge" /></div>
            <div><label style={lblStyle}>Job title</label><input style={inpStyle} value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Videographer" /></div>
            <div><label style={lblStyle}>Function group</label><input style={inpStyle} value={functionGroup} onChange={e => setFunctionGroup(e.target.value)} placeholder="e.g. Video production" /></div>
            <div>
              <label style={lblStyle}>Access level</label>
              <select value={role} onChange={e => setRole(e.target.value as any)} style={{ ...inpStyle, appearance: 'none' }}>
                <option value="MEMBER">Member</option>
                <option value="CEO">CEO</option>
              </select>
            </div>
            <div>
              <label style={lblStyle}>Companies</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {companies.map(c => (
                  <button type="button" key={c.id} onClick={() => toggleCompany(c.id)}
                    style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid var(--line)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', background: companyIds.includes(c.id) ? 'var(--ink)' : 'var(--surface)', color: companyIds.includes(c.id) ? '#fff' : 'var(--ink)' }}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>A temporary password is generated and must be changed at first login.</p>
            {error && <p style={{ color: 'var(--stuck)', fontSize: 13.5 }}>{error}</p>}
          </div>
          <div style={{ padding: '14px 18px', display: 'flex', gap: 9, borderTop: '1px solid var(--line-soft)' }}>
            <button type="button" onClick={onClose} style={actStyle}>Cancel</button>
            <button type="submit" disabled={saving} style={{ ...actStyle, background: 'var(--done)', borderColor: 'var(--done)', color: '#fff', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Adding…' : 'Add person'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const lblStyle: React.CSSProperties = { display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }
const actStyle: React.CSSProperties = { flex: 1, fontSize: 14, fontWeight: 600, padding: 11, borderRadius: 9, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', cursor: 'pointer', minHeight: 44 }
