export default function PeopleLoading() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
      {[1,2,3,4,5,6].map(i => (
        <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 13, padding: 18, opacity: 0.35 + i * 0.05 }}>
          <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--tint)', flexShrink: 0 }} />
            <div>
              <div style={{ width: 120, height: 15, background: 'var(--tint)', borderRadius: 5, marginBottom: 7 }} />
              <div style={{ width: 80, height: 12, background: 'var(--tint)', borderRadius: 4 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
