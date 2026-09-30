'use client'
export default function BoardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ padding: 40, maxWidth: 600 }}>
      <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 12, color: 'var(--stuck)' }}>Board failed to load</h2>
      <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, fontSize: 12, overflow: 'auto', marginBottom: 16, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {error.message}
        {error.digest ? `\n\nDigest: ${error.digest}` : ''}
      </pre>
      <button onClick={reset} style={{ background: 'var(--ink)', color: '#fff', border: 0, borderRadius: 9, padding: '10px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
        Retry
      </button>
    </div>
  )
}
