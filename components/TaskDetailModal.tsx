'use client'
import { useEffect, useRef, useState } from 'react'
import { Avatar } from '@/components/AppShell'
import { formatDateFull, formatDatetime } from '@/lib/utils'
import { useApp } from '@/components/AppShell'

interface TaskDetail {
  id: string
  title: string
  description: string | null
  status: string
  computedStatus: string
  waitingHours: number | null
  priority: number
  dueAt: string | null
  originalDueAt: string | null
  startedAt: string | null
  completedAt: string | null
  parentTaskId: string | null
  handoffAt: string | null
  createdAt: string
  dueDatePushCount: number
  checklistPct: number | null
  checklistTotal: number
  checklistDone: number
  assignee: { id: string; displayName: string } | null
  company: { id: string; name: string; color: string } | null
  creator: { id: string; displayName: string } | null
  parentTask: { id: string; title: string } | null
  checklistItems: { id: string; label: string; done: boolean; position: number }[]
  images: { id: string; url: string }[]
  links: { id: string; url: string; label: string | null }[]
  tags: { id: string; name: string; color: string }[]
  events: {
    id: string; type: string; fromValue: string | null; toValue: string | null
    reason: string | null; createdAt: string; actorName: string | null
  }[]
  settings: { requireReasonOnDueChange: boolean; checklistDrivesProgress: boolean }
}

function buildPartialTask(d: Record<string, unknown>): TaskDetail {
  return {
    id: d.id as string,
    title: d.title as string,
    description: null,
    status: d.status as string,
    computedStatus: d.computedStatus as string,
    waitingHours: (d.waitingHours as number | null) ?? null,
    priority: (d.priority as number) ?? 2,
    dueAt: (d.dueAt as string | null) ?? null,
    originalDueAt: (d.originalDueAt as string | null) ?? null,
    startedAt: null,
    completedAt: null,
    parentTaskId: null,
    handoffAt: null,
    createdAt: d.createdAt as string,
    dueDatePushCount: 0,
    checklistPct: (d.checklistPct as number | null) ?? null,
    checklistTotal: (d.checklistTotal as number) ?? 0,
    checklistDone: (d.checklistDone as number) ?? 0,
    assignee: (d.assignee as TaskDetail['assignee']) ?? null,
    company: (d.company as TaskDetail['company']) ?? null,
    creator: null,
    parentTask: null,
    checklistItems: [],
    images: [],
    links: [],
    tags: (d.tags as TaskDetail['tags']) ?? [],
    events: [],
    settings: { requireReasonOnDueChange: false, checklistDrivesProgress: false },
  }
}

