'use client'
import { useEffect, useState } from 'react'
import { Avatar, StatusPill } from '@/components/AppShell'
import { formatDate } from '@/lib/utils'

interface TeamUser {
  id: string
  displayName: string
  functionGroup: string
  companies: { id: string; name: string; color: string }[]
  tasks: { id: string; title: string; status: string; computedStatus: string; waitingHours: number | null; dueAt: string | null; company: { name: string; color: string } | null }[]
  totalTasks: number
  doneTasks: number
  progressPct: number
  isBehind: boolean
  stuckCount: number
}

interface TeamData {
  groups: Record<string, TeamUser[]>
  summary: { doneToday: number; peopleBehind: number; stuckOver48h: number; unassigned: number }
}

const GROUP_ORDER = ['Video production', 'Design & post-production', 'Sales', 'Support', 'Product & systems', 'Admin', 'Other']

export default function TeamPage() {
  const [data, setData] = useState<TeamData | null>(null)
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/team').then(r => r.json()).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  function toggle(id: string) {
    setOpen(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  if (loading) return <p style={{ color: 'var(--muted)' }}>Loading…</p>
  if (!data) return <p style={{ color: 'var(--stuck)' }}>Could not load team data. You may need CEO access.</p>

  const orderedGroups = GROUP_ORDER.filter(g => data.groups[g]?.length).map(g => [g, data.groups[g]] as [string, TeamUser[]])
  const extraGroups = Object.entries(data.groups).filter(([g]) => !GROUP_ORDER.includes(g))

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(168px,1fr))', gap: 10, marginBottom: 22 }}>
        <SummaryCard value={data.summary.doneToday} label="tasks done today" />
        <SummaryCard value={data.summary.peopleBehind} label="people behind" warn={data.summary.peopleBehind > 0} />
        <SummaryCard value={data.summary.stuckOver48h} label="stuck over 48h" warn={data.summary.stuckOver48h > 0} />
        <SummaryCard value={data.summary.unassigned} label="tasks unassigned" />
      </div>

      {[...orderedGroups, ...extraGroups].map(([group, users]) => (
        <div key={group}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', padding: '0 3px 7px', borderBottom: '1px solid var(--line)', margin: '20px 0 9px' }}>
            {group}
          </div>
          {users.map(u => (
            <PersonRow key={u.id} user={u} isOpen={open.has(u.id)} onToggle={() => toggle(u.id)} />
          ))}
        </div>
      ))}
    </div>
  )
}

function SummaryCard({ value, label, warn }: { value: number; label: string; warn?: boolean }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 11, padding: '14px 15px' }}>
      <b style={{ display: 'block', fontSize: 25, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, color: warn ? 'var(--stuck)' : undefined }}>{value}</b>
      <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{label}</span>
    </div>
  )
}

function PersonRow({ user, isOpen, onToggle }: { user: TeamUser; isOpen: boolean; onToggle: () => void }) {
  const mainColor = user.companies[0]?.color ?? 'var(--done)'
  const pct = user.progressPct
  const circumference = 2 * Math.PI * 14
  const dashOffset = circumference * (1 - pct / 100)

  return (
    <article style={{
      background: 'var(--surface)', border: `1px solid var(--line)`,
      borderLeft: user.isBehind ? '3px solid var(--working)' : '1px solid var(--line)',
      borderRadius: 11, marginBottom: 7, overflow: 'hidden',
    }}>
      <button onClick={onToggle} style={{
        width: '100%', background: 'none', border: 0, textAlign: 'left', padding: '13px 14px',
        display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 13, alignItems: 'center', cursor: 'pointer',
      }}>
        <span>
          <span style={{ fontSize: 15.5, fontWeight: 600, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
            {user.displayName}
            {/* Company dots */}
            <span style={{ display: 'inline-flex', gap: 3, marginLeft: 3, verticalAlign: '1px' }}>
              {user.companies.map(c => (
                <span key={c.id} style={{ width: 7, height: 7, borderRadius: '50%', background: c.color, display: 'inline-block' }} />
              ))}
            </span>
          </span>
          <span style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3, display: 'block' }}>
            {user.doneTasks} of {user.totalTasks} tasks done
            {user.isBehind && <b style={{ color: 'var(--working)', fontWeight: 600 }}> · behind</b>}
            {user.stuckCount > 0 && <b style={{ color: 'var(--stuck)', fontWeight: 600 }}> · {user.stuckCount} stuck</b>}
          </span>
        </span>

        {/* Progress ring */}
        <span style={{ position: 'relative', width: 34, height: 34, flexShrink: 0, display: 'block' }}>
          <svg width={34} height={34} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
            <circle cx={17} cy={17} r={14} fill="none" stroke="#EAEEF2" strokeWidth={4} />
            <circle cx={17} cy={17} r={14} fill="none" stroke={user.isBehind ? 'var(--working)' : mainColor} strokeWidth={4} strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={dashOffset} style={{ transition: 'stroke-dashoffset .3s' }} />
          </svg>
          <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 700, fontStyle: 'normal' }}>
            {pct}%
          </span>
        </span>

        {/* Chevron */}
        <span style={{ width: 11, height: 11, borderRight: '2px solid #A6AFB9', borderBottom: '2px solid #A6AFB9', transform: isOpen ? 'rotate(-135deg)' : 'rotate(45deg)', marginRight: 3, display: 'block', transition: 'transform .18s' }} />
      </button>

      {isOpen && (
        <div style={{ padding: '0 14px 13px', borderTop: '1px solid var(--line-soft)' }}>
          {user.tasks.map(t => (
            <div key={t.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--line-soft)', fontSize: 14 }}>
              {t.company && (
                <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 5, color: '#fff', background: t.company.color }}>{t.company.name}</span>
              )}
              <span style={{ color: t.status === 'DONE' ? 'var(--muted)' : undefined, textDecoration: t.status === 'DONE' ? 'line-through' : undefined }}>
                {t.title}
              </span>
              <StatusPill status={t.computedStatus} waitingHours={t.waitingHours} />
            </div>
          ))}
          {user.tasks.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13.5, paddingTop: 10 }}>No open tasks.</p>}
        </div>
      )}
    </article>
  )
}
