'use client'
import { useEffect, useState, createContext, useContext } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { avatarColor, initials } from '@/lib/utils'
import NewTaskModal from '@/components/NewTaskModal'

/* ── shared context ───────────────────────────────────────────────── */
export interface Me {
  id: string
  displayName: string
  role: 'CEO' | 'MEMBER'
  mustChangePw: boolean
  functionGroup: string
  companies: { id: string; name: string; color: string }[]
}
export interface Company { id: string; name: string; color: string; openCount: number }

interface AppCtx {
  me: Me | null
  companies: Company[]
  activeCompany: string | null   // null = All
  setActiveCompany: (id: string | null) => void
  refreshCompanies: () => void
  openNewTask: (companyId?: string) => void
}
export const AppContext = createContext<AppCtx>({
  me: null, companies: [], activeCompany: null,
  setActiveCompany: () => {}, refreshCompanies: () => {}, openNewTask: () => {},
})
export function useApp() { return useContext(AppContext) }

/* ── nav items ────────────────────────────────────────────────────── */
const NAV = [
  { href: '/board',    label: 'Board',    icon: BoardIcon },
  { href: '/team',     label: 'Team',     icon: TeamIcon },
  { href: '/reports',  label: 'Reports',  icon: ReportsIcon,  ceoOnly: true },
  { href: '/people',   label: 'People',   icon: PeopleIcon,   ceoOnly: true },
  { href: '/settings', label: 'Settings', icon: SettingsIcon, ceoOnly: true },
]

export default function AppShell({ children, initialMe, initialCompanies }: {
  children: React.ReactNode
  initialMe: Me
  initialCompanies: Company[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [me] = useState<Me>(initialMe)
  const [companies, setCompanies] = useState<Company[]>(initialCompanies)
  const [activeCompany, setActiveCompany] = useState<string | null>(null)
  const [newTaskOpen, setNewTaskOpen] = useState(false)
  const [newTaskCompany, setNewTaskCompany] = useState<string | undefined>()

  function fetchCompanies() {
    fetch('/api/companies')
      .then(r => r.json())
      .then(setCompanies)
      .catch(() => {})
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  function openNewTask(companyId?: string) {
    setNewTaskCompany(companyId)
    setNewTaskOpen(true)
  }

  const visibleNav = NAV.filter(n => !n.ceoOnly || me?.role === 'CEO')
  const dateStr = format(new Date(), 'EEEE, d MMMM')

  return (
    <AppContext.Provider value={{ me, companies, activeCompany, setActiveCompany, refreshCompanies: fetchCompanies, openNewTask }}>
      {/* Sidebar */}
      <aside style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, width: 'var(--sb)',
        background: 'var(--nav)', padding: '18px 12px',
        display: 'flex', flexDirection: 'column', gap: 4, zIndex: 40,
      }} className="sidebar">
        {/* Brand */}
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em', padding: '4px 10px 16px', display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: '#fff', display: 'block', transform: 'rotate(45deg)', flexShrink: 0 }} />
          itask.ge
        </div>

        {/* Nav */}
        {visibleNav.map(n => {
          const active = pathname.startsWith(n.href)
          return (
            <button key={n.href}
              onClick={() => router.push(n.href)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                background: active ? 'rgba(255,255,255,.11)' : 'none',
                border: 0, color: active ? '#fff' : '#98A3B0',
                fontSize: 14, fontWeight: active ? 600 : 500,
                padding: '9px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
              }}
            >
              <n.icon size={17} />
              {n.label}
            </button>
          )
        })}

        {/* Companies filter */}
        <div style={{ fontSize: 10.5, fontWeight: 600, color: '#66707C', padding: '18px 10px 7px', letterSpacing: '.03em' }}>
          COMPANIES
        </div>
        <CompanyFilter companies={companies} active={activeCompany} onChange={setActiveCompany} />

        {/* Me */}
        {me && (
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 9, padding: 10, borderTop: '1px solid rgba(255,255,255,.09)', color: '#98A3B0', fontSize: 13 }}>
            <Avatar name={me.displayName} size={27} />
            <span style={{ flex: 1, overflow: 'hidden' }}>
              <b style={{ color: '#fff', fontWeight: 600, display: 'block', fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{me.displayName}</b>
              <span style={{ fontSize: 11.5 }}>{me.role}</span>
            </span>
            <button onClick={handleLogout} title="Sign out" style={{ background: 'none', border: 0, color: '#66707C', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '2px 4px' }}>
              ↪
            </button>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main style={{ marginLeft: 'var(--sb)', padding: '20px 24px 70px', maxWidth: 1180 }} className="main-content">
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>
              {NAV.find(n => pathname.startsWith(n.href))?.label ?? 'Board'}
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: 13.5 }}>{dateStr}</p>
          </div>
          {me?.role === 'CEO' && (
            <button onClick={() => openNewTask()} style={{ background: 'var(--ink)', color: '#fff', border: 0, borderRadius: 9, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, minHeight: 44 }}>
              <PlusIcon /> New task
            </button>
          )}
        </div>

        {children}
      </main>

      {/* Mobile bottom tab bar */}
      <nav style={{
        display: 'none', position: 'fixed', left: 0, right: 0, bottom: 0,
        background: 'var(--nav)', padding: '7px 6px calc(7px + env(safe-area-inset-bottom))',
        zIndex: 50,
      }} className="mobar">
        {visibleNav.slice(0, 5).map(n => {
          const active = pathname.startsWith(n.href)
          return (
            <button key={n.href} onClick={() => router.push(n.href)} style={{ flex: 1, background: 'none', border: 0, color: active ? '#fff' : '#98A3B0', fontSize: 10.5, fontWeight: 600, padding: '6px 2px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', minHeight: 44 }}>
              <n.icon size={19} />
              {n.label}
            </button>
          )
        })}
      </nav>

      {newTaskOpen && (
        <NewTaskModal
          companies={companies}
          defaultCompanyId={newTaskCompany}
          onClose={() => setNewTaskOpen(false)}
          onCreated={() => { setNewTaskOpen(false); fetchCompanies() }}
        />
      )}

      <style>{`
        .sidebar { display: flex !important; }
        .mobar { display: none !important; }
        @media (max-width: 860px) {
          .sidebar { display: none !important; }
          .mobar { display: flex !important; }
          .main-content { margin-left: 0 !important; padding: 16px 14px 86px !important; }
          h1 { font-size: 21px !important; }
        }
      `}</style>
    </AppContext.Provider>
  )
}

