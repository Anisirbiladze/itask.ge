'use client'
import { useState, useCallback, useMemo } from 'react'
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
  company?: { id: string; name: string; color: string; accentInk: string; accentText: string } | null
  assignee?: { id: string; displayName: string } | null
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

export default function BoardClient({
  initialTasks,
  initialUsers,
}: {
  initialTasks: Task[]
  initialUsers: { id: string; displayName: string }[]
}) {
  const { activeCompany, companies, me, openNewTask, refreshCompanies } = useApp()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [users] = useState<{ id: string; displayName: string }[]>(initialUsers)
  const [groupBy, setGroupBy] = useState<'company' | 'person'>('company')
  const [filter, setFilter] = useState<'all' | 'stuck' | 'week' | 'unassigned'>('all')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const refetch = useCallback(async () => {
    const res = await fetch('/api/tasks')
    if (res.ok) setTasks(await res.json())
  }, [])

  const filteredTasks = useMemo(() => {
    const now = new Date()
    let result = tasks
    if (activeCompany) result = result.filter(t => t.companyId === activeCompany)
    if (filter === 'stuck') result = result.filter(t =>
      t.computedStatus === 'WAITING' || (t.status === 'WORKING' && t.dueAt && new Date(t.dueAt) < now)
    )
    if (filter === 'week') {
      const endOfWeek = new Date(now)
      endOfWeek.setDate(now.getDate() + (7 - now.getDay()))
      result = result.filter(t => t.dueAt && new Date(t.dueAt) <= endOfWeek && t.status !== 'DONE')
    }
    if (filter === 'unassigned') result = result.filter(t => !t.assigneeId)
    return result
  }, [tasks, activeCompany, filter])

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
      const openTasks = ctasks.filter(t => t.status !== 'DONE')
      return {
        key: c.id, label: c.name, color: c.color, accentText: c.accentText,
        tasks: ctasks,
        openCount: openTasks.length,
        stuckCount: openTasks.filter(t => t.computedStatus === 'WAITING' || (t.status === 'WORKING' && t.dueAt && new Date(t.dueAt) < new Date())).length,
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
      const openPtasks = ptasks.filter(t => t.status !== 'DONE')
      personSections.push({
        key: u.id, label: u.displayName, color: '#6B7480', accentText: 'var(--muted)',
        tasks: ptasks, openCount: openPtasks.length,
        stuckCount: openPtasks.filter(t => t.computedStatus === 'WAITING').length,
      })
    }
    if (byPerson['__unassigned']?.length) {
      const ut = byPerson['__unassigned']
      personSections.push({ key: '__unassigned', label: 'Unassigned', color: '#B4BCC5', accentText: 'var(--muted)', tasks: ut, openCount: ut.filter(t => t.status !== 'DONE').length, stuckCount: 0 })
    }
    sections = personSections
  }

  function handleAddTask(section: GroupedSection) {
    if (groupBy === 'company') openNewTask(section.key)
    else openNewTask()
  }

  /* ── Stats ── */
  const allOpen = augmented.filter(t => t.status !== 'DONE')
  const stuckTotal = allOpen.filter(t => t.computedStatus === 'WAITING' || (t.status === 'WORKING' && t.dueAt && new Date(t.dueAt) < new Date())).length
  const withDue = augmented.filter(t => t.dueAt && t.status !== 'DONE')
  const onTimePct = withDue.length ? Math.round(withDue.filter(t => !isLate(t.dueAt!)).length / withDue.length * 100) : 100
  const doneCount = augmented.filter(t => t.status === 'DONE').length

  return (
    <div>
      {/* Stats */}
      <div className="stat-row">
        <div className="stat-item"><b>{allOpen.length}</b><span>მიმდინარე</span></div>
        <div className={`stat-item${stuckTotal > 0 ? ' hot' : ''}`}><b>{stuckTotal}</b><span>გაჭედილი</span></div>
        <div className="stat-item"><b>{onTimePct}%</b><span>ვადაში</span></div>
        <div className="stat-item"><b>{doneCount}</b><span>დასრულებული</span></div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 9, marginBottom: 26, flexWrap: 'wrap' }}>
        <div className="seg">
          <button className={`seg-btn${groupBy === 'company' ? ' on' : ''}`} onClick={() => setGroupBy('company')}>კომპანია</button>
          <button className={`seg-btn${groupBy === 'person' ? ' on' : ''}`} onClick={() => setGroupBy('person')}>თანამშრომელი</button>
        </div>
        <div className="seg">
          <button className={`seg-btn${filter === 'all' ? ' on' : ''}`} onClick={() => setFilter('all')}>ყველა</button>
          <button className={`seg-btn${filter === 'stuck' ? ' on' : ''}`} onClick={() => setFilter('stuck')}>გაჭედილი</button>
          <button className={`seg-btn${filter === 'week' ? ' on' : ''}`} onClick={() => setFilter('week')}>ამ კვირის</button>
        </div>
      </div>

      {sections.map(section => (
        <BoardSection
          key={section.key}
          section={section}
          groupBy={groupBy}
          onRowClick={setSelectedTask}
          onAddTask={me?.role === 'CEO' ? () => handleAddTask(section) : undefined}
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

/* ── Board section ────────────────────────────────────────────────── */
function BoardSection({ section, groupBy, onRowClick, onAddTask }: {
  section: GroupedSection
  groupBy: 'company' | 'person'
  onRowClick: (task: Task) => void
  onAddTask?: () => void
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
              <span>მიმდინარეობა</span>
              <span>დარჩა</span>
              <span>სტატუსი</span>
              <span>პრ.</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {section.tasks.map((task, i) => (
                <TaskRow key={task.id} task={task} groupBy={groupBy} groupColor={section.color} onClick={() => onRowClick(task)} delay={i * 0.03} />
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

/* ── Time-left helper ─────────────────────────────────────────────── */
function TimeLeft({ dueAt, status }: { dueAt: string | null; status: string }) {
  if (!dueAt) return <span style={{ color: 'var(--ink-3)' }}>—</span>
  if (status === 'DONE') {
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

/* ── Status button v4 ─────────────────────────────────────────────── */
const ST_MAP: Record<string, { cls: string; label: string }> = {
  NOT_STARTED: { cls: 'st-idle',  label: 'დაუწყებელი' },
  WORKING:     { cls: 'st-work',  label: 'მიმდინარე'  },
  DONE:        { cls: 'st-done',  label: 'დასრულდა'   },
  WAITING:     { cls: 'st-stuck', label: 'გაჭედილი'   },
}

function StatusBtn({ status }: { status: string }) {
  const { cls, label } = ST_MAP[status] ?? ST_MAP.NOT_STARTED
  return (
    <button className={`st-btn ${cls}`} type="button" style={{ pointerEvents: 'none' }}>
      <span className="st-puls" />
      {label}
    </button>
  )
}

/* ── Priority circle v4 ───────────────────────────────────────────── */
const PR_CLS = ['pr-low', 'pr-low', 'pr-mid', 'pr-high']
function PriorityCircle({ priority }: { priority: number }) {
  const cls = PR_CLS[Math.min(priority, 3)] ?? 'pr-low'
  return <button className={`pr-dot ${cls}`} type="button" style={{ pointerEvents: 'none' }} />
}

/* ── Task row v4 ──────────────────────────────────────────────────── */
function TaskRow({ task, groupBy, groupColor, onClick, delay }: {
  task: Task; groupBy: 'company' | 'person'; groupColor: string; onClick: () => void; delay: number
}) {
  const pct = task.checklistPct ?? (task.status === 'DONE' ? 100 : task.status === 'WORKING' ? 50 : 0)
  const isDone = task.status === 'DONE'
  return (
    <div className="board-row" style={{ animationDelay: `${delay}s`, ['--gc' as string]: groupColor }} onClick={onClick}>
      <div className="cel cel-task">
        <span>{task.title}</span>
      </div>
      <div className="cel cel-ow" style={{ justifyContent: 'center' }}>
        {task.assignee
          ? <Avatar name={task.assignee.displayName} size={34} />
          : <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>—</span>}
      </div>
      <div className="cel cel-nm" style={{ justifyContent: 'center', textAlign: 'center' }}>
        {groupBy === 'company'
          ? (task.assignee?.displayName ?? '—')
          : (task.company ? <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999, color: task.company.accentInk, background: task.company.color }}>{task.company.name}</span> : '—')}
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
        <StatusBtn status={task.computedStatus} />
      </div>
      <div className="cel cel-pr">
        <PriorityCircle priority={task.priority} />
      </div>
    </div>
  )
}
