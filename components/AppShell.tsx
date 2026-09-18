'use client'
import { useEffect, useState, createContext, useContext, useCallback } from 'react'
import { DEFAULT_TRANSLATIONS } from '@/lib/translations'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
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
  photoUrl?: string | null
  companies: { id: string; name: string; color: string }[]
}
export interface Company {
  id: string; name: string; color: string; openCount: number
  accentInk: string; accentText: string; bgTint: string; surfaceTint: string
  accentTop: string; accentRgb: string
  logoUrl?: string | null; markUrl?: string | null; logoLightUrl?: string | null
}
export interface AppUser { id: string; displayName: string; companyIds: string[] }

interface AppCtx {
  me: Me | null
  companies: Company[]
  users: AppUser[]
  activeCompany: string | null
  setActiveCompany: (id: string | null) => void
  refreshCompanies: () => void
  openNewTask: (companyId?: string) => void
  t: (key: string) => string
}
export const AppContext = createContext<AppCtx>({
  me: null, companies: [], users: [], activeCompany: null,
  setActiveCompany: () => {}, refreshCompanies: () => {}, openNewTask: () => {},
  t: (key: string) => DEFAULT_TRANSLATIONS[key]?.default ?? key,
})
export function useApp() { return useContext(AppContext) }

/* ── nav items ────────────────────────────────────────────────────── */
const NAV_KEYS = [
  { href: '/board',        tKey: 'nav.board',        icon: BoardIcon },
  { href: '/team',         tKey: 'nav.team',         icon: TeamIcon },
  { href: '/reports',      tKey: 'nav.reports',      icon: ReportsIcon,      ceoOnly: true },
  { href: '/people',       tKey: 'nav.people',       icon: PeopleIcon,       ceoOnly: true },
  { href: '/settings',     tKey: 'nav.settings',     icon: SettingsIcon,     ceoOnly: true },
  { href: '/translations', tKey: 'nav.translations', icon: TranslateIcon,    ceoOnly: true },
]

