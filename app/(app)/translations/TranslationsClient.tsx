'use client'
import { useState } from 'react'
import { DEFAULT_TRANSLATIONS, PAGE_LABELS, PAGES } from '@/lib/translations'

export default function TranslationsClient({ saved }: { saved: Record<string, string> }) {
  const [activePage, setActivePage] = useState<string>('global')
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const [key, entry] of Object.entries(DEFAULT_TRANSLATIONS)) {
      initial[key] = saved[key] ?? entry.default
    }
    return initial
  })
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)
  const [saveError, setSaveError] = useState('')

  const pageKeys = Object.entries(DEFAULT_TRANSLATIONS).filter(([, e]) => e.page === activePage)

  async function handleSave() {
    setSaving(true); setSaveError('')
    try {
      const updates = Object.entries(values).map(([key, value]) => ({
        key, page: DEFAULT_TRANSLATIONS[key].page, value,
      }))
      const res = await fetch('/api/translations', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setSaveError(d.error ?? `Save failed (${res.status})`)
      } else {
        setSavedMsg(true)
        setTimeout(() => setSavedMsg(false), 2500)
      }
    } catch (e) {
      setSaveError('Network error — could not reach server')
    }
    setSaving(false)
  }

  return (
    <div>
      {/* Page tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 22 }}>
        {PAGES.map(p => (
          <button key={p} onClick={() => setActivePage(p)} style={{
            padding: '8px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            border: activePage === p ? '2px solid var(--accent)' : '1px solid var(--line)',
            background: activePage === p ? 'var(--accent)' : 'var(--surface)',
            color: activePage === p ? 'var(--accent-ink)' : 'var(--ink)',
            textTransform: 'uppercase', letterSpacing: '.04em',
            transition: 'all .13s',
          }}>
            {PAGE_LABELS[p]}
          </button>
        ))}

        <button onClick={handleSave} disabled={saving} style={{
          marginLeft: 'auto', padding: '8px 22px', borderRadius: 999, fontSize: 13, fontWeight: 700,
          border: 0, background: 'var(--done)', color: '#fff', cursor: 'pointer',
          textTransform: 'uppercase', letterSpacing: '.05em', opacity: saving ? 0.6 : 1,
          transition: 'opacity .13s',
        }}>
          {savedMsg ? '✓ Saved' : saving ? 'Saving…' : 'Save all'}
        </button>
      </div>
      {saveError && <p style={{ color: 'var(--stuck)', fontSize: 13, marginBottom: 10 }}>⚠ {saveError}</p>}

      {/* Strings table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={thS}>Key</th>
              <th style={thS}>Default (EN)</th>
              <th style={{ ...thS, width: '40%' }}>Translation</th>
            </tr>
          </thead>
          <tbody>
            {pageKeys.map(([key, entry]) => (
              <tr key={key} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                <td style={{ ...tdS, fontFamily: 'monospace', fontSize: 12, color: 'var(--muted)' }}>{key}</td>
                <td style={{ ...tdS, color: 'var(--muted)', fontSize: 13.5 }}>{entry.default}</td>
                <td style={tdS}>
                  <input
                    value={values[key] ?? ''}
                    onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))}
                    style={{
                      width: '100%', border: '1px solid var(--line)', borderRadius: 8,
                      padding: '8px 11px', fontSize: 14, fontFamily: 'inherit',
                      background: 'var(--paper)', color: 'var(--ink)',
                      outline: 'none', transition: 'border-color .13s',
                    }}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--line)')}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 14, fontSize: 12.5, color: 'var(--muted)' }}>
        {pageKeys.length} strings on this page · Changes apply after next page reload
      </p>
    </div>
  )
}

const thS: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--muted)', textAlign: 'left',
  padding: '10px 14px', borderBottom: '1px solid var(--line)',
  textTransform: 'uppercase', letterSpacing: '.06em',
}
const tdS: React.CSSProperties = {
  padding: '9px 14px', verticalAlign: 'middle', fontSize: 13.5,
}
