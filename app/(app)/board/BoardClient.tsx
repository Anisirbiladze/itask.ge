'use client'
import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

import { useApp, Avatar } from '@/components/AppShell'
import TaskDetailModal from '@/components/TaskDetailModal'
import { isLate } from '@/lib/utils'

export interface Task {
  id: string
  title: string
  companyId: string | null
  assigneeId: string | null
  status: string
  computedStatus: string
  waitingHours: number | null
  priority: number
  dueAt: string | null
  originalDueAt: string | null
  checklistPct: number | null
  checklistTotal: number
  checklistDone: number
  createdAt: string
  tags?: { id: string; name: string; color: string }[]
  company?: { id: string; name: string; color: string; accentInk: string; accentText: string } | null
  assignee?: { id: string; displayName: string; photoUrl?: string | null } | null
}

interface GroupedSection {
  key: string
  label: string
  color: string
  accentText: string
  tasks: Task[]
  openCount: number
  stuckCount: number
}

/* ── Status configuration ─────────────────────────────────────────── */
export const ST_META: Record<string, { cls: string; label: string; dot: string }> = {
  NOT_STARTED: { cls: 'st-idle',    label: 'დაუწყებელი',     dot: '#B6BDC7' },
  IN_PROGRESS: { cls: 'st-work',    label: 'მიმდინარე',      dot: '#FDB022' },
  TO_REVIEW:   { cls: 'st-review',  label: 'შემოწმება',      dot: '#6FA4FF' },
  TO_APPROVE:  { cls: 'st-approve', label: 'დამტკიცება',     dot: '#A78BFA' },
  COMPLETED:   { cls: 'st-done',    label: 'დასრულდა',       dot: '#12B76A' },
  WAITING:     { cls: 'st-stuck',   label: 'გაჭედილი',       dot: '#F4556A' },
}

const MEMBER_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'] as const
const CEO_STATUSES    = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'] as const

export default function BoardClient({
  initialTasks,
  initialUsers,

}: {
  initialTasks: Task[]
  initialUsers: { id: string; displayName: string; photoUrl?: string | null }[]
}) {
  const { companies, me, openNewTask, refreshCompanies } = useApp()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [users] = useState(initialUsers)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  // Filter/sort state is local — instant, no server round-trips
  const [groupBy, setGroupBy] = useState<'all' | 'person'>('all')
  const [filter,  setFilter]  = useState('all')
  const [sortBy,  setSortBy]  = useState<'priority' | 'due' | 'progress'>('priority')

  const refetch = useCallback(async () => {
    const res = await fetch('/api/tasks')
    if (res.ok) setTasks(await res.json())
  }, [])

  async function changeStatus(taskId: string, newStatus: string, optimisticTask: Task) {
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId
      ? { ...t, status: newStatus, computedStatus: newStatus }
      : t
    ))
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (!res.ok) {
      // Revert
      setTasks(prev => prev.map(t => t.id === taskId ? optimisticTask : t))
      const err = await res.json().catch(() => ({}))
      alert(err.error ?? 'Status change failed')
    } else {
      refreshCompanies()
    }
  }

  /* ── Filter + sort tasks ──────────────────────────────────────────── */
  const filteredTasks = useMemo(() => {
    const now = new Date()
    let result = tasks

    switch (filter) {
      case 'not_started':
        result = result.filter(t => t.status === 'NOT_STARTED'); break
      case 'in_progress':
        result = result.filter(t => t.status === 'IN_PROGRESS'); break
      case 'completed':
        result = result.filter(t => t.status === 'COMPLETED'); break
      case 'overdue':
        result = result.filter(t => t.dueAt && new Date(t.dueAt) < now && t.status !== 'COMPLETED'); break
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === 'priority') {
        return (b.priority ?? 2) - (a.priority ?? 2)
      }
      if (sortBy === 'due') {
        if (!a.dueAt && !b.dueAt) return 0
        if (!a.dueAt) return 1
        if (!b.dueAt) return -1
        return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
      }
      if (sortBy === 'progress') {
        const pa = a.checklistPct ?? (a.status === 'COMPLETED' ? 100 : 0)
        const pb = b.checklistPct ?? (b.status === 'COMPLETED' ? 100 : 0)
        return pb - pa
      }
      return 0
    })

    return result
  }, [tasks, filter, sortBy])

  const augmented: Task[] = useMemo(() => filteredTasks.map(t => ({
    ...t,
    company: (() => { const co = companies.find(c => c.id === t.companyId); return co ? { id: co.id, name: co.name, color: co.color, accentInk: co.accentInk, accentText: co.accentText } : null })(),
    assignee: users.find(u => u.id === t.assigneeId) ?? null,
  })), [filteredTasks, companies, users])

  const sections: GroupedSection[] = (() => {
    if (groupBy === 'all') {
      const open = augmented.filter(t => t.status !== 'COMPLETED')
      return [{ key: 'all', label: '', color: '#6B7480', accentText: 'var(--muted)', tasks: augmented, openCount: open.length, stuckCount: open.filter(t => t.computedStatus === 'WAITING').length }]
    }
    const byPerson: Record<string, Task[]> = {}
    for (const t of augmented) {
      const uid = t.assigneeId ?? '__unassigned'
      if (!byPerson[uid]) byPerson[uid] = []
      byPerson[uid].push(t)
    }
    const result: GroupedSection[] = []
    for (const u of users) {
      if (!byPerson[u.id]?.length) continue
      const ptasks = byPerson[u.id]
      const openPtasks = ptasks.filter(t => t.status !== 'COMPLETED')
      result.push({
        key: u.id, label: u.displayName, color: '#6B7480', accentText: 'var(--muted)',
        tasks: ptasks, openCount: openPtasks.length,
        stuckCount: openPtasks.filter(t => t.computedStatus === 'WAITING').length,
      })
    }
    if (byPerson['__unassigned']?.length) {
      const ut = byPerson['__unassigned']
      result.push({ key: '__unassigned', label: 'Unassigned', color: '#B4BCC5', accentText: 'var(--muted)', tasks: ut, openCount: ut.filter(t => t.status !== 'COMPLETED').length, stuckCount: 0 })
    }
    return result
  })()

  function handleAddTask() {
    openNewTask()
  }

  /* ── Stats and filter counts ──────────────────────────────────────── */
  const companyTasks = tasks
  const now = new Date()

  const cnt = useMemo(() => ({
    not_started: companyTasks.filter(t => t.status === 'NOT_STARTED').length,
    in_progress: companyTasks.filter(t => t.status === 'IN_PROGRESS').length,
    completed:   companyTasks.filter(t => t.status === 'COMPLETED').length,
    overdue:     companyTasks.filter(t => t.dueAt && new Date(t.dueAt) < now && t.status !== 'COMPLETED').length,
  }), [companyTasks])

  const allOpen        = augmented.filter(t => t.status !== 'COMPLETED')
  const withDue        = companyTasks.filter(t => t.dueAt && t.status !== 'COMPLETED')
  const onTimePct      = withDue.length ? Math.round(withDue.filter(t => !isLate(t.dueAt!)).length / withDue.length * 100) : 100

  return (
    <div>
      {/* Stat cards — clickable, filter on click */}
      <div className="stat-row">
        <button className={`stat-item${filter === 'in_progress' ? ' active' : ''}`} onClick={() => setFilter(filter === 'in_progress' ? 'all' : 'in_progress')}>
          <b>{allOpen.length}</b><span>მიმდინარე</span>
        </button>
        <button className={`stat-item${cnt.overdue > 0 ? ' hot' : ''}${filter === 'overdue' ? ' active' : ''}`} onClick={() => setFilter(filter === 'overdue' ? 'all' : 'overdue')}>
          <b>{cnt.overdue}</b><span>ვადაგადაც.</span>
        </button>
        <button className="stat-item">
          <b>{onTimePct}%</b><span>ვადაში</span>
        </button>
        <button className={`stat-item${filter === 'completed' ? ' active' : ''}`} onClick={() => setFilter(filter === 'completed' ? 'all' : 'completed')}>
          <b>{cnt.completed}</b><span>დასრულებული</span>
        </button>
      </div>

      {/* Filter + sort bar */}
      <div style={{ display: 'flex', gap: 9, marginBottom: 26, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Grouping toggle */}
        <div className="seg">
          <button className={`seg-btn${groupBy === 'all' ? ' on' : ''}`} onClick={() => setGroupBy('all')}>ყველა</button>
          <button className={`seg-btn${groupBy === 'person' ? ' on' : ''}`} onClick={() => setGroupBy('person')}>თანამშრომელი</button>
        </div>
        {/* Filter dropdown */}
        <select value={filter} onChange={e => setFilter(e.target.value)} style={dropStyle}>
          <option value="all">ყველა</option>
          <option value="not_started">დაუწყებელი ({cnt.not_started})</option>
          <option value="in_progress">მიმდინარე ({cnt.in_progress})</option>
          <option value="completed">დასრულებული ({cnt.completed})</option>
          <option value="overdue">ვადაგადაცილებული ({cnt.overdue})</option>
        </select>
        {/* Sort dropdown */}
        <select value={sortBy} onChange={e => setSortBy(e.target.value as 'priority' | 'due' | 'progress')} style={dropStyle}>
          <option value="priority">↑ პრიორიტეტით</option>
          <option value="due">↑ ვადით</option>
          <option value="progress">↑ შესრულების პროგრესით</option>
        </select>
      </div>



      {sections.map(section => (
        <BoardSection
          key={section.key}
          section={section}
          groupBy={groupBy}
          onRowClick={setSelectedTask}
          onStatusChange={changeStatus}
          onAddTask={me?.role === 'CEO' ? () => handleAddTask() : undefined}
          me={me}
        />
      ))}

      {selectedTask && (
        <TaskDetailModal
          taskId={selectedTask.id}
          initialData={selectedTask as unknown as Record<string, unknown>}
          onClose={() => setSelectedTask(null)}
          onUpdated={() => { refetch(); refreshCompanies() }}
        />
      )}
    </div>
  )
}

