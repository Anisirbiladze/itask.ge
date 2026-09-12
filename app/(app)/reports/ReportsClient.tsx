'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/components/AppShell'

interface ReportData {
  summary: { done: number; onTimePct: number; pushes: number; avgLate: number }
  byPerson: { userId: string; name: string; done: number; onTimePct: number; avgLate: number; pushes: number; open: number }[]
  byCompany: { companyId: string; name: string; color: string; done: number; onTimePct: number; pushes: number; open: number; people: number }[]
}

export default function ReportsClient({ initialData }: { initialData: ReportData }) {
  const { companies } = useApp()
  const [data, setData] = useState<ReportData>(initialData)
  const [period, setPeriod] = useState('last30')
  const [companyId, setCompanyId] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialRender, setInitialRender] = useState(true)

  useEffect(() => {
    if (initialRender) { setInitialRender(false); return }
    setLoading(true)
    const p = new URLSearchParams({ period })
    if (companyId) p.set('companyId', companyId)
    fetch(`/api/reports?${p}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [period, companyId])

  function exportCSV() {
    const rows = [
      ['Person', 'Done', 'On time %', 'Avg late (days)', 'Pushes', 'Open now'],
      ...data.byPerson.map(p => [p.name, p.done, p.onTimePct, p.avgLate, p.pushes, p.open]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `itask-report-${period}.csv`
    a.click()
  }

  const selStyle: React.CSSProperties = {
    fontSize: 14, color: 'var(--ink)', fontWeight: 500, background: 'var(--surface)',
    border: '1px solid var(--line)', borderRadius: 9, padding: '9px 30px 9px 12px',
    appearance: 'none', cursor: 'pointer', minHeight: 44,
    backgroundImage: "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236B7480' stroke-width='1.7' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 11px center',
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 9, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={period} onChange={e => setPeriod(e.target.value)} style={selStyle}>
          <option value="last30">Last 30 days</option>
          <option value="week">This week</option>
          <option value="quarter">This quarter</option>
        </select>
        <select value={companyId} onChange={e => setCompanyId(e.target.value)} style={selStyle}>
          <option value="">All companies</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={exportCSV} style={{ ...selStyle, padding: '9px 16px', fontWeight: 600 }}>Export CSV</button>
      </div>

      {loading ? <p style={{ color: 'var(--muted)' }}>Loading…</p> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(168px,1fr))', gap: 10, marginBottom: 22 }}>
            <div style={cardStyle}><b style={bigNum}>{data.summary.done}</b><span style={cardLbl}>tasks completed</span></div>
            <div style={cardStyle}><b style={{ ...bigNum, color: data.summary.onTimePct >= 75 ? 'var(--done)' : data.summary.onTimePct >= 50 ? 'var(--working)' : 'var(--stuck)' }}>{data.summary.onTimePct}%</b><span style={cardLbl}>finished on time</span></div>
            <div style={cardStyle}><b style={{ ...bigNum, color: 'var(--stuck)' }}>{data.summary.pushes}</b><span style={cardLbl}>due dates pushed</span></div>
            <div style={cardStyle}><b style={bigNum}>{data.summary.avgLate}</b><span style={cardLbl}>avg days late</span><i style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)', marginTop: 5 }}>when late</i></div>
          </div>

          <h2 style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', margin: '24px 0 10px' }}>By person</h2>
          <div style={{ overflowX: 'auto', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 11 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 600 }}>
              <thead><tr>{['Person','Done','On time','Avg late','Pushes','Open now'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
              <tbody>
                {data.byPerson.map(p => (
                  <tr key={p.userId}>
                    <td style={tdStyle}>{p.name}</td>
                    <td style={tdStyle}>{p.done}</td>
                    <td style={tdStyle}><OnTimeCell pct={p.onTimePct} /></td>
                    <td style={tdStyle}>{p.avgLate > 0 ? `${p.avgLate}d` : '—'}</td>
                    <td style={{ ...tdStyle, fontWeight: 600, color: p.pushes >= 5 ? 'var(--stuck)' : undefined }}>{p.pushes}</td>
                    <td style={tdStyle}>{p.open}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', margin: '24px 0 10px' }}>By company</h2>
          <div style={{ overflowX: 'auto', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 11 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 500 }}>
              <thead><tr>{['Company','Done','On time','Pushes','Open now','People'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
              <tbody>
                {data.byCompany.map(c => (
                  <tr key={c.companyId}>
                    <td style={tdStyle}><span style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />{c.name}</span></td>
                    <td style={tdStyle}>{c.done}</td>
                    <td style={tdStyle}><OnTimeCell pct={c.onTimePct} /></td>
                    <td style={{ ...tdStyle, fontWeight: 600, color: c.pushes >= 10 ? 'var(--stuck)' : undefined }}>{c.pushes}</td>
                    <td style={tdStyle}>{c.open}</td>
                    <td style={tdStyle}>{c.people}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function OnTimeCell({ pct }: { pct: number }) {
  const color = pct >= 75 ? 'var(--done)' : pct >= 50 ? 'var(--working)' : 'var(--stuck)'
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 132 }}>
      <span style={{ flex: 1, height: 6, background: 'var(--line-soft)', borderRadius: 3, overflow: 'hidden' }}>
        <i style={{ display: 'block', height: '100%', borderRadius: 3, background: color, width: `${pct}%` }} />
      </span>
      <b style={{ fontSize: 13, fontWeight: 600, minWidth: 34, textAlign: 'right' }}>{pct}%</b>
    </span>
  )
}

const cardStyle: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 11, padding: '14px 15px' }
const bigNum: React.CSSProperties = { display: 'block', fontSize: 25, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15 }
const cardLbl: React.CSSProperties = { fontSize: 12.5, color: 'var(--muted)' }
const thStyle: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap' }
const tdStyle: React.CSSProperties = { padding: '11px 12px', borderBottom: '1px solid var(--line-soft)', verticalAlign: 'middle' }
