'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Customer } from '@/lib/database.types'
import KotolSearch from '@/components/KotolSearch'
import GdprModal from '@/components/GdprModal'
import VopModal from '@/components/VopModal'
import BarcodeScanner from '@/components/BarcodeScanner'
import SignaturePad from '@/components/SignaturePad'
import { rotateCanvas90CW } from '@/lib/imageUtils'

interface CustomerFormProps {
  customer?: Customer | null
  onClose: () => void
  onSaved: () => void
}

const intervals = ['1 rok', '2 roky', '3 roky', 'Podľa potreby']

const inp: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  border: '1px solid #d1d5db', borderRadius: 10,
  padding: '12px 14px', fontSize: 16, color: '#0f172a',
  background: '#fff', outline: 'none',
}
const lbl: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: '#475569', marginBottom: 6, letterSpacing: '0.02em',
}

export default function CustomerForm({ customer, onClose, onSaved }: CustomerFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    nazov: customer?.nazov || '',
    ulica: customer?.ulica || '',
    mesto: customer?.mesto || '',
    tel: customer?.tel || '',
    email: customer?.email || '',
    kotol: customer?.kotol || '',
    interval: customer?.interval || '1 rok',
    datum_m: customer?.datum_m || '',
    poznamka: customer?.poznamka || '',
    vyrobne_cislo: customer?.vyrobne_cislo || '',
    sluzba: 'Servis' as const,
  })

  // GDPR consent — only required for new customers; existing customers keep their state.
  const [gdprConsent, setGdprConsent] = useState<boolean>(customer?.gdpr_consent ?? false)
  const [showGdpr, setShowGdpr] = useState(false)
  const [showVop, setShowVop] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  // Signature lives in component state; SignaturePad handles the fullscreen
  // overlay + bounds-cropped export on close.
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(
    customer?.gdpr_signature ?? null,
  )

  const set = <K extends keyof typeof form>(field: K, value: typeof form[K]) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const save = async (redirectToRevizia = false) => {
    if (!form.nazov.trim()) { alert('Zadajte meno zákazníka'); return }
    if (!gdprConsent) { alert('Pre uloženie zákazníka je potrebný GDPR súhlas'); return }
    // Signature only required when creating a new customer.
    if (!customer && !signatureDataUrl) { alert('Zákazník musí potvrdiť súhlas podpisom'); return }

    setLoading(true)
    const method = customer ? 'PUT' : 'POST'
    const url = customer ? `/api/customers/${customer.id}` : '/api/customers'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        datum_m: form.datum_m || null,
        gdpr_consent: true,
        // Only stamp the date once (keep the original if customer already consented).
        gdpr_consent_date: customer?.gdpr_consent_date || new Date().toISOString(),
        gdpr_signature: signatureDataUrl,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      if (redirectToRevizia) {
        const id = customer ? customer.id : data.id
        onSaved()
        router.push(`/dashboard/revizia?customerId=${id}`)
      } else {
        onSaved()
      }
    } else {
      alert('Chyba pri ukladaní')
    }
    setLoading(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#f5f5f7', zIndex: 200, overflowY: 'auto' }}>
      {/* Top close bar */}
      <div style={{
        position: 'sticky', top: 0, background: 'rgba(245,245,247,0.85)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        padding: '10px 12px', zIndex: 201,
      }}>
        <button
          onClick={onClose}
          style={{
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
            width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#64748b', cursor: 'pointer', fontSize: 20, lineHeight: 1,
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          ×
        </button>
      </div>

      {/* Centered card */}
      <div style={{ padding: '8px 16px 140px', maxWidth: 520, margin: '0 auto' }}>
        <div style={{
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: 18,
          padding: '24px 20px 22px',
          boxShadow: '0 4px 14px rgba(15,23,42,0.06)',
        }}>
          {/* Title */}
          <h2 style={{
            margin: '0 0 22px', textAlign: 'center',
            fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em',
          }}>
            {customer ? 'Upraviť' : 'Nový zákazník'}
          </h2>

          {/* Názov */}
          <Field label="Názov">
            <input type="text" value={form.nazov} onChange={e => set('nazov', e.target.value)}
              style={inp} placeholder="Ján Novák"
              onFocus={e => (e.target.style.borderColor = "#2563eb")}
              onBlur={e => (e.target.style.borderColor = "#d1d5db")}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }} />
          </Field>

          {/* Adresa */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Ulica">
              <input type="text" value={form.ulica} onChange={e => set('ulica', e.target.value)}
                style={inp} placeholder="Hlavná 1"
              onFocus={e => (e.target.style.borderColor = "#2563eb")}
              onBlur={e => (e.target.style.borderColor = "#d1d5db")}
              />
            </Field>
            <Field label="Mesto">
              <input type="text" value={form.mesto} onChange={e => set('mesto', e.target.value)}
                style={inp} placeholder="Bratislava"
              onFocus={e => (e.target.style.borderColor = "#2563eb")}
              onBlur={e => (e.target.style.borderColor = "#d1d5db")}
              />
            </Field>
          </div>

          {/* Kontakt */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Telefón">
              <input type="tel" value={form.tel} onChange={e => set('tel', e.target.value)}
                style={inp} placeholder="0900 000 000"
              onFocus={e => (e.target.style.borderColor = "#2563eb")}
              onBlur={e => (e.target.style.borderColor = "#d1d5db")}
              />
            </Field>
            <Field label="Email">
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                style={inp} placeholder="jan@email.sk"
              onFocus={e => (e.target.style.borderColor = "#2563eb")}
              onBlur={e => (e.target.style.borderColor = "#d1d5db")}
              />
            </Field>
          </div>

          {/* Kotol */}
          <Field label="Kotol">
            <KotolSearch value={form.kotol} onChange={v => set('kotol', v)} placeholder="Hľadaj kotol..." />
          </Field>

          {/* Výrobné číslo */}
          <Field label="Výrobné číslo">
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" value={form.vyrobne_cislo} onChange={e => set('vyrobne_cislo', e.target.value)}
                style={{ ...inp, flex: 1 }} placeholder="napr. SN-12345678"
              onFocus={e => (e.target.style.borderColor = "#2563eb")}
              onBlur={e => (e.target.style.borderColor = "#d1d5db")}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }} />
              <button type="button" onClick={() => setShowScanner(true)}
                aria-label="Naskenovať čiarový kód"
                style={{
                  flex: '0 0 auto', width: 50, height: 50, padding: 0,
                  border: '1px solid #d1d5db', borderRadius: 10, background: '#fff',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19V5a2 2 0 0 0-2-2h-3.17a2 2 0 0 1-1.42-.59l-.82-.82A2 2 0 0 0 14.17 1H9.83a2 2 0 0 0-1.42.59l-.82.82A2 2 0 0 1 6.17 3H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </button>
            </div>
          </Field>

          {/* Interval + Dátum */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Interval">
              <select value={form.interval} onChange={e => set('interval', e.target.value)}
                style={{ ...inp, cursor: 'pointer', appearance: 'none' as const,
                  backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 36,
                }}>
                {intervals.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </Field>
            <Field label="Dátum m. (nepov.)">
              <input type="date" value={form.datum_m} onChange={e => set('datum_m', e.target.value)}
                style={inp}
                onFocus={e => (e.target.style.borderColor = "#2563eb")}
                onBlur={e => (e.target.style.borderColor = "#d1d5db")} />
            </Field>
          </div>

          {/* Poznámka */}
          <Field label="Poznámka">
            <textarea value={form.poznamka} onChange={e => set('poznamka', e.target.value)}
              rows={3} style={{ ...inp, resize: 'none' }} placeholder="Poznámka k zákazníkovi..."
              onFocus={e => (e.target.style.borderColor = "#2563eb")}
              onBlur={e => (e.target.style.borderColor = "#d1d5db")}
              />
          </Field>

          {/* GDPR súhlas */}
          <div style={{
            marginTop: 16, padding: '14px 14px 12px',
            background: gdprConsent ? '#eff6ff' : '#fef2f2',
            border: `1.5px solid ${gdprConsent ? '#bfdbfe' : '#fecaca'}`,
            borderRadius: 12,
            transition: 'background 0.15s, border-color 0.15s',
          }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={gdprConsent}
                onChange={e => setGdprConsent(e.target.checked)}
                required
                style={{ width: 20, height: 20, marginTop: 1, accentColor: '#2563eb', cursor: 'pointer', flexShrink: 0 }}
              />
              <span style={{ fontSize: 13, color: '#0f172a', lineHeight: 1.5 }}>
                Súhlasím so{' '}
                <button type="button" onClick={(e) => { e.preventDefault(); setShowGdpr(true) }}
                  style={{ background: 'none', border: 'none', padding: 0, color: '#2563eb', textDecoration: 'underline', fontSize: 'inherit', fontFamily: 'inherit', cursor: 'pointer', fontWeight: 600 }}>
                  spracovaním osobných údajov
                </button>
                {' '}a{' '}
                <button type="button" onClick={(e) => { e.preventDefault(); setShowVop(true) }}
                  style={{ background: 'none', border: 'none', padding: 0, color: '#2563eb', textDecoration: 'underline', fontSize: 'inherit', fontFamily: 'inherit', cursor: 'pointer', fontWeight: 600 }}>
                  všeobecnými obchodnými podmienkami
                </button>
                .
              </span>
            </label>

            {/* Podpis */}
            <div style={{ marginTop: 12 }}>
              <SignaturePad value={signatureDataUrl} onChange={setSignatureDataUrl} label="Podpis zákazníka" />
            </div>
          </div>

        </div>

        {showGdpr && <GdprModal onClose={() => setShowGdpr(false)} />}
        {showVop && <VopModal onClose={() => setShowVop(false)} />}
        {showScanner && (
          <BarcodeScanner
            onResult={(text) => { set('vyrobne_cislo', text); setShowScanner(false) }}
            onClose={() => setShowScanner(false)}
          />
        )}
      </div>

      {/* Fixed footer */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)',
        borderTop: '1px solid #e5e7eb',
        padding: '12px 16px',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
        display: 'grid',
        gridTemplateColumns: customer ? '1fr 1fr' : '1fr 1fr 1fr', gap: 8,
        maxWidth: 520, margin: '0 auto', boxSizing: 'border-box',
      }}>
        <button onClick={() => save(false)} disabled={loading || !gdprConsent || (!customer && !signatureDataUrl)}
          style={{
            background: loading || !gdprConsent || (!customer && !signatureDataUrl) ? '#cbd5e1' : '#2563eb', color: '#fff', border: 'none',
            borderRadius: 12, padding: '15px', fontSize: 15, fontWeight: 700, minHeight: 50,
            cursor: loading || !gdprConsent || (!customer && !signatureDataUrl) ? 'not-allowed' : 'pointer',
          }}>
          {loading ? '...' : customer ? 'Upraviť' : 'Pridať'}
        </button>
        <button onClick={() => save(true)} disabled={loading || !gdprConsent || (!customer && !signatureDataUrl)}
          style={{
            background: '#374151', color: '#fff', border: 'none',
            borderRadius: 12, padding: '15px', fontSize: 15, fontWeight: 700, minHeight: 50,
            cursor: loading || !gdprConsent || (!customer && !signatureDataUrl) ? 'not-allowed' : 'pointer',
            opacity: loading || !gdprConsent || (!customer && !signatureDataUrl) ? 0.5 : 1,
          }}>
          Servis
        </button>
        <button onClick={onClose} disabled={loading}
          style={{
            background: '#ef4444', color: '#fff', border: 'none',
            borderRadius: 12, padding: '15px', fontSize: 15, fontWeight: 700, minHeight: 50,
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
          }}>
          Zrušiť
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 12 }}>
      <label style={lbl}>{label}</label>
      {children}
    </div>
  )
}
