'use client'
import { useEffect, useState } from 'react'

interface Setting {
  handoffFlagHours: number
  requireReasonOnDueChange: boolean
  membersCanChangeDueDate: boolean
  checklistDrivesProgress: boolean
  membersSeeFunctionPeers: boolean
}

interface RecurringTemplate {
  id: string; title: string; companyId: string; assigneeId: string | null; frequency: string; weekdays: number[]; active: boolean
}
interface HandoffRule {
  id: string; companyId: string; fromTitlePattern: string; fromAssigneeId: string; toAssigneeId: string; newTitlePrefix: string; dueAfterHours: number; active: boolean
}
interface ChecklistTemplate { id: string; name: string; companyId: string | null; items: string[] }
interface Company { id: string; name: string; color: string }
interface User { id: string; displayName: string }

const FREQ_LABELS: Record<string, string> = { WEEKDAYS: 'Every weekday', WEEKLY: 'Weekly', TWICE_WEEKLY: 'Twice weekly' }

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting | null>(null)
  const [recurring, setRecurring] = useState<RecurringTemplate[]>([])
  const [handoffs, setHandoffs] = useState<HandoffRule[]>([])
  const [checklists, setChecklists] = useState<ChecklistTemplate[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [addCompanyOpen, setAddCompanyOpen] = useState(false)
  const [newCoName, setNewCoName] = useState('')
  const [newCoColor, setNewCoColor] = useState('#5B4BC4')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(setSettings).catch(() => {})
    fetch('/api/recurring').then(r => r.json()).then(setRecurring).catch(() => {})
    fetch('/api/handoff-rules').then(r => r.json()).then(setHandoffs).catch(() => {})
    fetch('/api/checklist-templates').then(r => r.json()).then(setChecklists).catch(() => {})
    fetch('/api/companies').then(r => r.json()).then(setCompanies).catch(() => {})
    fetch('/api/users?filter=active').then(r => r.json()).then(setUsers).catch(() => {})
  }, [])

  async function toggleSetting(key: keyof Setting, value: boolean | number) {
    const updated = { ...settings!, [key]: value }
    setSettings(updated)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    })
  }

  async function toggleRecurring(id: string, active: boolean) {
    await fetch('/api/recurring', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active }),
    })
    setRecurring(prev => prev.map(r => r.id === id ? { ...r, active } : r))
  }

  async function toggleHandoff(id: string, active: boolean) {
    await fetch('/api/handoff-rules', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active }),
    })
    setHandoffs(prev => prev.map(r => r.id === id ? { ...r, active } : r))
  }

  async function addCompany(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCoName, color: newCoColor }),
    })
    const res = await fetch('/api/companies')
    setCompanies(await res.json())
    setAddCompanyOpen(false)
    setNewCoName('')
    setSaving(false)
  }

  if (!settings) return <p style={{ color: 'var(--muted)' }}>Loading…</p>

  return (
    <div>
      {/* Rules */}
      <Panel title="Rules" desc="Applied automatically to every task. No one has to police them.">
        <Rule label="Flag a handoff left waiting" sub="Turns red on the board after 48 hours" value={settings.handoffFlagHours === 48} onToggle={v => toggleSetting('handoffFlagHours', v ? 48 : 0)} />
        <Rule label="Ask for a reason when a due date moves" sub="Required for everyone, including CEOs" value={settings.requireReasonOnDueChange} onToggle={v => toggleSetting('requireReasonOnDueChange', v)} />
        <Rule label="Let members change their own due dates" sub="Off means every change needs your approval" value={settings.membersCanChangeDueDate} onToggle={v => toggleSetting('membersCanChangeDueDate', v)} />
        <Rule label="Checklist drives progress" sub="Percentage comes from ticked items, not manual status" value={settings.checklistDrivesProgress} onToggle={v => toggleSetting('checklistDrivesProgress', v)} />
        <Rule label="Members see other people's numbers" sub="Only within their own function" value={settings.membersSeeFunctionPeers} onToggle={v => toggleSetting('membersSeeFunctionPeers', v)} />
      </Panel>

      {/* Recurring tasks */}
      <Panel title="Recurring tasks" desc="Generated automatically each morning with due dates already set.">
        {recurring.map(t => {
          const co = companies.find(c => c.id === t.companyId)
          const u = users.find(u => u.id === t.assigneeId)
          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--line-soft)', fontSize: 14 }}>
              {co && <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 5, color: '#fff', background: co.color }}>{co.name}</span>}
              <span style={{ flex: 1, color: t.active ? undefined : 'var(--muted)', textDecoration: t.active ? undefined : 'line-through' }}>
                {t.title} {u ? `· ${u.displayName}` : ''}
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--muted)', whiteSpace: 'nowrap', marginRight: 8 }}>{FREQ_LABELS[t.frequency] ?? t.frequency}</span>
              <Toggle value={t.active} onToggle={v => toggleRecurring(t.id, v)} />
            </div>
          )
        })}
      </Panel>

      {/* Handoff chains */}
      <Panel title="Handoff chains" desc="When the first task is finished, the next one is created on its own.">
        {handoffs.map(h => {
          const co = companies.find(c => c.id === h.companyId)
          const from = users.find(u => u.id === h.fromAssigneeId)
          const to = users.find(u => u.id === h.toAssigneeId)
          return (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--line-soft)', fontSize: 14 }}>
              {co && <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 5, color: '#fff', background: co.color }}>{co.name}</span>}
              <span style={{ flex: 1, color: h.active ? undefined : 'var(--muted)' }}>
                {h.fromTitlePattern.replace(' — ', '')} → {h.newTitlePrefix.replace(' — ', '')} · {from?.displayName} to {to?.displayName}
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--muted)', whiteSpace: 'nowrap', marginRight: 8 }}>Due {h.dueAfterHours}h after</span>
              <Toggle value={h.active} onToggle={v => toggleHandoff(h.id, v)} />
            </div>
          )
        })}
      </Panel>

      {/* Checklist templates */}
      <Panel title="Checklist templates" desc="Attached to a task type so the steps appear pre-filled.">
        {checklists.map(t => {
          const co = companies.find(c => c.id === t.companyId)
          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--line-soft)', fontSize: 14 }}>
              {co && <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 5, color: '#fff', background: co.color }}>{co.name}</span>}
              <span style={{ flex: 1 }}>{t.name}</span>
              <span style={{ fontSize: 12.5, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{t.items.length} steps</span>
            </div>
          )
        })}
      </Panel>

      {/* Companies */}
      <Panel title="Companies" desc="Adding one takes a minute and needs no developer work.">
        {companies.map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--line-soft)', fontSize: 14 }}>
            <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 5, color: '#fff', background: c.color }}>{c.name}</span>
            <span style={{ flex: 1 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: c.color, display: 'inline-block', marginRight: 6, verticalAlign: -2 }} />
              {c.color}
            </span>
          </div>
        ))}
        <div style={{ paddingTop: 12 }}>
          {!addCompanyOpen ? (
            <button onClick={() => setAddCompanyOpen(true)} style={{ fontSize: 13.5, color: 'var(--muted)', border: '1px dashed var(--line)', background: 'none', borderRadius: 9, padding: '9px 14px', cursor: 'pointer', minHeight: 44 }}>
              + Add company
            </button>
          ) : (
            <form onSubmit={addCompany} style={{ display: 'flex', gap: 9, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label style={lblStyle}>Name</label>
                <input value={newCoName} onChange={e => setNewCoName(e.target.value)} required placeholder="Company name"
                  style={{ fontSize: 14, color: 'var(--ink)', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 9, padding: '9px 12px' }} />
              </div>
              <div>
                <label style={lblStyle}>Colour</label>
                <input type="color" value={newCoColor} onChange={e => setNewCoColor(e.target.value)}
                  style={{ height: 40, width: 48, borderRadius: 9, border: '1px solid var(--line)', cursor: 'pointer', padding: 2 }} />
              </div>
              <button type="submit" disabled={saving} style={{ background: 'var(--ink)', color: '#fff', border: 0, borderRadius: 9, padding: '9px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 44 }}>
                {saving ? 'Adding…' : 'Add'}
              </button>
              <button type="button" onClick={() => setAddCompanyOpen(false)} style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 9, padding: '9px 14px', fontSize: 14, cursor: 'pointer', minHeight: 44 }}>
                Cancel
              </button>
            </form>
          )}
        </div>
      </Panel>
    </div>
  )
}

function Panel({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 11, padding: '16px 18px', marginBottom: 12 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 4 }}>{title}</h3>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 13 }}>{desc}</p>
      {children}
    </div>
  )
}

function Rule({ label, sub, value, onToggle }: { label: string; sub: string; value: boolean; onToggle: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 13, padding: '11px 0', borderBottom: '1px solid var(--line-soft)', fontSize: 14 }}>
      <div>
        {label}
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>
      </div>
      <Toggle value={value} onToggle={onToggle} />
    </div>
  )
}

function Toggle({ value, onToggle }: { value: boolean; onToggle: (v: boolean) => void }) {
  return (
    <button onClick={() => onToggle(!value)} aria-label={value ? 'On' : 'Off'}
      style={{ width: 42, height: 24, borderRadius: 13, background: value ? 'var(--done)' : '#C9D0D8', position: 'relative', border: 0, cursor: 'pointer', flexShrink: 0, transition: 'background .18s' }}>
      <span style={{ position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', left: value ? 'auto' : 3, right: value ? 3 : 'auto', transition: 'left .18s, right .18s' }} />
    </button>
  )
}

const lblStyle: React.CSSProperties = { display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }
