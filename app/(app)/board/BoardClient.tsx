'use client'
import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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

const MEMBER_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'TO_REVIEW'] as const
const CEO_STATUSES    = ['NOT_STARTED', 'IN_PROGRESS', 'TO_REVIEW', 'TO_APPROVE', 'COMPLETED'] as const

export default function BoardClient({
  initialTasks,
  initialUsers,
  allTags = [],
}: {
  initialTasks: Task[]
  initialUsers: { id: string; displayName: string; photoUrl?: string | null }[]
  allTags?: { id: string; name: string; color: string }[]
}) {
  const { activeCompany, companies, me, openNewTask, refreshCompanies } = useApp()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [users] = useState(initialUsers)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()

  // All filter state lives in the URL
  const groupBy   = (searchParams.get('group') as 'company' | 'person') ?? 'company'
  const filter    = searchParams.get('filter') ?? (me?.role === 'MEMBER' ? 'my_tasks' : 'all')
  const tagFilter = searchParams.get('tags')?.split(',').filter(Boolean) ?? []

  function toggleTagFilter(tagId: string) {
    const p = new URLSearchParams(searchParams.toString())
    const cur = p.get('tags')?.split(',').filter(Boolean) ?? []
    const next = cur.includes(tagId) ? cur.filter(t => t !== tagId) : [...cur, tagId]
    if (next.length) p.set('tags', next.join(','))
    else p.delete('tags')
    router.replace(`/board?${p.toString()}`, { scroll: false })
  }

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString())
    p.set(key, value)
    router.replace(`/board?${p.toString()}`, { scroll: false })
  }
  function setGroupBy(v: 'company' | 'person') { setParam('group', v) }
  function setFilter(v: string) { setParam('filter', v) }

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

  /* ── Filter tasks ─────────────────────────────────────────────────── */
  const filteredTasks = useMemo(() => {
    const now = new Date()
    let result = tasks
    // company filter comes from URL ?company= handled in AppShell, but activeCompany is derived from it
    if (activeCompany) result = result.filter(t => t.companyId === activeCompany)
    // tag filter
    if (tagFilter.length > 0) result = result.filter(t => tagFilter.every(tid => t.tags?.some(tag => tag.id === tid)))

    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999)
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)

    switch (filter) {
      case 'my_tasks':
        result = result.filter(t => t.assigneeId === me?.id); break
      case 'due_today':
        result = result.filter(t => t.dueAt && new Date(t.dueAt) >= todayStart && new Date(t.dueAt) <= todayEnd && t.status !== 'COMPLETED'); break
      case 'overdue':
        result = result.filter(t => t.dueAt && new Date(t.dueAt) < now && t.status !== 'COMPLETED'); break
      case 'in_progress':
        result = result.filter(t => t.status === 'IN_PROGRESS'); break
      case 'to_review':
        result = result.filter(t => t.status === 'TO_REVIEW'); break
      case 'to_approve':
        result = result.filter(t => t.status === 'TO_APPROVE'); break
      case 'completed':
        result = result.filter(t => t.status === 'COMPLETED'); break
      case 'stuck':
        result = result.filter(t => t.computedStatus === 'WAITING' || (t.status === 'IN_PROGRESS' && t.dueAt && new Date(t.dueAt) < now)); break
      case 'week': {
        const endOfWeek = new Date(now)
        endOfWeek.setDate(now.getDate() + (7 - now.getDay()))
        result = result.filter(t => t.dueAt && new Date(t.dueAt) <= endOfWeek && t.status !== 'COMPLETED'); break
      }
    }
    return result
  }, [tasks, activeCompany, filter, me?.id])

  const augmented: Task[] = useMemo(() => filteredTasks.map(t => ({
    ...t,
    company: (() => { const co = companies.find(c => c.id === t.companyId); return co ? { id: co.id, name: co.name, color: co.color, accentInk: co.accentInk, accentText: co.accentText } : null })(),
    assignee: users.find(u => u.id === t.assigneeId) ?? null,
  })), [filteredTasks, companies, users])

  let sections: GroupedSection[] = []
  if (groupBy === 'company') {
    const filterCos = activeCompany ? companies.filter(c => c.id === activeCompany) : companies
    sections = filterCos.map(c => {
      const ctasks = augmented.filter(t => t.companyId === c.id)
      const openTasks = ctasks.filter(t => t.status !== 'COMPLETED')
      return {
        key: c.id, label: c.name, color: c.color, accentText: c.accentText,
        tasks: ctasks,
        openCount: openTasks.length,
        stuckCount: openTasks.filter(t => t.computedStatus === 'WAITING' || (t.status === 'IN_PROGRESS' && t.dueAt && new Date(t.dueAt) < new Date())).length,
      }
    })
  } else {
    const byPerson: Record<string, Task[]> = {}
    for (const t of augmented) {
      const uid = t.assigneeId ?? '__unassigned'
      if (!byPerson[uid]) byPerson[uid] = []
      byPerson[uid].push(t)
    }
    const personSections: GroupedSection[] = []
    for (const u of users) {
      if (!byPerson[u.id]?.length) continue
      const ptasks = byPerson[u.id]
      const openPtasks = ptasks.filter(t => t.status !== 'COMPLETED')
      personSections.push({
        key: u.id, label: u.displayName, color: '#6B7480', accentText: 'var(--muted)',
        tasks: ptasks, openCount: openPtasks.length,
        stuckCount: openPtasks.filter(t => t.computedStatus === 'WAITING').length,
      })
    }
    if (byPerson['__unassigned']?.length) {
      const ut = byPerson['__unassigned']
      personSections.push({ key: '__unassigned', label: 'Unassigned', color: '#B4BCC5', accentText: 'var(--muted)', tasks: ut, openCount: ut.filter(t => t.status !== 'COMPLETED').length, stuckCount: 0 })
    }
    sections = personSections
  }

  function handleAddTask(section: GroupedSection) {
    if (groupBy === 'company') openNewTask(section.key)
    else openNewTask()
  }

  /* ── Stats and filter counts ──────────────────────────────────────── */
  // Company-filtered tasks (before status filter) for computing counts
  const companyTasks = useMemo(() =>
    activeCompany ? tasks.filter(t => t.companyId === activeCompany) : tasks
  , [tasks, activeCompany])

  const now = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999)
  const weekEnd    = new Date(now); weekEnd.setDate(now.getDate() + 7)

  const cnt = useMemo(() => ({
    my_tasks:   companyTasks.filter(t => t.assigneeId === me?.id && t.status !== 'COMPLETED').length,
    stuck:      companyTasks.filter(t => t.computedStatus === 'WAITING').length,
    week:       companyTasks.filter(t => t.dueAt && new Date(t.dueAt) <= weekEnd && t.status !== 'COMPLETED').length,
    to_review:  companyTasks.filter(t => t.status === 'TO_REVIEW').length,
    to_approve: companyTasks.filter(t => t.status === 'TO_APPROVE').length,
    completed:  companyTasks.filter(t => t.status === 'COMPLETED').length,
    overdue:    companyTasks.filter(t => t.dueAt && new Date(t.dueAt) < now && t.status !== 'COMPLETED').length,
    due_today:  companyTasks.filter(t => t.dueAt && new Date(t.dueAt) >= todayStart && new Date(t.dueAt) <= todayEnd && t.status !== 'COMPLETED').length,
    in_progress:companyTasks.filter(t => t.status === 'IN_PROGRESS').length,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [companyTasks, me?.id])

  const allOpen        = augmented.filter(t => t.status !== 'COMPLETED')
  const stuckTotal     = cnt.stuck
  const withDue        = companyTasks.filter(t => t.dueAt && t.status !== 'COMPLETED')
  const onTimePct      = withDue.length ? Math.round(withDue.filter(t => !isLate(t.dueAt!)).length / withDue.length * 100) : 100
  const completedCount = cnt.completed

  return (
    <div>
      {/* Stat cards — clickable, filter on click */}
      <div className="stat-row">
        <button className={`stat-item${filter === 'in_progress' ? ' active' : ''}`} onClick={() => setFilter(filter === 'in_progress' ? 'all' : 'in_progress')}>
          <b>{allOpen.length}</b><span>მიმდინარე</span>
        </button>
        <button className={`stat-item${stuckTotal > 0 ? ' hot' : ''}${filter === 'stuck' ? ' active' : ''}`} onClick={() => setFilter(filter === 'stuck' ? 'all' : 'stuck')}>
          <b>{stuckTotal}</b><span>გაჭედილი</span>
        </button>
        <button className="stat-item">
          <b>{onTimePct}%</b><span>ვადაში</span>
        </button>
        <button className={`stat-item${filter === 'completed' ? ' active' : ''}`} onClick={() => setFilter(filter === 'completed' ? 'all' : 'completed')}>
          <b>{completedCount}</b><span>დასრულებული</span>
        </button>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 9, marginBottom: 26, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="seg">
          <button className={`seg-btn${groupBy === 'company' ? ' on' : ''}`} onClick={() => setGroupBy('company')}>კომპანია</button>
          <button className={`seg-btn${groupBy === 'person' ? ' on' : ''}`} onClick={() => setGroupBy('person')}>თანამშრომელი</button>
        </div>
        <div className="seg" style={{ flexWrap: 'wrap' }}>
          <FilterBtn label="ყველა"       active={filter === 'all'}         onClick={() => setFilter('all')} />
          {me && <FilterBtn label="ჩემი" active={filter === 'my_tasks'}    onClick={() => setFilter('my_tasks')} count={cnt.my_tasks} />}
          <FilterBtn label="მიმდინარე"   active={filter === 'in_progress'} onClick={() => setFilter('in_progress')} count={cnt.in_progress} />
          <FilterBtn label="შემოწმება"   active={filter === 'to_review'}   onClick={() => setFilter('to_review')} count={cnt.to_review} dot="var(--review)" />
          <FilterBtn label="დამტკიცება"  active={filter === 'to_approve'}  onClick={() => setFilter('to_approve')} count={cnt.to_approve} dot="var(--approve)" />
          <FilterBtn label="გაჭედილი"    active={filter === 'stuck'}       onClick={() => setFilter('stuck')} count={cnt.stuck} dot="var(--stuck)" />
          <FilterBtn label="ვადაგადაც."  active={filter === 'overdue'}     onClick={() => setFilter('overdue')} count={cnt.overdue} dot="var(--stuck)" />
          <FilterBtn label="ამ კვირის"   active={filter === 'week'}        onClick={() => setFilter('week')} count={cnt.week} />
          <FilterBtn label="დასრულდა"    active={filter === 'completed'}   onClick={() => setFilter('completed')} count={cnt.completed} dot="var(--done)" />
        </div>
      </div>

      {/* Tag filter row */}
      {allTags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>ტეგი:</span>
          {allTags.map(tag => {
            const active = tagFilter.includes(tag.id)
            return (
              <button key={tag.id} onClick={() => toggleTagFilter(tag.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 11.5, fontWeight: 700, padding: '3px 10px', borderRadius: 999, cursor: 'pointer',
                  background: active ? `${tag.color}33` : 'var(--surface)',
                  color: active ? tag.color : 'var(--ink-3)',
                  border: `1px solid ${active ? tag.color : 'var(--line)'}`,
                  transition: 'all .15s',
                  fontFamily: 'var(--font-noto-geo),"Noto Sans Georgian",sans-serif',
                }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: tag.color, flexShrink: 0 }} />
                {tag.name}
              </button>
            )
          })}
          {tagFilter.length > 0 && (
            <button onClick={() => { const p = new URLSearchParams(searchParams.toString()); p.delete('tags'); router.replace(`/board?${p.toString()}`, { scroll: false }) }}
              style={{ fontSize: 11.5, color: 'var(--muted)', background: 'none', border: 0, cursor: 'pointer', padding: '3px 6px' }}>
              ✕ გასუფთავება
            </button>
          )}
        </div>
      )}

      {sections.map(section => (
        <BoardSection
          key={section.key}
          section={section}
          groupBy={groupBy}
          onRowClick={setSelectedTask}
          onStatusChange={changeStatus}
          onAddTask={me?.role === 'CEO' ? () => handleAddTask(section) : undefined}
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
  groupBy: 'company' | 'person'
  onRowClick: (task: Task) => void
  onStatusChange: (taskId: string, newStatus: string, original: Task) => void
  onAddTask?: () => void
  me: { id: string; role: string } | null
}) {
  return (
    <section style={{ marginBottom: 34, ['--gc' as string]: section.color }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 11, paddingLeft: 2 }}>
        <h2 className="ka" style={{ fontSize: 14, fontWeight: 700, letterSpacing: '.03em', color: section.color }}>{section.label}</h2>
        <span style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500 }}>
          {section.openCount} მიმდინარე{section.stuckCount > 0 && <span style={{ color: 'var(--stuck-2)', fontWeight: 600 }}> · {section.stuckCount} გაჭედილი</span>}
        </span>
      </div>

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
              <span>{groupBy === 'company' ? 'შემსრულებელი' : 'კომპანია'}</span>
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
  const ref = useRef<HTMLDivElement>(null)

  const displayStatus = task.computedStatus === 'WAITING' ? 'WAITING' : task.status
  const { cls, label } = ST_META[displayStatus] ?? ST_META.NOT_STARTED
  const waitLabel = displayStatus === 'WAITING' ? `ელოდება ${task.waitingHours ?? 0}სთ` : label

  const availableStatuses = me?.role === 'CEO' ? CEO_STATUSES : MEMBER_STATUSES

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div className="st-picker" ref={ref}>
      <button
        className={`st-btn ${cls}`}
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        style={{ width: '100%', minHeight: 50, borderRadius: 9 }}
      >
        <span className="st-puls" />
        {waitLabel}
      </button>
      {open && (
        <div className="st-menu">
          {availableStatuses.map(s => {
            const m = ST_META[s]
            return (
              <button key={s} className="st-opt" onClick={e => { e.stopPropagation(); onStatusChange(s); setOpen(false) }}>
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

/* ── Priority pill ──────────────────────────────────────────────────── */
const PR_PILL = [
  { label: 'LOW',    cls: 'pr-pill-low'  },
  { label: 'LOW',    cls: 'pr-pill-low'  },
  { label: 'MEDIUM', cls: 'pr-pill-mid'  },
  { label: 'HIGH',   cls: 'pr-pill-high' },
]
function PriorityPill({ priority }: { priority: number }) {
  const { label, cls } = PR_PILL[Math.min(priority, 3)] ?? PR_PILL[0]
  return <span className={`pr-pill ${cls}`}>{label}</span>
}

/* ── Task row ───────────────────────────────────────────────────────── */
function TaskRow({ task, groupBy, groupColor, onClick, delay, onStatusChange, me }: {
  task: Task; groupBy: 'company' | 'person'; groupColor: string; onClick: () => void; delay: number
  onStatusChange: (s: string) => void
  me: { id: string; role: string } | null
}) {
  const pct = task.checklistPct ?? (task.status === 'COMPLETED' ? 100 : task.status === 'IN_PROGRESS' ? 50 : 0)
  const isDone = task.status === 'COMPLETED'
  return (
    <div className="board-row" style={{ animationDelay: `${delay}s`, ['--gc' as string]: groupColor }}>
      <div className="cel cel-task" onClick={onClick}>
        <span>{task.title}</span>
        {task.tags && task.tags.length > 0 && (
          <span style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
            {task.tags.map(tag => (
              <TagChip key={tag.id} tag={tag} />
            ))}
          </span>
        )}
      </div>
      <div className="cel cel-ow" style={{ justifyContent: 'center' }}>
        {task.assignee
          ? <Avatar name={task.assignee.displayName} size={34} photoUrl={task.assignee.photoUrl} />
          : <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>—</span>}
      </div>
      <div className="cel cel-nm" style={{ justifyContent: 'center', textAlign: 'center' }}>
        {groupBy === 'company'
          ? (task.assignee?.displayName ?? '—')
          : (task.company ? <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999, color: task.company.accentInk, background: task.company.color }}>{task.company.name}</span> : '—')}
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