export default function TaskDetailModal({ taskId, initialData, onClose, onUpdated }: {
  taskId: string
  initialData?: Record<string, unknown>
  onClose: () => void
  onUpdated: () => void
}) {
  const { me, companies, users, t } = useApp()
  const [task, setTask] = useState<TaskDetail | null>(initialData ? buildPartialTask(initialData) : null)
  const [loading, setLoading] = useState(!initialData)
  const [histOpen, setHistOpen] = useState(false)
  const [changingDue, setChangingDue] = useState(false)
  const [newDue, setNewDue] = useState('')
  const [dueReason, setDueReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editPriority, setEditPriority] = useState(2)
  const [editAssigneeId, setEditAssigneeId] = useState<string>('')
  const [editCompanyId, setEditCompanyId] = useState<string>('')
  const [deleting, setDeleting] = useState(false)
  const [allTags, setAllTags] = useState<{ id: string; name: string; color: string }[]>([])
  const [tagPickerOpen, setTagPickerOpen] = useState(false)
  const [addingLink, setAddingLink] = useState(false)
  const [linkInput, setLinkInput] = useState('')
  const [uploadingImg, setUploadingImg] = useState(false)
  const imgInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/tags').then(r => r.json()).then(setAllTags).catch(() => {})
  }, [])

  async function handleImageUpload(file: File) {
    if (!task) return
    setUploadingImg(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('taskId', task.id)
    await fetch('/api/upload', { method: 'POST', body: fd })
    setUploadingImg(false)
    load(false)
  }

  async function handleAddLink() {
    const url = linkInput.trim()
    if (!url) return
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addLink: { url } }),
    })
    setLinkInput('')
    setAddingLink(false)
    load(false)
  }

  async function handleRemoveImage(imageId: string) {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ removeImageId: imageId }),
    })
    load(false)
  }

  async function handleRemoveLink(linkId: string) {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ removeLinkId: linkId }),
    })
    load(false)
  }

  async function load(showSpinner = false) {
    if (showSpinner) setLoading(true)
    const res = await fetch(`/api/tasks/${taskId}`)
    if (res.ok) setTask(await res.json())
    setLoading(false)
  }

  useEffect(() => { load(!initialData) }, [taskId])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function toggleChecklist(itemId: string, done: boolean) {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checklistItemId: itemId, done }),
    })
    load(false); onUpdated()
  }

  async function changeStatus(newStatus: string) {
    setSaving(true)
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed'); return }
    load(false); onUpdated()
  }

  function openEdit() {
    if (!task) return
    setEditTitle(task.title)
    setEditDesc(task.description ?? '')
    setEditPriority(task.priority)
    setEditAssigneeId(task.assignee?.id ?? '')
    setEditCompanyId(task.company?.id ?? '')
    setEditing(true)
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!task) return
    setSaving(true); setError('')
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editTitle,
        description: editDesc,
        priority: editPriority,
        assigneeId: editAssigneeId || null,
        companyId: editCompanyId || null,
      }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed'); return }
    setEditing(false)
    load(false); onUpdated()
  }

  async function deleteTask() {
    if (!confirm(t('task.delete_confirm'))) return
    setDeleting(true)
    await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
    setDeleting(false)
    onUpdated(); onClose()
  }

  async function changeDueDate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!newDue) { setError('Please select a date'); return }
    setSaving(true)
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dueAt: newDue, reason: dueReason }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed'); setSaving(false); return }
    setChangingDue(false)
    setSaving(false)
    load(false); onUpdated()
  }

  if (loading) return (
    <Overlay onClose={onClose}>
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Loading…</div>
    </Overlay>
  )
  if (!task) return null

  const datesMatch = task.originalDueAt === task.dueAt ||
    (task.originalDueAt && task.dueAt && new Date(task.originalDueAt).toISOString() === new Date(task.dueAt).toISOString())
  const canChangeDue = me?.role === 'CEO' || true // checked server-side
  const memberStatuses = ['NOT_STARTED', 'IN_PROGRESS', 'TO_REVIEW']
  const ceoStatuses    = ['NOT_STARTED', 'IN_PROGRESS', 'TO_REVIEW', 'TO_APPROVE', 'COMPLETED']
  const availableStatuses = me?.role === 'CEO' ? ceoStatuses : memberStatuses

  return (
    <Overlay onClose={onClose}>
      <div style={{ background: 'var(--surface)', borderRadius: 14, width: '100%', maxWidth: 580, overflow: 'hidden', boxShadow: '0 18px 48px rgba(18,24,31,.22)' }}>
        {/* Header */}
        <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid var(--line-soft)', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 13, right: 13, width: 30, height: 30, borderRadius: 8, border: 0, background: '#F1F4F6', color: 'var(--muted)', cursor: 'pointer', fontSize: 17, lineHeight: 1 }}>×</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9, flexWrap: 'wrap' }}>
            {task.company && <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 5, color: '#fff', background: task.company.color }}>{task.company.name}</span>}
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              {t('task.created_by')} {formatDateFull(task.createdAt)}{task.creator ? ` by ${task.creator.displayName}` : ''}
            </span>
          </div>
          <h2 style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.3, paddingRight: 36 }}>{task.title}</h2>
          <div style={{ display: 'flex', gap: 9, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
            <StatusPicker
              currentStatus={task.computedStatus}
              waitingHours={task.waitingHours}
              availableStatuses={availableStatuses}
              onChange={changeStatus}
              saving={saving}
            />
            {task.assignee && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar name={task.assignee.displayName} size={27} />
                <span style={{ fontSize: 13.5 }}>{task.assignee.displayName}</span>
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {task.description ? (
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line-soft)', fontSize: 14.5, lineHeight: 1.55, color: '#2A333D' }}>
            {task.description.split('\n').map((line, i) => <p key={i} style={i > 0 ? { marginTop: 9 } : {}}>{line}</p>)}
          </div>
        ) : (
          <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--line-soft)' }}>
            <button style={{ fontSize: 13.5, color: 'var(--muted)', border: '1px dashed var(--line)', background: 'none', borderRadius: 9, padding: '8px 14px', cursor: 'pointer' }}>
              + Add description
            </button>
          </div>
        )}

        {/* Tags row */}
        <div style={{ padding: '11px 18px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          {(task.tags ?? []).map(tag => (
            <TagPill key={tag.id} tag={tag} onRemove={async () => {
              const next = (task.tags ?? []).filter(t => t.id !== tag.id)
              setTask(prev => prev ? { ...prev, tags: next } : prev)
              await fetch(`/api/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tagIds: next.map(t => t.id) }),
              })
            }} />
          ))}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setTagPickerOpen(o => !o)}
              style={{ fontSize: 12, color: 'var(--muted)', background: 'none', border: '1px dashed var(--line)', borderRadius: 999, padding: '3px 10px', cursor: 'pointer' }}>
              + ტეგი
            </button>
            {tagPickerOpen && allTags.length > 0 && (
              <TagDropdown
                allTags={allTags}
                currentTagIds={(task.tags ?? []).map(t => t.id)}
                onToggle={async (tagId) => {
                  const cur = (task.tags ?? []).map(t => t.id)
                  const next = cur.includes(tagId) ? cur.filter(id => id !== tagId) : [...cur, tagId]
                  const nextTags = allTags.filter(t => next.includes(t.id))
                  setTask(prev => prev ? { ...prev, tags: nextTags } : prev)
                  await fetch(`/api/tasks/${taskId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tagIds: next }),
                  })
                }}
                onClose={() => setTagPickerOpen(false)}
              />
            )}
          </div>
        </div>

        {/* Dates row */}
        <div style={{ padding: '15px 18px', borderBottom: '1px solid var(--line-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: 1 }}>
              <div>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{t('task.originally_due')}</span>
                <b style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>{formatDateFull(task.originalDueAt)}</b>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{t('task.due_now')}</span>
                <b style={{ display: 'block', fontSize: 15, fontWeight: 600, color: datesMatch ? undefined : 'var(--stuck)' }}>
                  {formatDateFull(task.dueAt)}
                </b>
              </div>
            </div>
            {/* History button */}
            <button onClick={() => setHistOpen(o => !o)}
              style={{ position: 'relative', flexShrink: 0, width: 38, height: 38, borderRadius: 9, border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="Change history">
              <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#6B7480" strokeWidth={2} strokeLinecap="round"><circle cx={12} cy={12} r={9}/><path d="M12 7v5l3 2"/></svg>
              {task.dueDatePushCount > 0 && (
                <span style={{ position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 9, background: 'var(--stuck)', color: '#fff', fontSize: 11, fontWeight: 700, lineHeight: '18px', textAlign: 'center', border: '2px solid var(--surface)' }}>
                  {task.dueDatePushCount}
                </span>
              )}
            </button>
          </div>

          {/* History list */}
          {histOpen && (
            <div style={{ marginTop: 13, borderTop: '1px solid var(--line-soft)', paddingTop: 11 }}>
              {task.events.map(ev => (
                <div key={ev.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 11, padding: '8px 0', borderBottom: '1px solid var(--line-soft)', fontSize: 13 }}>
                  <span style={{ color: 'var(--muted)', fontSize: 12, whiteSpace: 'nowrap' }}>{formatDatetime(ev.createdAt)}</span>
                  <span style={{ color: ev.type === 'DUE_DATE_CHANGED' ? '#8A3128' : undefined }}>
                    {ev.actorName && <b style={{ fontWeight: 600 }}>{ev.actorName} </b>}
                    {eventLabel(ev)}
                    {ev.reason && <i style={{ fontStyle: 'italic', color: '#8A3128' }}> — "{ev.reason}"</i>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checklist */}
        {task.checklistItems.length > 0 && (
          <div style={{ padding: '15px 18px', borderBottom: '1px solid var(--line-soft)' }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 9 }}>{t('task.checklist')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 11 }}>
              <span style={{ flex: 1, height: 7, background: 'var(--line-soft)', borderRadius: 4, overflow: 'hidden', display: 'block' }}>
                <i style={{ display: 'block', height: '100%', background: task.company?.color ?? 'var(--done)', borderRadius: 4, width: `${task.checklistPct ?? 0}%` }} />
              </span>
              <b style={{ fontSize: 13.5, fontWeight: 700, minWidth: 34, textAlign: 'right' }}>{task.checklistPct ?? 0}%</b>
            </div>
            {task.checklistItems.map(item => (
              <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', fontSize: 14, cursor: 'pointer' }}>
                <input type="checkbox" checked={item.done} onChange={e => toggleChecklist(item.id, e.target.checked)}
                  style={{ width: 17, height: 17, accentColor: task.company?.color ?? 'var(--done)', cursor: 'pointer', flexShrink: 0 }} />
                <span style={{ color: item.done ? 'var(--muted)' : undefined, textDecoration: item.done ? 'line-through' : undefined }}>{item.label}</span>
              </label>
            ))}
          </div>
        )}

        {/* Attachments */}
        <div style={{ padding: '15px 18px', borderBottom: '1px solid var(--line-soft)' }}>
          {task.images.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 10 }}>
              {task.images.map(img => (
                <div key={img.id} style={{ position: 'relative' }}>
                  <a href={img.url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8, border: '1px solid var(--line)', display: 'block' }} />
                  </a>
                  <button onClick={() => handleRemoveImage(img.id)}
                    style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,.55)', border: 0, color: '#fff', fontSize: 12, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>
              ))}
            </div>
          )}
          {task.links.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              {task.links.map(lnk => (
                <div key={lnk.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <a href={lnk.url} target="_blank" rel="noopener noreferrer" style={{ color: '#1C6FD0', fontSize: 13.5, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    🔗 {lnk.label ?? lnk.url}
                  </a>
                  <button onClick={() => handleRemoveLink(lnk.id)}
                    style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>×</button>
                </div>
              ))}
            </div>
          )}
          {addingLink && (
            <div style={{ display: 'flex', gap: 7, marginBottom: 10 }}>
              <input autoFocus type="url" value={linkInput} onChange={e => setLinkInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddLink(); if (e.key === 'Escape') { setAddingLink(false); setLinkInput('') } }}
                placeholder="https://"
                style={{ flex: 1, fontSize: 13, padding: '8px 11px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)' }} />
              <button onClick={handleAddLink} style={{ padding: '8px 14px', borderRadius: 9, background: 'var(--accent)', color: '#fff', border: 0, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>+</button>
              <button onClick={() => { setAddingLink(false); setLinkInput('') }} style={{ padding: '8px 12px', borderRadius: 9, border: '1px solid var(--line)', background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--muted)' }}>✕</button>
            </div>
          )}
          <input ref={imgInputRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = '' }} />
          <div style={{ display: 'flex', gap: 9 }}>
            {task.images.length < 3 && (
              <button disabled={uploadingImg} onClick={() => imgInputRef.current?.click()}
                style={{ flex: 1, fontSize: 13.5, color: 'var(--muted)', border: '1px dashed var(--line)', background: 'none', borderRadius: 9, padding: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 44, opacity: uploadingImg ? 0.6 : 1 }}>
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                {uploadingImg ? '...' : t('task.add_image')}
              </button>
            )}
            <button onClick={() => setAddingLink(v => !v)}
              style={{ flex: 1, fontSize: 13.5, color: addingLink ? 'var(--accent)' : 'var(--muted)', border: `1px dashed ${addingLink ? 'var(--accent)' : 'var(--line)'}`, background: 'none', borderRadius: 9, padding: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 44 }}>
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1"/><path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/></svg>
              {t('task.add_link')}
            </button>
          </div>
        </div>

        {/* Handoff note */}
        {task.parentTask && (
          <div style={{ padding: '15px 18px', borderBottom: '1px solid var(--line-soft)' }}>
            <div style={{ background: '#F0F7F3', border: '1px solid #CFE5D9', borderRadius: 9, padding: '11px 13px', fontSize: 13, color: '#1F5E40' }}>
              <b style={{ fontWeight: 600 }}>Created automatically</b> when{' '}
              {task.events.find(e => e.type === 'HANDED_OFF')?.actorName ?? 'someone'} finished "{task.parentTask.title}"{' '}
              {task.handoffAt ? `on ${formatDateFull(task.handoffAt)}` : ''}. Due 48 hours after handoff.
            </div>
          </div>
        )}

        {/* Change due date form */}
        {changingDue && (
          <form onSubmit={changeDueDate} style={{ padding: '15px 18px', borderBottom: '1px solid var(--line-soft)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)' }}>{t('task.change_due_title')}</div>
            <input type="datetime-local" value={newDue} onChange={e => setNewDue(e.target.value)} required
              style={{ width: '100%', fontSize: 14.5, color: 'var(--ink)', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 9, padding: '10px 12px' }} />
            {task.settings.requireReasonOnDueChange && (
              <>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)' }}>{t('task.reason_label')}</div>
                <input type="text" value={dueReason} onChange={e => setDueReason(e.target.value)} required placeholder={t('task.reason_placeholder')}
                  style={{ width: '100%', fontSize: 14.5, color: 'var(--ink)', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 9, padding: '10px 12px' }} />
              </>
            )}
            {error && <p style={{ color: 'var(--stuck)', fontSize: 13.5 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 9 }}>
              <button type="button" onClick={() => setChangingDue(false)} style={actStyle}>{t('task.btn_cancel')}</button>
              <button type="submit" disabled={saving} style={{ ...actStyle, background: 'var(--ink)', color: '#fff', border: 'none' }}>{t('task.btn_save')}</button>
            </div>
          </form>
        )}

        {/* CEO edit form */}
        {editing && me?.role === 'CEO' && (
          <form onSubmit={saveEdit} style={{ padding: '15px 18px', borderTop: '2px solid var(--accent)', display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{t('task.edit_title')}</div>
            <input value={editTitle} onChange={e => setEditTitle(e.target.value)} required placeholder={t('task.field_title')}
              style={inpS} />
            <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3} placeholder={t('task.field_desc')}
              style={{ ...inpS, resize: 'vertical' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              <div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 4 }}>{t('task.field_priority')}</div>
                <select value={editPriority} onChange={e => setEditPriority(Number(e.target.value))} style={{ ...inpS, appearance: 'none' }}>
                  <option value={1}>{t('task.priority_low')}</option>
                  <option value={2}>{t('task.priority_mid')}</option>
                  <option value={3}>{t('task.priority_high')}</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 4 }}>{t('task.field_company')}</div>
                <select value={editCompanyId} onChange={e => setEditCompanyId(e.target.value)} style={{ ...inpS, appearance: 'none' }}>
                  <option value="">{t('task.no_company')}</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 4 }}>{t('task.field_assignee')}</div>
              <select value={editAssigneeId} onChange={e => setEditAssigneeId(e.target.value)} style={{ ...inpS, appearance: 'none' }}>
                <option value="">{t('task.unassigned')}</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.displayName}</option>)}
              </select>
            </div>
            {error && <p style={{ color: 'var(--stuck)', fontSize: 13.5 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 9 }}>
              <button type="button" onClick={() => setEditing(false)} style={actStyle}>{t('task.btn_cancel')}</button>
              <button type="submit" disabled={saving} style={{ ...actStyle, background: 'var(--ink)', color: '#fff', border: 'none', flex: 1 }}>
                {saving ? t('task.saving') : t('task.btn_save')}
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div style={{ padding: '14px 18px', display: 'flex', gap: 9, flexWrap: 'wrap' }}>
          {me?.role === 'CEO' && !editing && (
            <button onClick={openEdit} style={actStyle}>{t('task.btn_edit')}</button>
          )}
          <button onClick={() => { setChangingDue(true); setNewDue(task.dueAt ? task.dueAt.slice(0, 16) : '') }} style={actStyle}>
            {t('task.btn_change_due')}
          </button>
          {me?.role === 'CEO' && (
            <button onClick={deleteTask} disabled={deleting}
              style={{ ...actStyle, flex: 'none', color: 'var(--stuck)', borderColor: 'var(--stuck)' }}>
              {deleting ? '…' : t('task.btn_delete')}
            </button>
          )}
        </div>
      </div>
    </Overlay>
  )
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(18,24,31,.45)', zIndex: 60, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '26px 14px', overflowY: 'auto' }}>
      {children}
    </div>
  )
}

