'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [view, setView] = useState<'login' | 'register'>('login')
  const [successMsg, setSuccessMsg] = useState('')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regLoading, setRegLoading] = useState(false)
  const [regError, setRegError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) {
        setError('Nesprávny email alebo heslo.')
        setLoading(false)
      } else {
        window.location.href = '/dashboard'
      }
    } catch (ex: unknown) {
      setError(ex instanceof Error ? ex.message : 'Neznáma chyba')
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setRegLoading(true)
    setRegError('')
    try {
      const { error: err } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
        options: { data: { full_name: regName } },
      })
      if (err) {
        setRegError(err.message)
        setRegLoading(false)
      } else {
        setSuccessMsg('Účet bol vytvorený. Prihláste sa.')
        setEmail(regEmail)
        setPassword('')
        setRegName(''); setRegEmail(''); setRegPassword('')
        setRegLoading(false)
        setView('login')
      }
    } catch (ex: unknown) {
      setRegError(ex instanceof Error ? ex.message : 'Neznáma chyba')
      setRegLoading(false)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    border: '1.5px solid #e5e7eb', borderRadius: '10px',
    padding: '14px 16px', fontSize: '16px', color: '#111827',
    outline: 'none', background: '#fff',
  }
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: '13px', fontWeight: 600,
    color: '#6b7280', marginBottom: '6px',
  }
  const btn: React.CSSProperties = {
    width: '100%', backgroundColor: '#1e3a5f', color: '#fff',
    border: 'none', borderRadius: '10px', padding: '16px',
    fontSize: '16px', fontWeight: 700, cursor: 'pointer',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  }
  const btnDisabled: React.CSSProperties = { ...btn, backgroundColor: '#7ba3c8', cursor: 'not-allowed' }
  const errBox: React.CSSProperties = {
    backgroundColor: '#fef2f2', border: '1px solid #fca5a5',
    borderRadius: '8px', padding: '12px 16px', marginBottom: '16px',
    fontSize: '14px', color: '#dc2626',
  }
  const okBox: React.CSSProperties = {
    backgroundColor: '#eff6ff', border: '1px solid #93c5fd',
    borderRadius: '8px', padding: '12px 16px', marginBottom: '16px',
    fontSize: '14px', color: '#2563eb',
  }

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'Arial, sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Dark top panel */}
      <div style={{
        background: 'linear-gradient(160deg, #0f2244 0%, #1e3a8a 100%)',
        padding: '48px 24px 64px',
        textAlign: 'center',
        flexShrink: 0,
        animation: 'fadeInDown 0.5s ease',
      }}>
        {/* Logo */}
        <div style={{ margin: '0 auto 16px', display: 'inline-block' }}>
          <svg width="64" height="64" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="login-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#1e3a5f" />
                <stop offset="100%" stopColor="#e85d04" />
              </linearGradient>
            </defs>
            <rect width="48" height="48" rx="12" fill="url(#login-grad)" />
            <path
              d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
              stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"
              transform="translate(10, 4) scale(1.15)"
            />
            <text x="24" y="44" textAnchor="middle" fill="white" fontSize="10"
              fontFamily="'Inter', system-ui, sans-serif" fontWeight="700" letterSpacing="1.5">SB</text>
          </svg>
        </div>
        <h1 style={{ margin: '0 0 4px', fontSize: '28px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>
          ServisBook
        </h1>
        <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Servisná aplikácia
        </p>
      </div>

      {/* White card rising from bottom */}
      <div style={{
        flex: 1,
        background: '#f8fafc',
        display: 'flex',
        justifyContent: 'center',
        marginTop: '-24px',
      }}>
        <div style={{
          width: '100%', maxWidth: '400px',
          background: '#ffffff',
          borderRadius: '24px 24px 0 0',
          padding: '32px 24px 40px',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.06)',
          animation: 'slideUp 0.45s ease',
        }}>
          {view === 'login' ? (
            <>
              <h2 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: 700, color: '#111827', textAlign: 'center' }}>
                Prihlásenie
              </h2>
              {successMsg && <div style={okBox}>{successMsg}</div>}
              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={lbl}>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="pachnik@revitherm.sk" required autoComplete="email" style={inp}
                    onFocus={e => (e.target.style.borderColor = '#2563eb')}
                    onBlur={e => (e.target.style.borderColor = '#e5e7eb')} />
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <label style={lbl}>Heslo</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required autoComplete="current-password" style={inp}
                    onFocus={e => (e.target.style.borderColor = '#2563eb')}
                    onBlur={e => (e.target.style.borderColor = '#e5e7eb')} />
                </div>
                {error && <div style={errBox}>{error}</div>}
                <button type="submit" disabled={loading} style={loading ? btnDisabled : btn}
                  onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
                  onMouseDown={e => { if (!loading) (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)' }}
                  onMouseUp={e => { if (!loading) (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)' }}
                >
                  {loading ? 'Prihlasovanie...' : 'Prihlásiť sa'}
                </button>
              </form>
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button onClick={() => { setView('register'); setError(''); setSuccessMsg('') }}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '14px', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                  Vytvoriť nový účet
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: 700, color: '#111827', textAlign: 'center' }}>
                Nový účet
              </h2>
              <form onSubmit={handleRegister}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={lbl}>Meno</label>
                  <input type="text" value={regName} onChange={e => setRegName(e.target.value)}
                    placeholder="Ján Novák" required style={inp}
                    onFocus={e => (e.target.style.borderColor = '#2563eb')}
                    onBlur={e => (e.target.style.borderColor = '#e5e7eb')} />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={lbl}>Email</label>
                  <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)}
                    placeholder="jan@email.sk" required autoComplete="email" style={inp}
                    onFocus={e => (e.target.style.borderColor = '#2563eb')}
                    onBlur={e => (e.target.style.borderColor = '#e5e7eb')} />
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <label style={lbl}>Heslo</label>
                  <input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)}
                    placeholder="••••••••" required autoComplete="new-password" style={inp}
                    onFocus={e => (e.target.style.borderColor = '#2563eb')}
                    onBlur={e => (e.target.style.borderColor = '#e5e7eb')} />
                </div>
                {regError && <div style={errBox}>{regError}</div>}
                <button type="submit" disabled={regLoading} style={regLoading ? btnDisabled : btn}
                  onMouseEnter={e => { if (!regLoading) (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
                  onMouseDown={e => { if (!regLoading) (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)' }}
                  onMouseUp={e => { if (!regLoading) (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)' }}
                >
                  {regLoading ? 'Vytváram účet...' : 'Vytvoriť účet'}
                </button>
              </form>
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button onClick={() => { setView('login'); setRegError('') }}
                  style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '14px', cursor: 'pointer', padding: 0 }}>
                  ← Späť na prihlásenie
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