/* ── Tag chip ───────────────────────────────────────────────────────── */
export function TagChip({ tag, onRemove }: { tag: { id: string; name: string; color: string }; onRemove?: () => void }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
      background: `${tag.color}22`, color: tag.color,
      border: `1px solid ${tag.color}55`,
      fontFamily: 'var(--font-noto-geo),"Noto Sans Georgian",sans-serif',
    }}>
      {tag.name}
      {onRemove && (
        <button onClick={e => { e.stopPropagation(); onRemove() }}
          style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0, lineHeight: 1, color: 'inherit', fontSize: 12 }}>×</button>
      )}
    </span>
  )
}

const dropStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 500, color: 'var(--ink)', background: 'var(--surface)',
  border: '1px solid var(--line)', borderRadius: 9, padding: '8px 12px', cursor: 'pointer',
  fontFamily: 'var(--font-noto-geo),"Noto Sans Georgian",sans-serif',
}

/* ── Filter button with optional count badge ──────────────────────── */
function FilterBtn({ label, active, onClick, count, dot }: {
  label: string; active: boolean; onClick: () => void
  count?: number; dot?: string
}) {
  return (
    <button className={`seg-btn${active ? ' on' : ''}`} onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      {dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0, opacity: active ? 1 : 0.7 }} />}
      {label}
      {count !== undefined && count > 0 && (
        <span style={{
          fontSize: 10.5, fontWeight: 700, lineHeight: 1,
          background: active ? 'rgba(255,255,255,.28)' : 'var(--tint)',
          color: active ? 'inherit' : 'var(--ink-3)',
          padding: '2px 5px', borderRadius: 99, minWidth: 18, textAlign: 'center',
        }}>{count}</span>
      )}
    </button>
  )
}