const actStyle: React.CSSProperties = {
  flex: 1, fontSize: 14, fontWeight: 600, padding: 11, borderRadius: 9,
  border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', cursor: 'pointer', minHeight: 44,
}

const inpS: React.CSSProperties = {
  width: '100%', fontSize: 14, color: 'var(--ink)', background: 'var(--surface)',
  border: '1px solid var(--line)', borderRadius: 9, padding: '9px 12px',
}

function eventLabel(ev: { type: string; fromValue: string | null; toValue: string | null }) {
  switch (ev.type) {
    case 'CREATED': return 'created the task'
    case 'STATUS_CHANGED': return `changed status from ${statusLabel(ev.fromValue)} to ${statusLabel(ev.toValue)}`
    case 'DUE_DATE_CHANGED': return `moved due date`
    case 'HANDED_OFF': return 'task handed off'
    case 'ASSIGNED': return `assigned task`
    case 'COMPLETED': return 'marked complete'
    default: return ev.type.toLowerCase().replace(/_/g, ' ')
  }
}

function statusLabel(s: string | null) {
  const m: Record<string, string> = {
    NOT_STARTED: 'Not started', IN_PROGRESS: 'In progress',
    TO_REVIEW: 'To review', TO_APPROVE: 'To approve', COMPLETED: 'Completed',
  }
  return m[s ?? ''] ?? s ?? '?'
}

