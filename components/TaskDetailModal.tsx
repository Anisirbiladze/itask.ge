'use client'
import { useEffect, useState } from 'react'
import { Avatar, StatusPill } from '@/components/AppShell'
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
  const { me, companies, users } = useApp()
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

  async function markDone() {
    setSaving(true)
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DONE' }),
    })
    setSaving(false)
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
    if (!confirm('Delete this task? It will be archived.')) return
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
  const canMarkDone = task.computedStatus !== 'DONE'
  const canChangeDue = me?.role === 'CEO' || true // checked server-side

  return (
    <Overlay onClose={onClose}>
      <div style={{ background: 'var(--surface)', borderRadius: 14, width: '100%', maxWidth: 580, overflow: 'hidden', boxShadow: '0 18px 48px rgba(18,24,31,.22)' }}>
        {/* Header */}
        <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid var(--line-soft)', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 13, right: 13, width: 30, height: 30, borderRadius: 8, border: 0, background: '#F1F4F6', color: 'var(--muted)', cursor: 'pointer', fontSize: 17, lineHeight: 1 }}>×</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9, flexWrap: 'wrap' }}>
            {task.company && <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 5, color: '#fff', background: task.company.color }}>{task.company.name}</span>}
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              Created {formatDateFull(task.createdAt)}{task.creator ? ` by ${task.creator.displayName}` : ''}
            </span>
          </div>
          <h2 style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.3, paddingRight: 36 }}>{task.title}</h2>
          <div style={{ display: 'flex', gap: 9, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
            <StatusPill status={task.computedStatus} waitingHours={task.waitingHours} />
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

        {/* Dates row */}
        <div style={{ padding: '15px 18px', borderBottom: '1px solid var(--line-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: 1 }}>
              <div>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Originally due</span>
                <b style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>{formatDateFull(task.originalDueAt)}</b>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Due now</span>
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
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 9 }}>Checklist</div>
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
                <a key={img.id} href={img.url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8, border: '1px solid var(--line)' }} />
                </a>
              ))}
            </div>
          )}
          {task.links.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              {task.links.map(lnk => (
                <a key={lnk.id} href={lnk.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', color: '#1C6FD0', fontSize: 13.5, marginBottom: 4 }}>
                  🔗 {lnk.label ?? lnk.url}
                </a>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 9 }}>
            {task.images.length < 3 && (
              <button style={{ flex: 1, fontSize: 13.5, color: 'var(--muted)', border: '1px dashed var(--line)', background: 'none', borderRadius: 9, padding: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 44 }}>
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                Add image
              </button>
            )}
            <button style={{ flex: 1, fontSize: 13.5, color: 'var(--muted)', border: '1px dashed var(--line)', background: 'none', borderRadius: 9, padding: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 44 }}>
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1"/><path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/></svg>
              Add link
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
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)' }}>New due date</div>
            <input type="datetime-local" value={newDue} onChange={e => setNewDue(e.target.value)} required
              style={{ width: '100%', fontSize: 14.5, color: 'var(--ink)', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 9, padding: '10px 12px' }} />
            {task.settings.requireReasonOnDueChange && (
              <>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)' }}>Reason (required)</div>
                <input type="text" value={dueReason} onChange={e => setDueReason(e.target.value)} required placeholder="Why is this moving?"
                  style={{ width: '100%', fontSize: 14.5, color: 'var(--ink)', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 9, padding: '10px 12px' }} />
              </>
            )}
            {error && <p style={{ color: 'var(--stuck)', fontSize: 13.5 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 9 }}>
              <button type="button" onClick={() => setChangingDue(false)} style={actStyle}>Cancel</button>
              <button type="submit" disabled={saving} style={{ ...actStyle, background: 'var(--ink)', color: '#fff', border: 'none' }}>Save</button>
            </div>
          </form>
        )}

        {/* CEO edit form */}
        {editing && me?.role === 'CEO' && (
          <form onSubmit={saveEdit} style={{ padding: '15px 18px', borderTop: '2px solid var(--accent)', display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Edit task</div>
            <input value={editTitle} onChange={e => setEditTitle(e.target.value)} required placeholder="Title"
              style={inpS} />
            <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3} placeholder="Description"
              style={{ ...inpS, resize: 'vertical' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              <div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 4 }}>Priority</div>
                <select value={editPriority} onChange={e => setEditPriority(Number(e.target.value))} style={{ ...inpS, appearance: 'none' }}>
                  <option value={1}>Low</option>
                  <option value={2}>Medium</option>
                  <option value={3}>High</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 4 }}>Company</div>
                <select value={editCompanyId} onChange={e => setEditCompanyId(e.target.value)} style={{ ...inpS, appearance: 'none' }}>
                  <option value="">— None —</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 4 }}>Assignee</div>
              <select value={editAssigneeId} onChange={e => setEditAssigneeId(e.target.value)} style={{ ...inpS, appearance: 'none' }}>
                <option value="">— Unassigned —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.displayName}</option>)}
              </select>
            </div>
            {error && <p style={{ color: 'var(--stuck)', fontSize: 13.5 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 9 }}>
              <button type="button" onClick={() => setEditing(false)} style={actStyle}>Cancel</button>
              <button type="submit" disabled={saving} style={{ ...actStyle, background: 'var(--ink)', color: '#fff', border: 'none', flex: 1 }}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div style={{ padding: '14px 18px', display: 'flex', gap: 9, flexWrap: 'wrap' }}>
          {me?.role === 'CEO' && !editing && (
            <button onClick={openEdit} style={actStyle}>Edit task</button>
          )}
          <button onClick={() => { setChangingDue(true); setNewDue(task.dueAt ? task.dueAt.slice(0, 16) : '') }} style={actStyle}>
            Change due
          </button>
          {canMarkDone && (
            <button onClick={markDone} disabled={saving} style={{ ...actStyle, background: 'var(--done)', borderColor: 'var(--done)', color: '#fff', flex: 1 }}>
              {saving ? 'Saving…' : 'Mark done'}
            </button>
          )}
          {!canMarkDone && (
            <button onClick={async () => {
              await fetch(`/api/tasks/${taskId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'WORKING' }) })
              load(); onUpdated()
            }} style={actStyle}>Reopen</button>
          )}
          {me?.role === 'CEO' && (
            <button onClick={deleteTask} disabled={deleting}
              style={{ ...actStyle, flex: 'none', color: 'var(--stuck)', borderColor: 'var(--stuck)' }}>
              {deleting ? '…' : 'Delete'}
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
  const m: Record<string, string> = { NOT_STARTED: 'Not started', WORKING: 'Working', DONE: 'Done' }
  return m[s ?? ''] ?? s ?? '?'
}
