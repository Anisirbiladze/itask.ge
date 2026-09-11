'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Login failed'); return }
      if (data.mustChangePw) {
        router.push('/change-password')
      } else {
        router.push('/')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--paper)', padding: '24px',
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: 14, padding: '36px 32px',
        width: '100%', maxWidth: 380,
        boxShadow: '0 4px 24px rgba(18,24,31,.10)',
        border: '1px solid var(--line)',
      }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
            <span style={{
              width: 9, height: 9, borderRadius: 2, background: 'var(--ink)',
              display: 'block', transform: 'rotate(45deg)',
            }} />
            <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>itask.ge</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>Sign in</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13.5 }}>Your account was created by an admin.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email" required autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%', fontSize: 14.5, color: 'var(--ink)',
                background: 'var(--surface)', border: '1px solid var(--line)',
                borderRadius: 9, padding: '10px 12px',
              }}
              placeholder="you@company.ge"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password" required autoComplete="current-password"
              value={password} onChange={e => setPassword(e.target.value)}
              style={{
                width: '100%', fontSize: 14.5, color: 'var(--ink)',
                background: 'var(--surface)', border: '1px solid var(--line)',
                borderRadius: 9, padding: '10px 12px',
              }}
            />
          </div>

          {error && (
            <p style={{ color: 'var(--stuck)', fontSize: 13.5, fontWeight: 500 }}>{error}</p>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              background: 'var(--ink)', color: '#fff', border: 0, borderRadius: 9,
              padding: '11px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
