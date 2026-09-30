export default function BoardLoading() {
  return (
    <div>
      {/* Stat row skeleton */}
      <div className="stat-row">
        {[1,2,3,4].map(i => (
          <div key={i} className="stat-item" style={{ opacity: 0.45 }}>
            <b style={{ background: 'var(--tint)', borderRadius: 6, width: 48, height: 28, display: 'block' }} />
            <span style={{ background: 'var(--tint)', borderRadius: 4, width: 72, height: 12, display: 'block', marginTop: 7 }} />
          </div>
        ))}
      </div>
      {/* Filter bar skeleton */}
      <div style={{ display: 'flex', gap: 9, marginBottom: 26 }}>
        <div style={{ height: 38, width: 220, background: 'var(--tint)', borderRadius: 11, opacity: 0.5 }} />
        <div style={{ height: 38, width: 260, background: 'var(--tint)', borderRadius: 11, opacity: 0.5 }} />
      </div>
      {/* Row skeletons */}
      {[1,2,3,4,5,6].map(i => (
        <div key={i} className="board-row" style={{ marginBottom: 5, opacity: 0.35 + i * 0.05 }}>
          {[1,2,3,4,5,6,7].map(j => (
            <div key={j} className="cel" style={{ background: 'var(--tint)', minHeight: 50 }} />
          ))}
        </div>
      ))}
    </div>
  )
}
