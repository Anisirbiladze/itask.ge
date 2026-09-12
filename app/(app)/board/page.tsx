'use client'
import { useEffect, useState, useCallback } from 'react'
import { useApp, Avatar, StatusPill, PriorityBars, TimelineBar } from '@/components/AppShell'
import TaskDetailModal from '@/components/TaskDetailModal'
import { formatDate, isLate, isDueThisWeek } from '@/lib/utils'

interface Task {
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
  company?: { id: string; name: string; color: string } | null
  assignee?: { id: string; displayName: string } | null
  createdAt: string
}

interface GroupedSection {
  key: string
  label: string
  color: string
  tasks: Task[]
  stuckCount: number
}

export default function BoardPage() {
  const { activeCompany, companies, me, openNewTask, refreshCompanies } = useApp()
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<{ id: string; displayName: string }[]>([])
  const [groupBy, setGroupBy] = useState<'company' | 'person'>('company')
  const [filter, setFilter] = useState<'all' | 'stuck' | 'week' | 'unassigned'>('all')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    const params = new URLSearchParams()
    if (activeCompany) params.set('companyId', activeCompany)
    if (filter !== 'all') params.set('filter', filter === 'stuck' ? 'stuck' : filter === 'week' ? 'week' : 'unassigned')
    const res = await fetch(`/api/tasks?${params}`)
    if (res.ok) {
      const data = await res.json()
      setTasks(data)
    }
    setLoading(false)
  }, [activeCompany, filter])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(setUsers).catch(() => {})
  }, [])

  // Augment tasks with company & assignee objects
  const allCompanies = companies
  const augmented: Task[] = tasks.map(t => ({
    ...t,
    company: allCompanies.find(c => c.id === t.companyId) ?? null,
    assignee: users.find(u => u.id === t.assigneeId) ?? null,
  }))

  // Group sections
  let sections: GroupedSection[] = []

  if (groupBy === 'company') {
    const filterCos = activeCompany ? allCompanies.filter(c => c.id === activeCompany) : allCompanies
    sections = filterCos.map(c => {
      const ctasks = augmented.filter(t => t.companyId === c.id)
      return {
        key: c.id, label: c.name, color: c.color,
        tasks: ctasks,
        stuckCount: ctasks.filter(t => t.computedStatus === 'WAITING' || (t.status === 'WORKING' && t.dueAt && new Date(t.dueAt) < new Date())).length,
      }
    })
  } else {
    // Group by person
    const seen = new Set<string>()
    const personSections: GroupedSection[] = []
    const byPerson: Record<string, Task[]> = {}
    for (const t of augmented) {
      const uid = t.assigneeId ?? '__unassigned'
      if (!byPerson[uid]) byPerson[uid] = []
      byPerson[uid].push(t)
    }
    for (const u of users) {
      if (!byPerson[u.id]?.length) continue
      const ptasks = byPerson[u.id]
      personSections.push({
        key: u.id, label: u.displayName, color: '#6B7480',
        tasks: ptasks,
        stuckCount: ptasks.filter(t => t.computedStatus === 'WAITING').length,
      })
    }
    if (byPerson['__unassigned']?.length) {
      personSections.push({ key: '__unassigned', label: 'Unassigned', color: '#B4BCC5', tasks: byPerson['__unassigned'], stuckCount: 0 })
    }
    sections = personSections
  }

  function handleRowClick(task: Task) { setSelectedTask(task) }

  function handleAddTask(section: GroupedSection) {
    if (groupBy === 'company') openNewTask(section.key)
    else openNewTask()
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 9, marginBottom: 20, flexWrap: 'wrap' }}>
        <select value={groupBy} onChange={e => setGroupBy(e.target.value as any)}
          style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 9, padding: '9px 30px 9px 12px', appearance: 'none', cursor: 'pointer', backgroundImage: "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236B7480' stroke-width='1.7' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 11px center', minHeight: 44 }}>
          <option value="company">Group by company</option>
          <option value="person">Group by person</option>
        </select>
        <select value={filter} onChange={e => setFilter(e.target.value as any)}
          style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 9, padding: '9px 30px 9px 12px', appearance: 'none', cursor: 'pointer', backgroundImage: "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236B7480' stroke-width='1.7' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 11px center', minHeight: 44 }}>
          <option value="all">All tasks</option>
          <option value="stuck">Stuck only</option>
          <option value="week">Due this week</option>
          <option value="unassigned">Unassigned</option>
        </select>
      </div>

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      ) : (
        sections.map(section => (
          <BoardSection
            key={section.key}
            section={section}
            groupBy={groupBy}
            onRowClick={handleRowClick}
            onAddTask={me?.role === 'CEO' ? () => handleAddTask(section) : undefined}
          />
        ))
      )}

      {selectedTask && (
        <TaskDetailModal
          taskId={selectedTask.id}
          initialData={selectedTask as unknown as Record<string, unknown>}
          onClose={() => setSelectedTask(null)}
          onUpdated={() => { fetchTasks(); refreshCompanies() }}
        />
      )}
    </div>
  )
}

function BoardSection({ section, groupBy, onRowClick, onAddTask }: {
  section: GroupedSection
  groupBy: 'company' | 'person'
  onRowClick: (task: Task) => void
  onAddTask?: () => void
}) {
  const stuckLabel = section.stuckCount > 0 ? ` · ${section.stuckCount} stuck` : ''
  const isBehind = section.tasks.some(t => t.computedStatus === 'WAITING')

  return (
    <section style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 9, paddingLeft: 2, color: section.color }}>
        {section.label}
        <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--muted)' }}>
          {section.tasks.length} task{section.tasks.length !== 1 ? 's' : ''}{stuckLabel}
        </span>
      </div>

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 11 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 700 }}>
          <thead>
            <tr>
              <th style={thStyle}>Task</th>
              {groupBy === 'company' ? <th style={thStyle}>Owner</th> : <th style={thStyle}>Company</th>}
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Timeline</th>
              <th style={thStyle}>Due</th>
              <th style={thStyle}>Priority</th>
            </tr>
          </thead>
          <tbody>
            {section.tasks.map(task => (
              <TaskRow key={task.id} task={task} groupBy={groupBy} companyColor={section.color} onClick={() => onRowClick(task)} />
            ))}
            {onAddTask && (
              <tr onClick={onAddTask} style={{ cursor: 'pointer' }}>
                <td colSpan={6} style={{ padding: '9px 16px', color: 'var(--muted)', fontSize: 13.5 }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
                  + Add task{groupBy === 'company' ? ` to ${section.label}` : ''}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function TaskRow({ task, groupBy, companyColor, onClick }: { task: Task; groupBy: 'company' | 'person'; companyColor: string; onClick: () => void }) {
  const late = task.dueAt && isLate(task.dueAt) && task.status !== 'DONE'
  const pct = task.checklistPct ?? (task.status === 'DONE' ? 100 : task.status === 'WORKING' ? 50 : 0)

  return (
    <tr onClick={onClick} style={{ cursor: 'pointer' }}
      onMouseEnter={e => { for (const td of e.currentTarget.querySelectorAll('td')) (td as HTMLElement).style.background = '#FAFBFC' }}
      onMouseLeave={e => { for (const td of e.currentTarget.querySelectorAll('td')) (td as HTMLElement).style.background = '' }}>
      <td style={{ ...tdStyle, paddingLeft: 0, position: 'relative', fontWeight: 500, minWidth: 230 }}>
        <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: companyColor }} />
        <span style={{ paddingLeft: 16 }}>{task.title}</span>
      </td>
      <td style={tdStyle}>
        {groupBy === 'company' ? (
          task.assignee ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
              <Avatar name={task.assignee.displayName} size={27} />
              <span style={{ fontSize: 13.5 }}>{task.assignee.displayName}</span>
            </span>
          ) : <span style={{ color: 'var(--muted)', fontSize: 13 }}>—</span>
        ) : (
          task.company ? (
            <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 5, color: '#fff', background: task.company.color }}>{task.company.name}</span>
          ) : <span style={{ color: 'var(--muted)' }}>—</span>
        )}
      </td>
      <td style={tdStyle}>
        <StatusPill status={task.computedStatus} waitingHours={task.waitingHours} />
      </td>
      <td style={tdStyle}>
        <TimelineBar pct={pct} color={companyColor} />
      </td>
      <td style={{ ...tdStyle, fontSize: 13.5, whiteSpace: 'nowrap', color: late ? 'var(--stuck)' : undefined, fontWeight: late ? 600 : undefined }}>
        {formatDate(task.dueAt)}
      </td>
      <td style={tdStyle}>
        <PriorityBars priority={task.priority} />
      </td>
    </tr>
  )
}

const thStyle: React.CSSProperties = {
  fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', textAlign: 'left',
  padding: '10px 12px', borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap',
}
const tdStyle: React.CSSProperties = {
  padding: '11px 12px', borderBottom: '1px solid var(--line-soft)', verticalAlign: 'middle',
}