/* ── Company filter ───────────────────────────────────────────────── */
function CompanyFilter({ companies, active, onChange }: { companies: Company[], active: string | null, onChange: (id: string | null) => void }) {
  const totalOpen = companies.reduce((s, c) => s + c.openCount, 0)
  return (
    <>
      <button onClick={() => onChange(null)} style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', background: active === null ? 'rgba(255,255,255,.11)' : 'none', border: 0, color: active === null ? '#fff' : '#98A3B0', fontSize: 13.5, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', minHeight: 44 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#66707C', flexShrink: 0 }} />
        All
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#66707C' }}>{totalOpen}</span>
      </button>
      {companies.map(c => (
        <button key={c.id} onClick={() => onChange(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', background: active === c.id ? 'rgba(255,255,255,.11)' : 'none', border: 0, color: active === c.id ? '#fff' : '#98A3B0', fontSize: 13.5, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', minHeight: 44 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0, opacity: 0.9 }} />
          {c.name}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#66707C' }}>{c.openCount}</span>
        </button>
      ))}
    </>
  )
}

/* ── Avatar ───────────────────────────────────────────────────────── */
export function Avatar({ name, size = 27 }: { name: string; size?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.42, fontWeight: 700, color: '#fff', background: avatarColor(name) }}>
      {initials(name)}
    </span>
  )
}

/* ── Status pill ──────────────────────────────────────────────────── */
export function StatusPill({ status, waitingHours }: { status: string; waitingHours?: number | null }) {
  const map: Record<string, [string, string]> = {
    NOT_STARTED: ['#B4BCC5', 'Not started'],
    WORKING:     ['#E0A020', 'Working on it'],
    DONE:        ['#2E9E63', 'Done'],
    WAITING:     ['#DC4A3D', `Waiting ${waitingHours ?? 0}h`],
  }
  const [bg, label] = map[status] ?? ['#B4BCC5', status]
  return (
    <span style={{ display: 'inline-block', textAlign: 'center', color: '#fff', fontSize: 12.5, fontWeight: 600, padding: '6px 10px', borderRadius: 6, whiteSpace: 'nowrap', minWidth: 104, background: bg }}>
      {label}
    </span>
  )
}

/* ── Priority bars ────────────────────────────────────────────────── */
export function PriorityBars({ priority }: { priority: number }) {
  const p1 = priority >= 1 ? (priority === 1 ? '#94A0AD' : priority === 2 ? '#E0A020' : '#DC4A3D') : 'var(--line)'
  const p2 = priority >= 2 ? (priority === 2 ? '#E0A020' : '#DC4A3D') : 'var(--line)'
  const p3 = priority >= 3 ? '#DC4A3D' : 'var(--line)'
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'flex-end', height: 14 }}>
      <b style={{ width: 4, height: 6,  borderRadius: 1, background: p1, display: 'block' }} />
      <b style={{ width: 4, height: 10, borderRadius: 1, background: p2, display: 'block' }} />
      <b style={{ width: 4, height: 14, borderRadius: 1, background: p3, display: 'block' }} />
    </span>
  )
}

/* ── Progress bar ─────────────────────────────────────────────────── */
export function TimelineBar({ pct, color }: { pct: number; color: string }) {
  return (
    <span style={{ width: 104, height: 7, background: 'var(--line-soft)', borderRadius: 4, overflow: 'hidden', display: 'block' }}>
      <i style={{ display: 'block', height: '100%', borderRadius: 4, background: color, width: `${Math.min(100, pct)}%` }} />
    </span>
  )
}

/* ── Icons ────────────────────────────────────────────────────────── */
function BoardIcon({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="11" rx="1"/></svg>
}
function TeamIcon({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0112 0"/><path d="M16 5.5a3.2 3.2 0 010 5.4M17 20a6 6 0 00-1.5-4"/></svg>
}
function ReportsIcon({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M5 19V11M12 19V5M19 19v-6"/></svg>
}
function PeopleIcon({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="8" r="3.4"/><path d="M5 20a7 7 0 0114 0"/></svg>
}
function SettingsIcon({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-2.7 1.1V21a2 2 0 11-4 0v-.1A1.6 1.6 0 007.5 19.4l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.6 1.6 0 003 15H3a2 2 0 110-4h.1A1.6 1.6 0 004.6 7.5l-.1-.1a2 2 0 112.8-2.8l.1.1A1.6 1.6 0 009 3.1V3a2 2 0 114 0v.1a1.6 1.6 0 002.7 1.1l.1-.1a2 2 0 112.8 2.8l-.1.1A1.6 1.6 0 0021 11h.1a2 2 0 110 4H21"/></svg>
}
function PlusIcon() {
  return <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
}