/* ── Tag pill ──────────────────────────────────────────────────────── */
function TagPill({ tag, onRemove }: { tag: { id: string; name: string; color: string }; onRemove?: () => void }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
      background: `${tag.color}22`, color: tag.color, border: `1px solid ${tag.color}55`,
      fontFamily: 'var(--font-noto-geo),"Noto Sans Georgian",sans-serif',
    }}>
      {tag.name}
      {onRemove && (
        <button onClick={onRemove} style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0, lineHeight: 1, color: 'inherit', fontSize: 13, opacity: 0.7 }}>×</button>
      )}
    </span>
  )
}

/* ── Tag dropdown ──────────────────────────────────────────────────── */
function TagDropdown({ allTags, currentTagIds, onToggle, onClose }: {
  allTags: { id: string; name: string; color: string }[]
  currentTagIds: string[]
  onToggle: (tagId: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  return (
    <div ref={ref} style={{
      position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 210,
      background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 11,
      boxShadow: '0 8px 28px rgba(18,24,31,.16)', padding: 5, minWidth: 180,
      animation: 'menu-in .15s var(--ease)',
    }}>
      {allTags.map(tag => {
        const selected = currentTagIds.includes(tag.id)
        return (
          <button key={tag.id} onClick={() => onToggle(tag.id)} className="st-opt">
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: tag.color, flexShrink: 0 }} />
            {tag.name}
            {selected && <span style={{ marginLeft: 'auto', fontSize: 13, color: tag.color }}>✓</span>}
          </button>
        )
      })}
    </div>
  )
}

