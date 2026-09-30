export default function TeamLoading() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(168px,1fr))', gap: 10, marginBottom: 22 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 11, padding: '14px 15px', opacity: 0.5 }}>
            <div style={{ width: 48, height: 28, background: 'var(--tint)', borderRadius: 6, marginBottom: 7 }} />
            <div style={{ width: 100, height: 12, background: 'var(--tint)', borderRadius: 4 }} />
          </div>
        ))}
      </div>
      {[1,2,3].map(i => (
        <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 11, marginBottom: 7, padding: '13px 14px', opacity: 0.4 + i * 0.1 }}>
          <div style={{ height: 18, width: 160, background: 'var(--tint)', borderRadius: 5, marginBottom: 8 }} />
          <div style={{ height: 13, width: 120, background: 'var(--tint)', borderRadius: 4 }} />
        </div>
      ))}
    </div>
  )
}
