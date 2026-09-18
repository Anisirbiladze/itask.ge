'use client'
import { useState, useEffect, useCallback } from 'react'
import { normalizePhone } from '@/lib/normalizePhone'

/* ── types ── */
interface LiveSession { id: string; label: string; dateKey: string; createdAt: string }
interface LiveSale { id: string; sessionId: string; phone: string; username: string; price: number; paid: boolean; isFirst: boolean; createdAt: string }
interface CustGroup { phone: string; username: string; items: LiveSale[] }

/* ── helpers ── */
function fmt(n: number) { return Math.round(n).toLocaleString('ka-GE') + ' ₾' }
function groupByPhone(sales: LiveSale[]): CustGroup[] {
  const map: Record<string, CustGroup> = {}
  const sorted = sales.slice().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  for (const s of sorted) {
    const key = normalizePhone(s.phone)
    if (!map[key]) map[key] = { phone: key, username: '', items: [] }
    if (s.username) map[key].username = s.username
    map[key].items.push(s)
  }
  return Object.values(map)
}
function custTotals(items: LiveSale[]) {
  let total = 0, paid = 0
  for (const i of items) { total += Number(i.price); if (i.paid) paid += Number(i.price) }
  return { total, paid, due: total - paid }
}
function waHref(phone: string) {
  const n = normalizePhone(phone)
  return `https://wa.me/995${n}`
}

/* ── tokens ── */
const S: React.CSSProperties = { fontFamily: "'IBM Plex Mono', 'SF Mono', monospace" }

function WaBtn({ phone }: { phone: string }) {
  return (
    <a className="live-wa-btn" href={waHref(phone)} target="_blank" rel="noopener" title="WhatsApp" onClick={e => e.stopPropagation()}>
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm5.2 14.3c-.2.6-1.3 1.2-1.8 1.3-.5.1-1 .1-1.7-.1-.4-.1-.9-.3-1.5-.6-2.6-1.1-4.3-3.7-4.4-3.9-.1-.2-1-1.3-1-2.5s.6-1.8.8-2c.2-.2.5-.3.6-.3h.5c.2 0 .4 0 .5.4.2.5.7 1.7.7 1.8.1.1.1.3 0 .4-.4.8-.8 1-.9 1.2-.1.2-.1.3 0 .5.3.6 1 1.3 1.6 1.8.7.6 1.3.9 1.6 1 .2.1.4.1.5-.1.2-.2.7-.8.9-1.1.2-.2.3-.2.5-.1l1.6.8c.2.1.4.2.4.3.1.2.1.6-.1 1.1Z"/>
      </svg>
    </a>
  )
}