/* ── Status picker for modal ──────────────────────────────────────── */
const ST_MODAL: Record<string, { label: string; dot: string; bg: string }> = {
  NOT_STARTED: { label: 'დაუწყებელი', dot: '#B6BDC7', bg: 'linear-gradient(180deg,#C2CAD2,#AAB3BD)' },
  IN_PROGRESS: { label: 'მიმდინარე',  dot: '#FDB022', bg: 'linear-gradient(180deg,#EDB335,#D49517)' },
  TO_REVIEW:   { label: 'შემოწმება',  dot: '#6FA4FF', bg: 'linear-gradient(180deg,#6FA4FF,#4C86F0)' },
  TO_APPROVE:  { label: 'დამტკიცება', dot: '#A78BFA', bg: 'linear-gradient(180deg,#A78BFA,#7C4DEE)' },
  COMPLETED:   { label: 'დასრულდა',   dot: '#12B76A', bg: 'linear-gradient(180deg,#3BB275,#2B9159)' },
  WAITING:     { label: 'გაჭედილი',   dot: '#F4556A', bg: 'linear-gradient(180deg,#E85B4C,#CE4034)' },
}

function StatusPicker({ currentStatus, waitingHours, availableStatuses, onChange, saving }: {
  currentStatus: string
  waitingHours: number | null
  availableStatuses: string[]
  onChange: (s: string) => void
  saving: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const meta = ST_MODAL[currentStatus] ?? ST_MODAL.NOT_STARTED
  const label = currentStatus === 'WAITING' ? `ელოდება ${waitingHours ?? 0}სთ` : meta.label

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        onClick={() => !saving && setOpen(o => !o)}
        className={`st ${Object.keys(ST_MODAL).find(k => k === currentStatus) ? { NOT_STARTED: 'idle', IN_PROGRESS: 'working', TO_REVIEW: 'review', TO_APPROVE: 'approve', COMPLETED: 'done', WAITING: 'stuck' }[currentStatus as keyof typeof ST_MODAL] : 'idle'}`}
        style={{ cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
        type="button"
        disabled={saving}
      >
        {label}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 7px)', left: 0, zIndex: 200,
          background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 11,
          boxShadow: '0 8px 28px rgba(18,24,31,.16)', padding: 5, minWidth: 200,
          animation: 'menu-in .15s var(--ease)',
        }}>
          {availableStatuses.map(s => {
            const m = ST_MODAL[s]
            return (
              <button key={s} onClick={() => { onChange(s); setOpen(false) }} className="st-opt">
                <span className="st-opt-dot" style={{ background: m.dot }} />
                {m.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
