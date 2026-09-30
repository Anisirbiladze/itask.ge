export default function ReportsLoading() {
  return (
    <div>
      <div style={{ display: 'flex', gap: 9, marginBottom: 20 }}>
        {[1,2,3].map(i => (
          <div key={i} style={{ height: 44, width: 140, background: 'var(--tint)', borderRadius: 9, opacity: 0.5 }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(168px,1fr))', gap: 10, marginBottom: 22 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 11, padding: '14px 15px', opacity: 0.5 }}>
            <div style={{ width: 56, height: 28, background: 'var(--tint)', borderRadius: 6, marginBottom: 7 }} />
            <div style={{ width: 100, height: 12, background: 'var(--tint)', borderRadius: 4 }} />
          </div>
        ))}
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 11, height: 200, opacity: 0.4 }} />
    </div>
  )
}