export default function LiveClient() {
  const [tab, setTab] = useState<'live' | 'customers' | 'report'>('live')
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [sales, setSales] = useState<LiveSale[]>([])
  const [allSales, setAllSales] = useState<LiveSale[]>([])

  /* add form */
  const [fPhone, setFPhone] = useState('')
  const [fUser, setFUser] = useState('')
  const [fPrice, setFPrice] = useState('')
  const [hint, setHint] = useState<{ text: string; good: boolean } | null>(null)
  const [adding, setAdding] = useState(false)

  /* customers tab */
  const [search, setSearch] = useState('')

  /* report tab */
  const [openCust, setOpenCust] = useState<string | null>(null)

  /* ── fetch helpers ── */
  const fetchSessions = useCallback(async () => {
    const res = await fetch('/api/live/sessions')
    const data: LiveSession[] = await res.json()
    setSessions(data)
    if (data.length > 0 && !currentId) setCurrentId(data[0].id)
  }, [currentId])

  const fetchSales = useCallback(async (sid: string) => {
    const res = await fetch(`/api/live/sales?sessionId=${sid}`)
    const data: LiveSale[] = await res.json()
    setSales(data)
  }, [])

  useEffect(() => {
    fetchSessions()
    fetch('/api/live/sales?sessionId=ALL').then(r => r.json()).then(setAllSales)
  }, [fetchSessions])
  useEffect(() => { if (currentId) fetchSales(currentId) }, [currentId, fetchSales])
  useEffect(() => {
    if (tab === 'customers' || tab === 'report') {
      fetch('/api/live/sales?sessionId=ALL').then(r => r.json()).then(setAllSales)
    }
  }, [tab])

  /* ── actions ── */
  async function newSession() {
    const res = await fetch('/api/live/sessions', { method: 'POST' })
    const s: LiveSession = await res.json()
    setSessions(prev => [s, ...prev])
    setCurrentId(s.id)
  }

  async function addSale() {
    const phone = normalizePhone(fPhone)
    if (!phone || fPrice === '') { setHint({ text: 'შეავსე ნომერი და ფასი.', good: false }); return }
    if (!currentId) return
    setAdding(true)
    const res = await fetch('/api/live/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: currentId, phone, username: fUser, price: Number(fPrice) }),
    })
    const sale: LiveSale = await res.json()
    setSales(prev => [...prev, sale])
    setAllSales(prev => [...prev, sale])
    setFPrice('')
    setFPhone('')
    setFUser('')
    setHint(null)
    setAdding(false)
  }

  async function togglePaid(id: string, current: boolean) {
    await fetch(`/api/live/sales/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paid: !current }),
    })
    setSales(prev => prev.map(s => s.id === id ? { ...s, paid: !s.paid } : s))
    setAllSales(prev => prev.map(s => s.id === id ? { ...s, paid: !s.paid } : s))
  }

  async function deleteSale(id: string) {
    await fetch(`/api/live/sales/${id}`, { method: 'DELETE' })
    setSales(prev => prev.filter(s => s.id !== id))
    setAllSales(prev => prev.filter(s => s.id !== id))
  }

  async function settlePhone(phone: string) {
    const canonical = normalizePhone(phone)
    await fetch('/api/live/sessions/settle', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: currentId, phone: canonical }),
    })
    setSales(prev => prev.map(s => normalizePhone(s.phone) === canonical ? { ...s, paid: true } : s))
    setAllSales(prev => prev.map(s => normalizePhone(s.phone) === canonical ? { ...s, paid: true } : s))
  }

  /* phone hint */
  useEffect(() => {
    const phone = normalizePhone(fPhone)
    if (!phone) { setHint(null); return }
    const matches = allSales.filter(s => normalizePhone(s.phone) === phone).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    if (matches.length > 0) {
      const un = matches[0].username
      if (!fUser && un) setFUser(un)
      setHint({ text: `ცნობილი მომხმარებელია · ${un} · სულ ${matches.length} შეძენა`, good: true })
    } else {
      setHint(null)
    }
  }, [fPhone, allSales, fUser])

  /* ── no sessions prompt ── */
  if (sessions.length === 0) return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>📡</div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>ჯერ არც ერთი ლაივი არ არის</h2>
      <p style={{ color: '#7A7368', marginBottom: 20 }}>შექმენი პირველი ლაივი და დაიწყე გაყიდვების ჩაწერა.</p>
      <button style={{ background: '#C4295A', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontWeight: 700, cursor: 'pointer', fontSize: 15 }} onClick={newSession}>+ ახალი ლაივი</button>
    </div>
  )

  /* ── derived ── */
  const groups = groupByPhone(sales).sort((a, b) => {
    const la = Math.max(...a.items.map(i => new Date(i.createdAt).getTime()))
    const lb = Math.max(...b.items.map(i => new Date(i.createdAt).getTime()))
    return lb - la
  })

  let statTotal = 0, statPaid = 0
  for (const g of groups) { const t = custTotals(g.items); statTotal += t.total; statPaid += t.paid }

  /* ── shared styles ── */
  const inputS: React.CSSProperties = { width: '100%', border: '1px solid #E4DFD6', borderRadius: 7, padding: '11px 12px', background: '#F3F0EB', color: '#221F1B', fontSize: 15, fontFamily: 'inherit' }
  const btnPrimary: React.CSSProperties = { background: '#C4295A', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontWeight: 600, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }
  const btnGhost: React.CSSProperties = { background: '#fff', color: '#221F1B', border: '1px solid #E4DFD6', borderRadius: 8, padding: '9px 14px', fontWeight: 600, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }
  const panelS: React.CSSProperties = { background: '#fff', border: '1px solid #E4DFD6', borderRadius: 10, padding: 16, marginBottom: 20 }
  const cardS: React.CSSProperties = { background: '#fff', border: '1px solid #E4DFD6', borderRadius: 10, overflow: 'hidden' }
  const statCardS = (color?: string): React.CSSProperties => ({ background: '#fff', border: '1px solid #E4DFD6', borderRadius: 10, padding: '14px 16px', color: color ?? undefined })
  const TABS = [{ key: 'live', label: 'ლაივი' }, { key: 'customers', label: 'მომხმარებლები' }, { key: 'report', label: 'რეპორტი' }] as const

  return (
    <div className="live-wrap">

      {/* ── Top bar (desktop) ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#C4295A', display: 'inline-block', boxShadow: '0 0 0 3px #FBE7ED', flexShrink: 0 }} />
          <h1 style={{ fontSize: 17, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>ლაივ გაყიდვების ჟურნალი</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <select value={currentId ?? ''} onChange={e => setCurrentId(e.target.value)}
              style={{ appearance: 'none', background: '#fff', border: '1px solid #E4DFD6', borderRadius: 8, padding: '9px 32px 9px 12px', fontWeight: 600, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <span style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-65%) rotate(45deg)', width: 7, height: 7, borderRight: '1.6px solid #7A7368', borderBottom: '1.6px solid #7A7368', pointerEvents: 'none' }} />
          </div>
          <button style={btnPrimary} onClick={newSession}>+ ახალი ლაივი</button>
        </div>
      </div>

      {/* Desktop tabs */}
      <div className="live-desktop-tabs" style={{ gap: 4, marginBottom: 18, borderBottom: '1px solid #E4DFD6' }}>
        {TABS.map(t => (
          <div key={t.key} onClick={() => setTab(t.key)} style={{ padding: '9px 4px', marginRight: 18, fontWeight: 600, fontSize: 14, color: tab === t.key ? '#221F1B' : '#7A7368', cursor: 'pointer', borderBottom: tab === t.key ? '2px solid #C4295A' : '2px solid transparent', userSelect: 'none' }}>
            {t.label}
          </div>
        ))}
      </div>

      {/* ── LIVE TAB ── */}
      {tab === 'live' && (
        <>
          {/* Mobile banner stats */}
          <div className="live-banner" style={{ background: '#fff', border: '1px solid #E4DFD6', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, color: '#7A7368', fontWeight: 600 }}>სულ ნავაჭრი ამ ლაივში</div>
            <div style={{ ...S, fontSize: 30, fontWeight: 700, letterSpacing: '-0.01em', margin: '2px 0 10px' }}>{fmt(statTotal)}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1, background: '#F3F0EB', borderRadius: 9, padding: '8px 10px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#7A7368' }}>მიღებული</div>
                <div style={{ ...S, fontWeight: 700, fontSize: 16, marginTop: 1, color: '#147D6F' }}>{fmt(statPaid)}</div>
              </div>
              <div style={{ flex: 1, background: '#F3F0EB', borderRadius: 9, padding: '8px 10px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#7A7368' }}>დარჩენილი</div>
                <div style={{ ...S, fontWeight: 700, fontSize: 16, marginTop: 1, color: '#B4791C' }}>{fmt(statTotal - statPaid)}</div>
              </div>
            </div>
          </div>

          {/* Desktop grid stats */}
          <div className="live-stats-grid">
            {[
              { label: 'სულ ნავაჭრი ამ ლაივში', val: fmt(statTotal) },
              { label: 'მიღებული', val: fmt(statPaid), color: '#147D6F' },
              { label: 'მისაღები დარჩენილი', val: fmt(statTotal - statPaid), color: '#B4791C' },
            ].map(item => (
              <div key={item.label} style={statCardS()}>
                <div style={{ fontSize: 12, color: '#7A7368', fontWeight: 600, marginBottom: 6 }}>{item.label}</div>
                <div style={{ ...S, fontSize: 22, fontWeight: 600, color: item.color }}>{item.val}</div>
              </div>
            ))}
          </div>

          {/* Add form — sticky on mobile */}
          <div className="live-addpanel">
            <div className="live-add-form">
              <div className="live-phone-row">
                <input style={inputS} value={fPhone} onChange={e => setFPhone(e.target.value)} placeholder="ტელეფონის ნომერი" inputMode="numeric" />
              </div>
              <div className="live-phone-row">
                <input style={inputS} value={fUser} onChange={e => setFUser(e.target.value)} placeholder="ტიკტოკ Username" />
                <input style={inputS} type="number" min="0" step="1" value={fPrice} onChange={e => setFPrice(e.target.value)} placeholder="ფასი ₾" inputMode="decimal" onKeyDown={e => e.key === 'Enter' && addSale()} />
              </div>
              <button className="live-addbtn" style={btnPrimary} onClick={addSale} disabled={adding}>
                {adding ? '...' : 'დამატება'}
              </button>
            </div>
            {hint && <div style={{ marginTop: 6, fontSize: 12.5, color: hint.good ? '#147D6F' : '#C4295A', fontWeight: hint.good ? 600 : 400 }}>{hint.text}</div>}
          </div>

          {/* Customer cards */}
          <div className="live-list-wrap">
            {groups.length === 0
              ? <div style={{ textAlign: 'center', color: '#7A7368', padding: '40px 10px', fontSize: 14 }}>ამ ლაივში ჯერ არაფერი გაყიდულა.</div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {groups.map(g => {
                  const t = custTotals(g.items)
                  return (
                    <div key={g.phone} style={cardS}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.username || '(username არ მითითებულა)'}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ ...S, fontSize: 12.5, color: '#7A7368' }}>{g.phone}</span>
                            <WaBtn phone={g.phone} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 10.5, color: '#7A7368', fontWeight: 600, marginBottom: 1 }}>ჯამი</div>
                            <div style={{ ...S, fontWeight: 600, fontSize: 14.5 }}>{fmt(t.total)}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 10.5, color: '#7A7368', fontWeight: 600, marginBottom: 1 }}>დარჩენილი</div>
                            <div style={{ ...S, fontWeight: 600, fontSize: 14.5, color: t.due > 0 ? '#B4791C' : '#147D6F' }}>{fmt(t.due)}</div>
                          </div>
                        </div>
                      </div>
                      <div style={{ borderTop: '1px solid #E4DFD6', padding: '10px 14px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {g.items.slice().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((it, idx) => (
                          <div key={it.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13.5, gap: 8, flexWrap: 'wrap' }}>
                            <span>შეძენა #{idx + 1}{it.isFirst && <span style={{ fontSize: 10.5, color: '#7A7368', marginLeft: 6 }}>1-ლი</span>}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ ...S, fontWeight: 600 }}>{fmt(it.price)}</span>
                              <button onClick={() => togglePaid(it.id, it.paid)}
                                style={{ fontSize: 12, fontWeight: 700, padding: '6px 10px', borderRadius: 20, border: '1px solid transparent', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'inherit', background: it.paid ? '#E4F3EE' : '#FBEEDA', color: it.paid ? '#147D6F' : '#B4791C' }}>
                                {it.paid ? '✓ ჩარიცხულია' : 'არ არის ჩარიცხული'}
                              </button>
                              <button onClick={() => deleteSale(it.id)} style={{ background: 'none', border: 'none', color: '#7A7368', cursor: 'pointer', fontSize: 15, padding: '3px 5px', borderRadius: 4 }}>✕</button>
                            </span>
                          </div>
                        ))}
                      </div>
                      <div style={{ padding: '10px 14px 14px', borderTop: '1px dashed #E4DFD6', display: 'flex', justifyContent: 'flex-end' }}>
                        {t.due > 0
                          ? <button className="live-settle-btn" style={{ ...btnGhost, fontSize: 13, padding: '9px 14px' }} onClick={() => settlePhone(g.phone)}>
                              დარჩენილი {fmt(t.due)} ჩარიცხულად მონიშვნა
                            </button>
                          : <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: '#E4F3EE', color: '#147D6F' }}>სრულად ჩარიცხულია</span>
                        }
                      </div>
                    </div>
                  )
                })}
              </div>
            }
          </div>
        </>
      )}

      {/* ── CUSTOMERS TAB ── */}
      {tab === 'customers' && (
        <>
          <div style={{ marginBottom: 14 }}>
            <input style={{ ...inputS, background: '#fff' }} placeholder="მოძებნე ნომრით ან Username-ით" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {(() => {
            const allGroups = groupByPhone(allSales)
            const filtered = search
              ? allGroups.filter(g => g.phone.includes(search.toLowerCase()) || (g.username || '').toLowerCase().includes(search.toLowerCase()))
              : allGroups
            const sorted = filtered.map(g => ({ g, t: custTotals(g.items) })).sort((a, b) => b.t.total - a.t.total)
            if (sorted.length === 0) return <div style={{ textAlign: 'center', color: '#7A7368', padding: '40px 10px', fontSize: 14 }}>მომხმარებელი არ მოიძებნა.</div>
            return sorted.map(({ g, t }) => {
              const bySession: Record<string, number> = {}
              g.items.forEach(i => { bySession[i.sessionId] = (bySession[i.sessionId] || 0) + Number(i.price) })
              const isOpen = openCust === g.phone
              return (
                <div key={g.phone} style={{ ...cardS, marginBottom: 8 }}>
                  <div onClick={() => setOpenCust(isOpen ? null : g.phone)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', cursor: 'pointer', gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.username || '(username არ მითითებულა)'}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ ...S, fontSize: 12, color: '#7A7368' }}>{g.phone} · {g.items.length} შეძენა</span>
                        <WaBtn phone={g.phone} />
                      </div>
                    </div>
                    <div style={{ ...S, fontWeight: 700, fontSize: 15, flexShrink: 0 }}>{fmt(t.total)}</div>
                  </div>
                  {isOpen && (
                    <div style={{ borderTop: '1px solid #E4DFD6', padding: '10px 14px 14px' }}>
                      {Object.entries(bySession).map(([sid, amt]) => {
                        const sess = sessions.find(s => s.id === sid)
                        return (
                          <div key={sid} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '1px solid #F3F0EB' }}>
                            <span style={{ color: '#7A7368' }}>{sess?.label ?? 'წაშლილი ლაივი'}</span>
                            <span style={{ ...S, fontWeight: 600 }}>{fmt(amt)}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          })()}
        </>
      )}

      {/* ── REPORT TAB ── */}
      {tab === 'report' && (() => {
        if (allSales.length === 0) return <div style={{ textAlign: 'center', color: '#7A7368', padding: '40px 10px', fontSize: 14 }}>ჯერ არანაირი მონაცემი არ არსებობს.</div>
        let grandTotal = 0, grandPaid = 0
        const sessionRows = sessions.map(sess => {
          const sg = groupByPhone(allSales.filter(s => s.sessionId === sess.id))
          let total = 0, paid = 0
          for (const g of sg) { const t = custTotals(g.items); total += t.total; paid += t.paid }
          grandTotal += total; grandPaid += paid
          return { sess, customers: sg.length, total, paid, due: total - paid }
        }).filter(r => r.total > 0)
        const custGroups = groupByPhone(allSales)
        const custRows = custGroups.map(g => {
          const t = custTotals(g.items)
          const sessSet = new Set(g.items.map(i => i.sessionId))
          return { g, t, sessionsCount: sessSet.size, purchases: g.items.length }
        })
        const byDesc = custRows.slice().sort((a, b) => b.t.total - a.t.total)
        const byAsc = custRows.slice().sort((a, b) => a.t.total - b.t.total)
        const thS: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#7A7368', padding: '8px 4px', borderBottom: '1px solid #E4DFD6', textAlign: 'left' }
        const tdS: React.CSSProperties = { fontSize: 13.5, padding: '8px 4px', borderBottom: '1px solid #F3F0EB' }
        return (
          <>
            {/* Stats — 2x2 on mobile, 4-col on desktop */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'სულ ლაივი', val: sessions.length.toString() },
                { label: 'საერთო შემოსავალი', val: fmt(grandTotal) },
                { label: 'ჯამურად ჩარიცხული', val: fmt(grandPaid), color: '#147D6F' },
                { label: 'ჯამურად დარჩენილი', val: fmt(grandTotal - grandPaid), color: '#B4791C' },
              ].map(item => (
                <div key={item.label} style={statCardS()}>
                  <div style={{ fontSize: 12, color: '#7A7368', fontWeight: 600, marginBottom: 6 }}>{item.label}</div>
                  <div style={{ ...S, fontSize: 20, fontWeight: 600, color: item.color }}>{item.val}</div>
                </div>
              ))}
            </div>

            {/* Sessions — cards on mobile, table on desktop */}
            <div style={panelS}>
              <h2 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 10px', color: '#7A7368' }}>ლაივების შემოსავლიანობა</h2>
              {sessionRows.map(r => (
                <div key={r.sess.id} style={{ background: '#fff', border: '1px solid #E4DFD6', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{r.sess.label}</span>
                    <span style={{ ...S, fontWeight: 700, fontSize: 15, flexShrink: 0 }}>{fmt(r.total)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 5, fontSize: 12.5, color: '#7A7368', flexWrap: 'wrap' }}>
                    <span>მომხმ. <b style={{ color: '#221F1B', fontFamily: 'inherit' }}>{r.customers}</b></span>
                    <span>ჩარიცხული <b style={{ color: '#147D6F', ...S }}>{fmt(r.paid)}</b></span>
                    <span>დარჩენილი <b style={{ color: r.due > 0 ? '#B4791C' : '#147D6F', ...S }}>{fmt(r.due)}</b></span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 20 }}>
              {[{ title: 'ყველაზე აქტიური მომხმარებლები', rows: byDesc.slice(0, 5) },
                { title: 'ყველაზე პასიური მომხმარებლები', rows: byAsc.slice(0, 5) }].map(col => (
                <div key={col.title} style={panelS}>
                  <h2 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 8px', color: '#7A7368' }}>{col.title}</h2>
                  {col.rows.map(r => (
                    <div key={r.g.phone} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #F3F0EB', fontSize: 13.5 }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{r.g.username || '(username არ აქვს)'}</div>
                        <div style={{ ...S, fontSize: 11, color: '#7A7368' }}>{r.g.phone}</div>
                      </div>
                      <div style={{ ...S, fontWeight: 700 }}>{fmt(r.t.total)}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div style={panelS}>
              <h2 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 12px', color: '#7A7368' }}>ყველა მომხმარებელი — აქტივობა</h2>
              {byDesc.map(r => (
                <div key={r.g.phone} style={{ background: '#fff', border: '1px solid #E4DFD6', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{r.g.username || '—'}</div>
                    <div style={{ ...S, fontWeight: 700, fontSize: 15, flexShrink: 0 }}>{fmt(r.t.total)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 5, fontSize: 12.5, color: '#7A7368', flexWrap: 'wrap' }}>
                    <span style={{ ...S }}>{r.g.phone}</span>
                    <span>ლაივი <b style={{ color: '#221F1B', fontFamily: 'inherit' }}>{r.sessionsCount}</b></span>
                    <span>შეძენა <b style={{ color: '#221F1B', fontFamily: 'inherit' }}>{r.purchases}</b></span>
                    <span>დარჩენილი <b style={{ color: r.t.due > 0 ? '#B4791C' : '#147D6F', ...S }}>{fmt(r.t.due)}</b></span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )
      })()}

      {/* Bottom nav — mobile only */}
      <nav className="live-bottom-nav">
        {TABS.map(t => (
          <button key={t.key} className={`lnav-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
