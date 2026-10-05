'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/components/AppShell'

function nowParts() {
  const d = new Date()
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return {
    date: `${y}-${mo}-${day}`,
    hour: 19,
    minute: 0,
  }
}

export default function NewTaskModal({ onClose, onCreated }: {
  onClose: () => void
  onCreated: () => void
}) {
  const { companies, users: ctxUsers, t } = useApp()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  // Auto-select the first (only) company — no picker needed
  const companyId = companies[0]?.id ?? ''
  const [assigneeId, setAssigneeId] = useState('')
  const _now = nowParts()
  const [dueDate, setDueDate] = useState(_now.date)
  const [dueHour, setDueHour] = useState(_now.hour)
  const [dueMinute, setDueMinute] = useState(_now.minute)
  const [priority, setPriority] = useState(2)
  const [images, setImages] = useState<File[]>([])
  const [linkUrl, setLinkUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // Start with context users (instant), then refresh from API
  const [users, setUsers] = useState<{ id: string; displayName: string }[]>(ctxUsers)

  useEffect(() => {
    fetch('/api/users')
      .then(r => r.ok ? r.json() : null)
      .then((data: { id: string; displayName: string }[] | null) => {
        if (Array.isArray(data) && data.length > 0) setUsers(data)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError(t('new_task.err_title')); return }
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
          dueAt: dueDate ? `${dueDate}T${String(dueHour).padStart(2,'0')}:${String(dueMinute).padStart(2,'0')}:00+04:00` : null,
          priority,
          linkUrl: linkUrl.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to create task'); return }

      // Upload any staged images
      for (const file of images) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('taskId', data.id)
        await fetch('/api/upload', { method: 'POST', body: fd })
      }

      window.dispatchEvent(new CustomEvent('task-created', { detail: data }))
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
          <h2 style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em' }}>{t('new_task.title')}</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '15px 18px' }}>
            {/* Title */}
            <div style={{ marginBottom: 14 }}>
              <label style={lblStyle}>{t('new_task.label_task')}</label>
              <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder={t('new_task.placeholder_task')}
                style={{ width: '100%', fontSize: 13, color: 'var(--ink)', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 9, padding: '10px 12px' }} autoFocus />
            </div>

            {/* Description */}
            <div style={{ marginBottom: 10 }}>
              <label style={lblStyle}>{t('new_task.label_desc')}</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={t('new_task.placeholder_desc')}
                style={{ width: '100%', fontSize: 13, color: 'var(--ink)', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 9, padding: '10px 12px', minHeight: 120, resize: 'vertical', lineHeight: 1.6 }} />
            </div>

            {/* Add image + Add link row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'flex-start' }}>
              {/* Image button */}
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, minHeight: 42 }}>
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2" y="4" width="16" height="13" rx="2"/><circle cx="7.5" cy="9" r="1.5"/><path d="M2 15l4-4 3 3 3-4 5 5"/></svg>
                {t('task.add_image')}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                  const file = e.target.files?.[0]
                  if (file && images.length < 3) setImages(prev => [...prev, file])
                  e.target.value = ''
                }} />
              </label>

              {/* Link bar */}
              <input type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                placeholder={t('new_task.link_placeholder')}
                style={{ flex: 1, fontSize: 13, color: 'var(--ink)', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 9, padding: '9px 12px', minHeight: 42 }} />
            </div>

            {/* Image thumbnails */}
            {images.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                {images.map((f, i) => {
                  const src = URL.createObjectURL(f)
                  return (
                    <div key={i} style={{ position: 'relative', width: 72, height: 72 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--line)' }} />
                      <button type="button" onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                        style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: 'var(--stuck)', color: '#fff', border: 0, cursor: 'pointer', fontSize: 12, lineHeight: '20px', textAlign: 'center', padding: 0 }}>×</button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Assignee (full width — company is auto-set) */}
            <div style={{ marginBottom: 6 }}>
              <label style={lblStyle}>{t('new_task.label_assignee')}</label>
              <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} style={selStyle}>
                <option value="">{t('new_task.assign_nobody')}</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.displayName}</option>)}
              </select>
            </div>


            {/* Due + Priority */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11, marginBottom: 14 }}>
              <div>
                <label style={lblStyle}>{t('new_task.label_due')}</label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                    onClick={e => { try { (e.target as HTMLInputElement).showPicker() } catch {} }}
                    style={{ flex: 1, fontSize: 13, color: 'var(--ink)', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 9, padding: '10px 10px', cursor: 'pointer', minWidth: 0 }} />
                  <select value={dueHour} onChange={e => setDueHour(Number(e.target.value))}
                    style={{ fontSize: 13, color: 'var(--ink)', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 9, padding: '10px 6px', cursor: 'pointer' }}>
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                    ))}
                  </select>
                  <span style={{ color: 'var(--ink-3)' }}>:</span>
                  <select value={dueMinute} onChange={e => setDueMinute(Number(e.target.value))}
                    style={{ fontSize: 13, color: 'var(--ink)', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 9, padding: '10px 6px', cursor: 'pointer' }}>
                    {Array.from({ length: 60 }, (_, i) => (
                      <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label style={lblStyle}>{t('new_task.label_priority')}</label>
                <select value={priority} onChange={e => setPriority(Number(e.target.value))} style={selStyle}>
                  <option value={2}>{t('new_task.priority_normal')}</option>
                  <option value={1}>{t('new_task.priority_low')}</option>
                  <option value={3}>{t('new_task.priority_high')}</option>
                </select>
              </div>
            </div>

            {error && <p style={{ color: 'var(--stuck)', fontSize: 13.5, marginBottom: 10 }}>{error}</p>}
          </div>

          <div style={{ padding: '14px 18px', display: 'flex', gap: 9, borderTop: '1px solid var(--line-soft)' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, fontSize: 14, fontWeight: 600, padding: 11, borderRadius: 9, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', cursor: 'pointer', minHeight: 44 }}>
              {t('new_task.btn_cancel')}
            </button>
            <button type="submit" disabled={saving} style={{ flex: 1, fontSize: 14, fontWeight: 600, padding: 11, borderRadius: 9, border: 'none', background: 'var(--done)', color: '#fff', cursor: 'pointer', opacity: saving ? 0.7 : 1, minHeight: 44 }}>
              {saving ? t('new_task.btn_creating') : t('new_task.btn_create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const lblStyle: React.CSSProperties = {
  display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 6,
}