/* ── Board section ─────────────────────────────────────────────────── */
function BoardSection({ section, groupBy, onRowClick, onStatusChange, onAddTask, me }: {
  section: GroupedSection
  groupBy: 'all' | 'person'
  onRowClick: (task: Task) => void
  onStatusChange: (taskId: string, newStatus: string, original: Task) => void
  onAddTask?: () => void
  me: { id: string; role: string } | null
}) {
  return (
    <section style={{ marginBottom: 34, ['--gc' as string]: section.color }}>
      {section.label && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 11, paddingLeft: 2 }}>
          <h2 className="ka" style={{ fontSize: 14, fontWeight: 700, letterSpacing: '.03em', color: section.color }}>{section.label}</h2>
          <span style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500 }}>
            {section.openCount} მიმდინარე{section.stuckCount > 0 && <span style={{ color: 'var(--stuck-2)', fontWeight: 600 }}> · {section.stuckCount} გაჭედილი</span>}
          </span>
        </div>
      )}

      {section.tasks.length === 0 ? (
        <div style={{ color: 'var(--ink-3)', fontSize: 13.5, padding: '18px 4px' }}>
          დავალება არ არის.
          {onAddTask && <button onClick={onAddTask} style={{ marginLeft: 8, background: 'none', border: 0, color: 'var(--accent-text)', fontWeight: 600, cursor: 'pointer', fontSize: 13.5 }}>+ დამატება</button>}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 720 }}>
            <div className="board-cols">
              <span>დავალება</span>
              <span />
              <span>პრიორიტეტი</span>
              <span>მიმდინარეობა</span>
              <span>დარჩა</span>
              <span>სტატუსი</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {section.tasks.map((task, i) => (
                <TaskRow
                  key={task.id} task={task} groupBy={groupBy} groupColor={section.color}
                  onClick={() => onRowClick(task)} delay={i * 0.03}
                  onStatusChange={(s) => onStatusChange(task.id, s, task)}
                  me={me}
                />
              ))}
            </div>
            {onAddTask && (
              <button className="add-task-row" onClick={onAddTask}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                დავალების დამატება
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

/* ── Time-left helper ──────────────────────────────────────────────── */
function TimeLeft({ dueAt, status }: { dueAt: string | null; status: string }) {
  if (!dueAt) return <span style={{ color: 'var(--ink-3)' }}>—</span>
  if (status === 'COMPLETED') {
    return <div className="tleft done"><b>✓</b><span>ვადაში</span></div>
  }
  const diffMs = new Date(dueAt).getTime() - Date.now()
  const hours = Math.round(diffMs / 36e5)
  const days = Math.round(diffMs / 864e5)
  if (diffMs < 0) {
    return <div className="tleft over"><b>−{Math.abs(days) || 1}დ</b><span>ვადაგადაცილ.</span></div>
  }
  if (hours < 24) {
    return <div className={`tleft${hours < 6 ? ' warn' : ''}`}><b>{hours}სთ</b><span>დარჩა</span></div>
  }
  return <div className={`tleft${days <= 2 ? ' warn' : ''}`}><b>{days}დ</b><span>დარჩა</span></div>
}

/* ── Status button with dropdown picker ────────────────────────────── */
function StatusBtn({ task, onStatusChange, me }: {
  task: Task
  onStatusChange: (newStatus: string) => void
  me: { id: string; role: string } | null
}) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  const displayStatus = task.computedStatus === 'WAITING' ? 'WAITING' : task.status
  const { cls, label } = ST_META[displayStatus] ?? ST_META.NOT_STARTED
  const waitLabel = displayStatus === 'WAITING' ? `ელოდება ${task.waitingHours ?? 0}სთ` : label

  const availableStatuses = me?.role === 'CEO' ? CEO_STATUSES : MEMBER_STATUSES

  function openMenu(e: React.MouseEvent) {
    e.stopPropagation()
    if (!btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    setMenuPos({ top: r.bottom + 6, right: window.innerWidth - r.right })
    setOpen(o => !o)
  }

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      const menu = document.getElementById('st-portal-menu')
      if (menu && !menu.contains(e.target as Node) && e.target !== btnRef.current) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div className="st-picker">
      <button
        ref={btnRef}
        className={`st-btn ${cls}`}
        type="button"
        onClick={openMenu}
        style={{ width: '100%', minHeight: 50, borderRadius: 9 }}
      >
        {waitLabel}
      </button>
      {open && menuPos && createPortal(
        <div
          id="st-portal-menu"
          className="st-menu"
          style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
        >
          {availableStatuses.map(s => {
            const m = ST_META[s]
            return (
              <button key={s} className="st-opt" onClick={e => { e.stopPropagation(); onStatusChange(s); setOpen(false) }}>
                <span className="st-opt-dot" style={{ background: m.dot }} />
                {m.label}
              </button>
            )
          })}
        </div>,
        document.body
      )}
    </div>
  )
}

/* ── Priority pill ──────────────────────────────────────────────────── */
const PR_PILL = [
  { label: 'დაბალი',    cls: 'pr-pill-low'  },
  { label: 'დაბალი',    cls: 'pr-pill-low'  },
  { label: 'ნორმალური', cls: 'pr-pill-mid'  },
  { label: 'მაღალი',    cls: 'pr-pill-high' },
]
function PriorityPill({ priority }: { priority: number }) {
  const { label, cls } = PR_PILL[Math.min(priority, 3)] ?? PR_PILL[0]
  return <span className={`pr-pill ${cls}`}>{label}</span>
}

/* ── Task row ───────────────────────────────────────────────────────── */
function TaskRow({ task, groupBy, groupColor, onClick, delay, onStatusChange, me }: {
  task: Task; groupBy: 'all' | 'person'; groupColor: string; onClick: () => void; delay: number
  onStatusChange: (s: string) => void
  me: { id: string; role: string } | null
}) {
  const pct = task.checklistPct ?? (task.status === 'COMPLETED' ? 100 : task.status === 'IN_PROGRESS' ? 50 : 0)
  const isDone = task.status === 'COMPLETED'
  return (
    <div className="board-row" style={{ animationDelay: `${delay}s`, ['--gc' as string]: groupColor }}>
      <div className="cel cel-task" onClick={onClick}>
        <span>{task.title}</span>
      </div>
      <div className="cel cel-ow" style={{ justifyContent: 'center' }}>
        {task.assignee
          ? <Avatar name={task.assignee.displayName} size={34} photoUrl={task.assignee.photoUrl} />
          : <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>—</span>}
      </div>

      <div className="cel">
        <PriorityPill priority={task.priority} />
      </div>
      <div className="cel" style={{ padding: '0 14px' }}>
        {task.dueAt
          ? <div className="tl-bar"><i className={`tl-fill${isDone ? ' tl-ok' : ''}`} style={{ ['--w' as string]: `${pct}%` }} /></div>
          : <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>—</span>}
      </div>
      <div className="cel">
        <TimeLeft dueAt={task.dueAt} status={task.status} />
      </div>
      <div className="cel cel-st">
        <StatusBtn task={task} onStatusChange={onStatusChange} me={me} />
      </div>
    </div>
  )
}