export default function AppShell({ children, initialMe, initialCompanies, initialUsers, initialTranslations }: {
  children: React.ReactNode
  initialMe: Me
  initialCompanies: Company[]
  initialUsers: AppUser[]
  initialTranslations: Record<string, string>
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [me] = useState<Me>(initialMe)
  const [companies, setCompanies] = useState<Company[]>(initialCompanies)
  const [users] = useState<AppUser[]>(initialUsers)
  const [activeCompany, setActiveCompany] = useState<string | null>(
    initialCompanies.find(c => c.name.toLowerCase() === 'joy')?.id ?? null
  )
  const [newTaskOpen, setNewTaskOpen] = useState(false)
  const [newTaskCompany, setNewTaskCompany] = useState<string | undefined>()
  const [translations] = useState<Record<string, string>>(initialTranslations)

  const t = useCallback((key: string): string => {
    return translations[key] ?? DEFAULT_TRANSLATIONS[key]?.default ?? key
  }, [translations])

  useEffect(() => {
    const co = activeCompany ? companies.find(c => c.id === activeCompany) : null
    const r = document.documentElement.style
    if (co) {
      r.setProperty('--paper',       co.bgTint)
      r.setProperty('--surface',     co.surfaceTint)
      r.setProperty('--accent',      co.color)
      r.setProperty('--accent-top',  co.accentTop)
      r.setProperty('--accent-ink',  co.accentInk)
      r.setProperty('--accent-text', co.accentText)
      r.setProperty('--accent-rgb',  co.accentRgb)
    } else {
      r.setProperty('--paper',       '#F4F6F8')
      r.setProperty('--surface',     '#FFFFFF')
      r.setProperty('--accent',      '#12181F')
      r.setProperty('--accent-top',  '#222C36')
      r.setProperty('--accent-ink',  '#FFFFFF')
      r.setProperty('--accent-text', '#12181F')
      r.setProperty('--accent-rgb',  '18,24,31')
    }
  }, [activeCompany, companies])

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

  const NAV = NAV_KEYS.map(n => ({ ...n, label: t(n.tKey) }))
  const visibleNav = NAV.filter(n => !n.ceoOnly || me?.role === 'CEO')
  const dateStr = format(new Date(), 'EEEE, d MMMM')

  return (
    <AppContext.Provider value={{ me, companies, users, activeCompany, setActiveCompany, refreshCompanies: fetchCompanies, openNewTask, t }}>
      {/* Sidebar / Rail */}
      <aside style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, width: 'var(--sb)',
        background: 'var(--surface)', borderRight: '1px solid var(--line)',
        padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 1, zIndex: 40,
      }} className="sidebar">
        {/* Brand / Logo slot */}
        <SidebarBrand activeCompany={activeCompany ? companies.find(c => c.id === activeCompany) ?? null : null} />

        {/* Nav */}
        {visibleNav.map(n => {
          const active = pathname.startsWith(n.href)
          return (
            <Link key={n.href} href={n.href} className={`nav-link${active ? ' nav-active' : ''}`}>
              <n.icon size={17} />
              {n.label.toUpperCase()}
            </Link>
          )
        })}

        {/* Companies filter */}
        <div style={{ height: 1, background: 'var(--line)', margin: '16px 10px 12px' }} />
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-3)', padding: '0 10px 8px', letterSpacing: '.1em', fontFamily: 'var(--font-noto-geo)', textTransform: 'uppercase' }}>
          {t('nav.companies')}
        </div>
        <CompanyFilter companies={companies} active={activeCompany} onChange={setActiveCompany} />

        {me && (
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 9, padding: '10px 10px', borderRadius: 10, cursor: 'pointer', transition: 'background-color .16s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--line-soft)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
            <div style={{ width: 28, height: 28, borderRadius: 9, overflow: 'hidden', flexShrink: 0 }}>
              <Avatar name={me.displayName} size={28} photoUrl={me.photoUrl} />
            </div>
            <span style={{ flex: 1, overflow: 'hidden' }}>
              <b style={{ color: 'var(--ink)', fontWeight: 600, display: 'block', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{me.displayName}</b>
              <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{me.role}</span>
            </span>
            <button onClick={handleLogout} title="Sign out" style={{ background: 'none', border: 0, color: 'var(--ink-3)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '2px 4px' }}>↪</button>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main style={{ marginLeft: 'var(--sb)', padding: '20px 30px 80px', maxWidth: 1200 }} className="main-content">
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '0.01em', textTransform: 'uppercase' }}>
              {(NAV.find(n => pathname.startsWith(n.href))?.label ?? t('nav.board')).toUpperCase()}
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: 13.5 }}>{dateStr}</p>
          </div>
          {me?.role === 'CEO' && (
            <button
              onClick={() => openNewTask(activeCompany ?? undefined)}
              className={`pbtn${activeCompany && companies.find(c => c.id === activeCompany)?.accentInk === '#12181F' ? ' onlight' : ''}`}
            >
              <span className="lead">
                <span className="ico"><PlusIcon /></span>
                New task
              </span>
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
            <Link key={n.href} href={n.href} style={{ flex: 1, color: active ? '#fff' : '#98A3B0', fontSize: 10.5, fontWeight: 600, padding: '6px 2px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minHeight: 44, textDecoration: 'none' }}>
              <n.icon size={19} />
              {n.label.toUpperCase()}
            </Link>
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

/* ── Sidebar brand slot ──────────────────────────────────────────── */
function SidebarBrand({ activeCompany }: { activeCompany: Company | null }) {
  if (!activeCompany) {
    return (
      <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em', padding: '4px 10px 16px', display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ width: 9, height: 9, borderRadius: 2, background: '#fff', display: 'block', transform: 'rotate(45deg)', flexShrink: 0 }} />
        itask.ge
      </div>
    )
  }
  return (
    <div style={{ padding: '4px 10px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      {activeCompany.logoUrl ? (
        <img src={activeCompany.logoUrl} alt={activeCompany.name} style={{ maxHeight: 26, maxWidth: 160, objectFit: 'contain', objectPosition: 'left' }} />
      ) : (
        <span style={{ fontSize: 16, fontWeight: 700, color: activeCompany.accentText }}>{activeCompany.name}</span>
      )}
      <span style={{ fontSize: 11, color: '#66707C' }}>itask.ge</span>
    </div>
  )
}

/* ── Company filter ───────────────────────────────────────────────── */
function CompanyFilter({ companies, active, onChange }: { companies: Company[], active: string | null, onChange: (id: string | null) => void }) {
  const totalOpen = companies.reduce((s, c) => s + c.openCount, 0)
  const coStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
    background: isActive ? 'var(--tint)' : 'none', border: 0,
    color: isActive ? 'var(--ink)' : 'var(--ink-3)',
    fontSize: 13, fontWeight: isActive ? 600 : 500,
    padding: '7px 10px', borderRadius: 9, cursor: 'pointer', textAlign: 'left',
    transition: 'background-color .16s, color .16s',
  })
  return (
    <>
      <button onClick={() => onChange(null)} style={coStyle(active === null)}>
        <span style={{ width: 7, height: 7, borderRadius: '2.5px', background: 'var(--ink-3)', flexShrink: 0 }} />
        All
        <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--ink-3)' }}>{totalOpen}</span>
      </button>
      {companies.map(c => (
        <button key={c.id} onClick={() => onChange(c.id)} style={coStyle(active === c.id)}>
          <span style={{ width: 7, height: 7, borderRadius: '2.5px', background: c.color, flexShrink: 0 }} />
          {c.name}
          <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--ink-3)' }}>{c.openCount}</span>
        </button>
      ))}
    </>
  )
}

/* ── Avatar ───────────────────────────────────────────────────────── */
export function Avatar({ name, size = 27, photoUrl }: { name: string; size?: number; photoUrl?: string | null }) {
  if (photoUrl) {
    return (
      <img src={photoUrl} alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block',
          boxShadow: '0 0 0 2px rgba(255,255,255,.9), 0 1px 3px rgba(8,9,11,.15)' }} />
    )
  }
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.42, fontWeight: 700, color: '#fff', background: avatarColor(name) }}>
      {initials(name)}
    </span>
  )
}

/* ── Status pill ──────────────────────────────────────────────────── */
const STATUS_CLASS: Record<string, string> = {
  NOT_STARTED: 'idle', WORKING: 'working', DONE: 'done', WAITING: 'stuck',
}
const STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: 'Not started', WORKING: 'Working on it', DONE: 'Done',
}
export function StatusPill({ status, waitingHours, onClick }: { status: string; waitingHours?: number | null; onClick?: () => void }) {
  const cls = STATUS_CLASS[status] ?? 'idle'
  const label = status === 'WAITING' ? `Waiting ${waitingHours ?? 0}h` : (STATUS_LABEL[status] ?? status)
  return (
    <button className={`st ${cls}`} onClick={onClick} type="button" style={{ pointerEvents: onClick ? 'auto' : 'none' }}>
      {label}
    </button>
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
function TranslateIcon({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/></svg>
}
