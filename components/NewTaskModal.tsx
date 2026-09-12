'use client'
import { useEffect, useState } from 'react'

interface Company { id: string; name: string; color: string }

export default function NewTaskModal({ companies, defaultCompanyId, onClose, onCreated }: {
  companies: Company[]
  defaultCompanyId?: string
  onClose: () => void
  onCreated: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [companyId, setCompanyId] = useState(defaultCompanyId ?? '')
  const [assigneeId, setAssigneeId] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [priority, setPriority] = useState(2)
  const [checklistTemplateId, setChecklistTemplateId] = useState('')
  const [users, setUsers] = useState<{ id: string; displayName: string }[]>([])
  const [checklistTemplates, setChecklistTemplates] = useState<{ id: string; name: string; items: string[] }[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/checklist-templates').then(r => r.json()).then(setChecklistTemplates).catch(() => {})
  }, [])

  useEffect(() => {
    const url = companyId
      ? `/api/users?filter=active&companyId=${encodeURIComponent(companyId)}`
      : '/api/users?filter=active'
    fetch(url)
      .then(r => r.json())
      .then((data: { id: string; displayName: string }[]) => {
        setUsers(data)
        setAssigneeId(prev => data.find(u => u.id === prev) ? prev : '')
      })
      .catch(() => {})
  }, [companyId])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Task title is required'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          companyId: companyId || null,
          assigneeId: assigneeId || null,
          dueAt: dueAt || null,
          priority,
          checklistTemplateId: checklistTemplateId || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to create task'); return }
      onCreated()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const selStyle: React.CSSProperties = {
    width: '100%', fontSize: 14.5, color: 'var(--ink)', background: 'var(--surface)',
    border: '1px solid var(--line)', borderRadius: 9, padding: '10px 32px 10px 12px',
    appearance: 'none', backgroundImage: "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236B7480' stroke-width='1.7' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(18,24,31,.45)', zIndex: 60, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '26px 14px', overflowY: 'auto' }}>
      <div style={{ background: 'var(--surface)', borderRadius: 14, width: '100%', maxWidth: 580, overflow: 'hidden', boxShadow: '0 18px 48px rgba(18,24,31,.22)' }}>
        <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid var(--line-soft)', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 13, right: 13, width: 30, height: 30, borderRadius: 8, border: 0, background: '#F1F4F6', color: 'var(--muted)', cursor: 'pointer', fontSize: 17 }}>×</button>
          <h2 style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em' }}>New task</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '15px 18px' }}>
            {/* Title */}
            <div style={{ marginBottom: 14 }}>
              <label style={lblStyle}>Task</label>
              <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs doing?"
                style={{ width: '100%', fontSize: 14.5, color: 'var(--ink)', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 9, padding: '10px 12px' }} autoFocus />
            </div>

            {/* Description */}
            <div style={{ marginBottom: 14 }}>
              <label style={lblStyle}>Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional — the brief, in as much detail as needed"
                style={{ width: '100%', fontSize: 14.5, color: 'var(--ink)', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 9, padding: '10px 12px', minHeight: 74, resize: 'vertical', lineHeight: 1.5 }} />
            </div>

            {/* Company + Assignee */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11, marginBottom: 6 }}>
              <div>
                <label style={lblStyle}>Company</label>
                <select value={companyId} onChange={e => setCompanyId(e.target.value)} style={selStyle}>
                  <option value="">Choose…</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={lblStyle}>Assign to</label>
                <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} style={selStyle}>
                  <option value="">Nobody yet</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.displayName}</option>)}
                </select>
              </div>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>
              Either one is enough. A task with a company but no person waits in that company's unassigned list.
            </p>

            {/* Due + Priority */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11, marginBottom: 14 }}>
              <div>
                <label style={lblStyle}>Due</label>
                <input type="date" value={dueAt} onChange={e => setDueAt(e.target.value)}
                  style={{ width: '100%', fontSize: 14.5, color: 'var(--ink)', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 9, padding: '10px 12px' }} />
              </div>
              <div>
                <label style={lblStyle}>Priority</label>
                <select value={priority} onChange={e => setPriority(Number(e.target.value))} style={selStyle}>
                  <option value={2}>Normal</option>
                  <option value={1}>Low</option>
                  <option value={3}>High</option>
                </select>
              </div>
            </div>

            {/* Checklist template */}
            {checklistTemplates.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <label style={lblStyle}>Checklist template</label>
                <select value={checklistTemplateId} onChange={e => setChecklistTemplateId(e.target.value)} style={selStyle}>
                  <option value="">None</option>
                  {checklistTemplates.map(t => <option key={t.id} value={t.id}>{t.name} · {t.items.length} steps</option>)}
                </select>
              </div>
            )}

            {error && <p style={{ color: 'var(--stuck)', fontSize: 13.5, marginBottom: 10 }}>{error}</p>}
          </div>

          <div style={{ padding: '14px 18px', display: 'flex', gap: 9, borderTop: '1px solid var(--line-soft)' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, fontSize: 14, fontWeight: 600, padding: 11, borderRadius: 9, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', cursor: 'pointer', minHeight: 44 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{ flex: 1, fontSize: 14, fontWeight: 600, padding: 11, borderRadius: 9, border: 'none', background: 'var(--done)', color: '#fff', cursor: 'pointer', opacity: saving ? 0.7 : 1, minHeight: 44 }}>
              {saving ? 'Creating…' : 'Create task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const lblStyle: React.CSSProperties = {
  display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 6,
}
