'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/ThemeContext'
import ServisBookLogo from '@/components/ServisBookLogo'

interface TeamMember {
  user_id: string
  full_name: string
  email: string
  role: 'admin' | 'technician'
  created_at: string
}

interface Company {
  id: string
  name: string
  phone: string
  email: string
}

interface Profile {
  user_id: string
  full_name: string
  email: string
  role: 'admin' | 'technician'
  company_id: string
}

export default function SettingsPage() {
  const router = useRouter()
  const { isDark, toggle } = useTheme()
  const fileRef = useRef<HTMLInputElement>(null)

  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [team, setTeam] = useState<TeamMember[]>([])
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)

  // Forms state
  const [companyForm, setCompanyForm] = useState<{ name: string; phone: string; email: string }>({ name: '', phone: '', email: '' })
  const [companySaving, setCompanySaving] = useState(false)
  const [companyMsg, setCompanyMsg] = useState('')

  const [name, setName] = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameMsg, setNameMsg] = useState('')

  const [showPwd, setShowPwd] = useState(false)
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdMsg, setPwdMsg] = useState('')
  const [pwdError, setPwdError] = useState('')

  const [showAddTech, setShowAddTech] = useState(false)
  const [techForm, setTechForm] = useState({ email: '', password: '', fullName: '' })
  const [techSaving, setTechSaving] = useState(false)
  const [techMsg, setTechMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [createdTech, setCreatedTech] = useState<{ email: string; password: string } | null>(null)

  const isAdmin = profile?.role === 'admin'

  const loadTeam = useCallback(async () => {
    const res = await fetch('/api/team')
    if (res.ok) setTeam(await res.json())
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser({ id: data.user.id, email: data.user.email ?? '' })
      setAvatarUrl(data.user.user_metadata?.avatar_url ?? '')
    })
    Promise.all([
      fetch('/api/profile').then(r => r.ok ? r.json() : null),
      fetch('/api/company').then(r => r.ok ? r.json() : null),
    ]).then(([p, c]) => {
      if (p) { setProfile(p); setName(p.full_name || '') }
      if (c) {
        setCompany(c)
        setCompanyForm({ name: c.name || '', phone: c.phone || '', email: c.email || '' })
      }
    })
    loadTeam()
  }, [router, loadTeam])

  async function saveCompany() {
    setCompanySaving(true); setCompanyMsg('')
    const res = await fetch('/api/company', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(companyForm),
    })
    setCompanySaving(false)
    setCompanyMsg(res.ok ? 'Firma uložená.' : 'Chyba pri ukladaní.')
    setTimeout(() => setCompanyMsg(''), 3000)
  }

  async function saveName() {
    setNameSaving(true); setNameMsg('')
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: name }),
    })
    if (res.ok) {
      await supabase.auth.updateUser({ data: { full_name: name } })
      setNameMsg('Meno uložené.')
    } else {
      setNameMsg('Chyba pri ukladaní.')
    }
    setNameSaving(false)
    setTimeout(() => setNameMsg(''), 3000)
  }

  async function changePassword() {
    setPwdError(''); setPwdMsg('')
    if (newPwd !== confirmPwd) { setPwdError('Heslá sa nezhodujú.'); return }
    if (newPwd.length < 6) { setPwdError('Heslo musí mať aspoň 6 znakov.'); return }
    setPwdSaving(true)
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user?.email ?? '', password: oldPwd,
    })
    if (signInErr) { setPwdError('Staré heslo je nesprávne.'); setPwdSaving(false); return }
    const { error } = await supabase.auth.updateUser({ password: newPwd })
    setPwdSaving(false)
    if (error) { setPwdError(`Chyba: ${error.message}`); return }
    setPwdMsg('Heslo bolo zmenené.')
    setOldPwd(''); setNewPwd(''); setConfirmPwd(''); setShowPwd(false)
    setTimeout(() => setPwdMsg(''), 3000)
  }

  async function uploadAvatar(file: File) {
    if (!user) return
    setAvatarUploading(true)
    const ext = file.name.split('.').pop()
    const path = `avatars/${user.id}.${ext}`
    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })
    if (uploadErr) { setAvatarUploading(false); alert('Chyba: ' + uploadErr.message); return }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const url = data.publicUrl + '?t=' + Date.now()
    await supabase.auth.updateUser({ data: { avatar_url: url } })
    setAvatarUrl(url); setAvatarUploading(false)
  }

  async function addTechnician(e: React.FormEvent) {
    e.preventDefault()
    setTechSaving(true); setTechMsg(null); setCreatedTech(null)
    const res = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(techForm),
    })
    setTechSaving(false)
    if (res.ok) {
      const data = await res.json()
      setCreatedTech({ email: data.email, password: data.password })
      setTechForm({ email: '', password: '', fullName: '' })
      loadTeam()
    } else {
      const err = await res.json().catch(() => ({}))
      setTechMsg({ kind: 'err', text: err.error || 'Chyba pri vytváraní technika.' })
    }
  }

  async function removeTechnician(userId: string, fullName: string) {
    if (!confirm(`Odstrániť technika ${fullName} z firmy?`)) return
    const res = await fetch(`/api/team?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' })
    if (res.ok) loadTeam()
    else alert('Chyba pri odstraňovaní.')
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ─── Theme tokens ───
  const bg = isDark ? '#0b1220' : '#f8fafc'
  const card = isDark ? '#0f1729' : '#ffffff'
  const border = isDark ? '#1f2937' : '#e2e8f0'
  const text = isDark ? '#f1f5f9' : '#0f172a'
  const muted = isDark ? '#94a3b8' : '#64748b'
  const inputBg = isDark ? '#0b1220' : '#ffffff'
  const inputBorder = isDark ? '#334155' : '#d1d5db'
  const navy = '#1e3a5f'
  const accent = '#2563eb'

  const sectionLabel: React.CSSProperties = {
    fontSize: '11px', fontWeight: 700, color: muted,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    margin: '24px 0 10px',
  }

  const cardStyle: React.CSSProperties = {
    background: card, border: `1px solid ${border}`,
    borderRadius: 16,
    boxShadow: isDark ? 'none' : '0 1px 2px rgba(15,23,42,0.04)',
    padding: 20,
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    border: `1.5px solid ${inputBorder}`, borderRadius: 10,
    padding: '11px 13px', fontSize: 15, color: text,
    background: inputBg, outline: 'none',
  }

  const fieldLabel: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600,
    color: muted, marginBottom: 5,
    textTransform: 'uppercase', letterSpacing: '0.04em',
  }

  const primaryBtn: React.CSSProperties = {
    background: navy, color: '#fff', border: 'none',
    borderRadius: 10, padding: '11px 18px',
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
  }

  const ghostBtn: React.CSSProperties = {
    background: 'transparent', color: text,
    border: `1.5px solid ${inputBorder}`,
    borderRadius: 10, padding: '11px 18px',
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
  }

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '12px 16px 32px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <button onClick={() => router.back()}
            style={{ background: 'transparent', border: 'none', color: muted, fontSize: 22, cursor: 'pointer', padding: 4, lineHeight: 1 }}>
            ←
          </button>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: text, letterSpacing: '-0.02em' }}>Nastavenia</h1>
        </div>

        {/* ─── MOJA FIRMA ─── */}
        <p style={sectionLabel}>Moja firma</p>
        <div style={cardStyle}>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: muted, lineHeight: 1.5 }}>
            Tieto údaje sa zobrazia zákazníkom v emailoch a na PDF protokoloch.
            {!isAdmin && <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: '#f59e0b' }}>Iba admin firmy môže upraviť tieto údaje.</span>}
          </p>

          <div style={{ marginBottom: 12 }}>
            <label style={fieldLabel}>Názov firmy</label>
            <input type="text"
              value={companyForm.name}
              onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })}
              disabled={!isAdmin}
              style={inputStyle}
              placeholder="napr. Revitherm | Gas service"
              onFocus={e => (e.target.style.borderColor = accent)}
              onBlur={e => (e.target.style.borderColor = inputBorder)} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={fieldLabel}>Telefón</label>
            <input type="tel"
              value={companyForm.phone}
              onChange={e => setCompanyForm({ ...companyForm, phone: e.target.value })}
              disabled={!isAdmin}
              style={inputStyle}
              placeholder="+421 904 885 444"
              onFocus={e => (e.target.style.borderColor = accent)}
              onBlur={e => (e.target.style.borderColor = inputBorder)} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={fieldLabel}>Kontaktný email firmy</label>
            <input type="email"
              value={companyForm.email}
              onChange={e => setCompanyForm({ ...companyForm, email: e.target.value })}
              disabled={!isAdmin}
              style={inputStyle}
              placeholder="info@..."
              onFocus={e => (e.target.style.borderColor = accent)}
              onBlur={e => (e.target.style.borderColor = inputBorder)} />
          </div>

          {isAdmin && (
            <>
              <button onClick={saveCompany} disabled={companySaving}
                style={{ ...primaryBtn, width: '100%', background: companySaving ? '#94a3b8' : navy }}>
                {companySaving ? 'Ukladám…' : 'Uložiť firmu'}
              </button>
              {companyMsg && (
                <p style={{ margin: '10px 0 0', fontSize: 13, color: '#2563eb', textAlign: 'center' }}>{companyMsg}</p>
              )}
            </>
          )}
        </div>

        {/* ─── TÍM ─── */}
        <p style={sectionLabel}>Tím · {team.length} {team.length === 1 ? 'člen' : team.length < 5 ? 'členovia' : 'členov'}</p>
        <div style={cardStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {team.map((m) => {
              const isMe = m.user_id === user?.id
              return (
                <div key={m.user_id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px',
                  background: isDark ? '#0b1220' : '#f8fafc',
                  border: `1px solid ${border}`, borderRadius: 12,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: navy, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, flexShrink: 0,
                  }}>
                    {(m.full_name || m.email).split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: text }}>{m.full_name || '(bez mena)'}</span>
                      {m.role === 'admin' && (
                        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: '#dbeafe', color: '#1d4ed8', fontWeight: 700, letterSpacing: '0.04em' }}>ADMIN</span>
                      )}
                      {isMe && (
                        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: isDark ? '#1f2937' : '#f1f5f9', color: muted, fontWeight: 600 }}>ja</span>
                      )}
                    </div>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email}</p>
                  </div>
                  {isAdmin && !isMe && (
                    <button onClick={() => removeTechnician(m.user_id, m.full_name)}
                      style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                      Odstrániť
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {isAdmin && (
            <button onClick={() => { setShowAddTech(true); setCreatedTech(null); setTechMsg(null) }}
              style={{
                marginTop: 12, width: '100%',
                background: 'transparent', color: accent,
                border: `1.5px dashed ${border}`, borderRadius: 10,
                padding: '11px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>
              + Pridať technika
            </button>
          )}

          {!isAdmin && (
            <p style={{ margin: '12px 0 0', fontSize: 12, color: muted, textAlign: 'center' }}>
              Technikov môže pridať len admin firmy.
            </p>
          )}
        </div>

        {/* ─── MÔJ PROFIL ─── */}
        <p style={sectionLabel}>Môj profil</p>
        <div style={cardStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 18 }}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                width: 76, height: 76, borderRadius: '50%',
                overflow: 'hidden', cursor: 'pointer', position: 'relative',
                border: `2px solid ${border}`,
                background: isDark ? '#1f2937' : '#e5e7eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <ServisBookLogo size={44} />
              )}
              {avatarUploading && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
                  <span style={{ color: '#fff', fontSize: 11 }}>...</span>
                </div>
              )}
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: muted }}>Klikni pre zmenu</p>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={fieldLabel}>Meno (zobrazí sa ako „Servisoval")</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              style={inputStyle}
              placeholder="Ján Novák"
              onFocus={e => (e.target.style.borderColor = accent)}
              onBlur={e => (e.target.style.borderColor = inputBorder)} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={fieldLabel}>Email (na prihlásenie)</label>
            <input type="email" value={user?.email ?? ''} readOnly
              style={{ ...inputStyle, background: isDark ? '#0b1220' : '#f1f5f9', color: muted, cursor: 'default' }} />
          </div>

          <button onClick={saveName} disabled={nameSaving}
            style={{ ...primaryBtn, width: '100%', background: nameSaving ? '#94a3b8' : '#2563eb' }}>
            {nameSaving ? 'Ukladám…' : 'Uložiť meno'}
          </button>
          {nameMsg && <p style={{ margin: '10px 0 0', fontSize: 13, color: '#2563eb', textAlign: 'center' }}>{nameMsg}</p>}

          <button onClick={() => { setShowPwd(!showPwd); setPwdError(''); setPwdMsg('') }}
            style={{ ...ghostBtn, width: '100%', marginTop: 10 }}>
            {showPwd ? 'Zavrieť zmenu hesla' : 'Zmeniť heslo'}
          </button>

          {showPwd && (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Staré heslo', val: oldPwd, set: setOldPwd },
                { label: 'Nové heslo', val: newPwd, set: setNewPwd },
                { label: 'Potvrdiť heslo', val: confirmPwd, set: setConfirmPwd },
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <label style={fieldLabel}>{label}</label>
                  <input type="password" value={val} onChange={e => set(e.target.value)}
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = accent)}
                    onBlur={e => (e.target.style.borderColor = inputBorder)} />
                </div>
              ))}
              {pwdError && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>{pwdError}</div>}
              {pwdMsg && <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#2563eb' }}>{pwdMsg}</div>}
              <button onClick={changePassword} disabled={pwdSaving}
                style={{ ...primaryBtn, background: pwdSaving ? '#94a3b8' : '#2563eb' }}>
                {pwdSaving ? 'Mením…' : 'Potvrdiť zmenu hesla'}
              </button>
            </div>
          )}
        </div>

        {/* ─── VZHĽAD ─── */}
        <p style={sectionLabel}>Vzhľad</p>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: text }}>Tmavý režim</p>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: muted }}>{isDark ? 'Zapnutý' : 'Vypnutý'}</p>
            </div>
            <button onClick={toggle} role="switch" aria-checked={isDark}
              style={{
                width: 52, height: 30, borderRadius: 15,
                background: isDark ? accent : '#cbd5e1',
                border: 'none', cursor: 'pointer', position: 'relative',
                transition: 'background 0.2s', flexShrink: 0, padding: 0,
              }}>
              <span style={{
                position: 'absolute', top: 3, left: isDark ? 25 : 3,
                width: 24, height: 24, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.25)', display: 'block',
              }} />
            </button>
          </div>
        </div>

        {/* ─── Sign out ─── */}
        <button onClick={signOut}
          style={{
            marginTop: 28, width: '100%',
            background: '#dc2626', color: '#fff',
            border: 'none', borderRadius: 12, padding: '14px',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}>
          Odhlásiť sa
        </button>
      </div>

      {/* ─── Add technician modal ─── */}
      {showAddTech && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setShowAddTech(false)}>
          <div onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 480,
              background: card, color: text,
              borderRadius: '20px 20px 0 0',
              padding: '24px 20px 32px',
              boxShadow: '0 -8px 24px rgba(15,23,42,0.18)',
              animation: 'slideUp 0.25s ease',
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: text }}>Pridať technika</h3>
              <button onClick={() => setShowAddTech(false)}
                style={{ background: 'transparent', border: 'none', color: muted, fontSize: 24, cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
            </div>

            {createdTech ? (
              <div>
                <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 12, padding: 16, marginBottom: 14 }}>
                  <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: '#1d4ed8' }}>✓ Technik bol vytvorený</p>
                  <p style={{ margin: 0, fontSize: 13, color: '#166534' }}>Pošli mu tieto prihlasovacie údaje:</p>
                </div>
                <div style={{ background: isDark ? '#0b1220' : '#f8fafc', border: `1px solid ${border}`, borderRadius: 10, padding: 14, marginBottom: 14, fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>
                  <p style={{ margin: '0 0 6px', color: muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</p>
                  <p style={{ margin: '0 0 12px', color: text }}>{createdTech.email}</p>
                  <p style={{ margin: '0 0 6px', color: muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Heslo</p>
                  <p style={{ margin: 0, color: text }}>{createdTech.password}</p>
                </div>
                <button onClick={() => setShowAddTech(false)} style={{ ...primaryBtn, width: '100%' }}>Hotovo</button>
              </div>
            ) : (
              <form onSubmit={addTechnician}>
                <p style={{ margin: '0 0 16px', fontSize: 13, color: muted }}>
                  Vytvor účet pre nového technika. Po vytvorení dostaneš email + heslo, ktoré mu pošleš.
                </p>
                <div style={{ marginBottom: 12 }}>
                  <label style={fieldLabel}>Meno technika</label>
                  <input type="text" value={techForm.fullName} onChange={e => setTechForm({ ...techForm, fullName: e.target.value })}
                    style={inputStyle} placeholder="Janko Hráško"
                    onFocus={e => (e.target.style.borderColor = accent)}
                    onBlur={e => (e.target.style.borderColor = inputBorder)} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={fieldLabel}>Email</label>
                  <input type="email" value={techForm.email} required onChange={e => setTechForm({ ...techForm, email: e.target.value })}
                    style={inputStyle} placeholder="technik@firma.sk"
                    onFocus={e => (e.target.style.borderColor = accent)}
                    onBlur={e => (e.target.style.borderColor = inputBorder)} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={fieldLabel}>Dočasné heslo (min. 6 znakov)</label>
                  <input type="text" value={techForm.password} required minLength={6} onChange={e => setTechForm({ ...techForm, password: e.target.value })}
                    style={inputStyle} placeholder="napr. Servis2026"
                    onFocus={e => (e.target.style.borderColor = accent)}
                    onBlur={e => (e.target.style.borderColor = inputBorder)} />
                </div>
                {techMsg && (
                  <div style={{ marginBottom: 12, background: techMsg.kind === 'ok' ? '#eff6ff' : '#fef2f2', border: `1px solid ${techMsg.kind === 'ok' ? '#93c5fd' : '#fca5a5'}`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: techMsg.kind === 'ok' ? '#2563eb' : '#dc2626' }}>
                    {techMsg.text}
                  </div>
                )}
                <button type="submit" disabled={techSaving}
                  style={{ ...primaryBtn, width: '100%', background: techSaving ? '#94a3b8' : navy }}>
                  {techSaving ? 'Vytváram…' : 'Vytvoriť technika'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>
  )
}
