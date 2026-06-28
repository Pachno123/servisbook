'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Customer, CheckItem } from '@/lib/database.types'
import CustomerSearch from '@/components/CustomerSearch'
import KotolSearch from '@/components/KotolSearch'
import { CheckSquare, Square, Send, Save, X } from 'lucide-react'
import { rotateCanvas90CW, normalizePhotoFile } from '@/lib/imageUtils'
import GdprModal from '@/components/GdprModal'
import VopModal from '@/components/VopModal'
import SignaturePad from '@/components/SignaturePad'

// Položky 12 a 14 sú zriedkavé (iba pri určitých kotloch) → preto sú na konci zoznamu.
// ID poradie ostáva zachované kvôli kompatibilite so staršími revíziami a PDF.
const DEFAULT_CHECKS: CheckItem[] = [
  { id: '1', label: 'Čistenie a kontrola horáku', checked: false },
  { id: '2', label: 'Čistenie a kontrola výmenníka', checked: false },
  { id: '3', label: 'Čistenie a kontrola spaľovacej komory', checked: false },
  { id: '4', label: 'Kontrola sania vzduchu', checked: false },
  { id: '5', label: 'Kontrola a nastavenie expanzomatu', checked: false },
  { id: '6', label: 'Čistenie a kontrola ionizačnej elektródy', checked: false },
  { id: '7', label: 'Čistenie a kontrola zapaľovacej elektródy', checked: false },
  { id: '8', label: 'Čistenie a kontrola odťahového ventilátora', checked: false },
  { id: '9', label: 'Čistenie filtra vykurovacej vody', checked: false },
  { id: '10', label: 'Kontrola funkčnosti 3-cestného ventilu a čerpadla VV', checked: false },
  { id: '11', label: 'Nastavenie pracovného tlaku v systéme kúrenia', checked: false },
  { id: '13', label: 'Vyčistenie sifónu kondenzátu', checked: false },
  { id: '15', label: 'Kontrola tesnosti plynu a úniku spalín', checked: false },
  { id: '16', label: 'Kontrola tesnosti poistného ventilu TÚV', checked: false },
  { id: '17', label: 'Kontrola funkčnosti - Vykurovacia prevádzka', checked: false },
  { id: '18', label: 'Kontrola funkčnosti - Ohrev pitnej vody', checked: false },
  { id: '19', label: 'Prevádzkovateľ poučený', checked: false },
  { id: '12', label: 'Čistenie a kontrola trysiek plynu', checked: false },
  { id: '14', label: 'Kontrola funkčnosti manostatu', checked: false },
]

function today() {
  return new Date().toISOString().split('T')[0]
}

const inp: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  border: '1px solid #e2e8f0', borderRadius: 12,
  padding: '12px 13px', fontSize: '15px', color: '#0f172a',
  background: '#fff', outline: 'none',
  boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
}
const lbl: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 600,
  color: '#64748b', marginBottom: '5px',
  textTransform: 'uppercase', letterSpacing: '0.05em',
}

export default function ReviziaForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const customerId = searchParams.get('customerId')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customerId || '')
  const [customer, setCustomer] = useState<Customer | null>(null)

  const [umiestnenie, setUmiestnenie] = useState('')
  const [kotol, setKotol] = useState('')
  const [vyrobneCislo, setVyrobneCislo] = useState('')
  const [datum, setDatum] = useState(today())
  const [checks, setChecks] = useState<CheckItem[]>(DEFAULT_CHECKS)
  const [poznamka, setPoznamka] = useState('')
  const [sposobile, setSposobile] = useState<boolean | null>(null)

  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])

  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendStatus, setSendStatus] = useState('')
  const [mounted, setMounted] = useState(false)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [showGdpr, setShowGdpr] = useState(false)
  const [showVop, setShowVop] = useState(false)

  const loadCustomer = useCallback(async (id: string) => {
    if (!id) { setCustomer(null); setUmiestnenie(''); return }
    const res = await fetch(`/api/customers/${id}`)
    if (res.ok) {
      const data: Customer = await res.json()
      setCustomer(data)
      setUmiestnenie([data.ulica, data.mesto].filter(Boolean).join(', '))
      setKotol(data.kotol || '')
      setVyrobneCislo(data.vyrobne_cislo || '')
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    fetch('/api/customers').then(r => r.json()).then(setCustomers).catch(() => {})
  }, [])

  useEffect(() => {
    if (customerId) { setSelectedCustomerId(customerId); loadCustomer(customerId) }
  }, [customerId, loadCustomer])

  const handleCustomerChange = (id: string) => { setSelectedCustomerId(id); loadCustomer(id) }
  const toggleCheck = (id: string) => setChecks(prev => prev.map(c => c.id === id ? { ...c, checked: !c.checked } : c))
  const checkAll = () => setChecks(prev => prev.map(c => ({ ...c, checked: true })))
  const uncheckAll = () => setChecks(prev => prev.map(c => ({ ...c, checked: false })))
  const allChecked = checks.every(c => c.checked)

  const handlePhotoAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Array.from(e.target.files || [])
    if (!raw.length) return
    e.target.value = ''
    // Bake EXIF orientation into the pixels so PDFs & Storage previews are upright.
    const normalized = await Promise.all(raw.map(normalizePhotoFile))
    setPhotos(prev => [...prev, ...normalized])
    normalized.forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => setPhotoPreviews(prev => [...prev, ev.target?.result as string])
      reader.readAsDataURL(file)
    })
  }

  const removePhoto = (i: number) => {
    setPhotos(prev => prev.filter((_, idx) => idx !== i))
    setPhotoPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  const buildPayload = () => ({
    customer_id: selectedCustomerId ? parseInt(selectedCustomerId) : null,
    umiestnenie, kotol, vyrobne_cislo: vyrobneCislo,
    datum, checks, poznamka, sposobile,
  })

  const saveRevizia = async () => {
    if (!selectedCustomerId) { alert('Vyberte zákazníka'); return }
    setSaving(true)
    const res = await fetch('/api/revizie', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload()),
    })
    setSaving(false)
    if (res.ok) { alert('Revízia uložená'); router.push('/dashboard/zakaznici') }
    else alert('Chyba pri ukladaní')
  }

  const saveAndSend = async () => {
    if (!selectedCustomerId) { alert('Vyberte zákazníka'); return }
    if (!customer?.email) { alert('Zákazník nemá zadaný email'); return }
    setSending(true)
    setSendStatus('Ukladám revíziu...')

    // 1. Save revizia
    const saveRes = await fetch('/api/revizie', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload()),
    })
    if (!saveRes.ok) { alert('Chyba pri ukladaní'); setSending(false); setSendStatus(''); return }
    const revizia = await saveRes.json()

    // 2. Upload photos to Supabase Storage
    setSendStatus('Nahrávam fotky...')
    let photoUrls: string[] = []
    if (photos.length > 0) {
      try {
        const { uploadPhotoToStorage } = await import('@/lib/uploadToStorage')
        photoUrls = await Promise.all(
          photos.map((f, i) => uploadPhotoToStorage(f, 'revizie', String(revizia.id), i))
        )
      } catch (e) {
        console.error('Photo upload error:', e)
      }
    }

    // 3. Generate combined PDF (zaznam page + protokol page in one file)
    setSendStatus('Generujem protokol...')
    let protokolUrl = ''

    // Load my profile + company branding for PDF header
    let technicianName = ''
    let companyEmail = ''
    let companyPhone = ''
    try {
      const [meRes, coRes] = await Promise.all([
        fetch('/api/profile'),
        fetch('/api/company'),
      ])
      if (meRes.ok) {
        const me = await meRes.json()
        technicianName = me.full_name || ''
      }
      if (coRes.ok) {
        const co = await coRes.json()
        companyEmail = co?.email || ''
        companyPhone = co?.phone || ''
      }
    } catch (_e) {}

    try {
      const { generateProtokolPDF } = await import('@/lib/pdfGenerator')
      const { uploadPdfToStorage, fileToDataUrl } = await import('@/lib/uploadToStorage')

      const photoDataUrls = await Promise.all(photos.map(f => fileToDataUrl(f)))

      const pdfData = {
        customer: {
          nazov: customer.nazov, ulica: customer.ulica, mesto: customer.mesto,
          tel: customer.tel, email: customer.email, interval: customer.interval,
        },
        umiestnenie, kotol, vyrobneCislo: vyrobneCislo,
        datum, checks, poznamka, sposobile, photoDataUrls,
        signatureDataUrl: signatureDataUrl ?? undefined,
        technicianName,
        companyEmail,
        companyPhone,
      }

      console.log('[PDF] Generating combined protokol PDF...')
      const protokolBlob = await generateProtokolPDF(pdfData)
      console.log('[PDF] protokol generated, size:', protokolBlob.size)

      setSendStatus('Nahrávam protokol...')
      protokolUrl = await uploadPdfToStorage(protokolBlob, `${revizia.id}/protokol.pdf`)
      console.log('[PDF] protokolUrl:', protokolUrl)

      // Persist URL so customer detail can link to it later.
      try {
        await fetch(`/api/revizie/${revizia.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ protokol_url: protokolUrl }),
        })
      } catch (_e) {}
    } catch (e) {
      console.error('[PDF] generation/upload error:', e)
    }

    // 4. Send email (HTML/subject built server-side from per-user branding profile)
    setSendStatus('Odosielam email...')

    const emailRes = await fetch('/api/send-email', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: customer.email,
        type: 'revizia',
        customer: { nazov: customer.nazov },
        revizia: { datum },
        reviziaId: revizia.id,
        protokolPdfUrl: protokolUrl || undefined,
      }),
    })

    setSending(false)
    setSendStatus('')
    if (emailRes.ok) {
      alert('Revízia uložená a email odoslaný')
    } else {
      alert('Revízia uložená, ale email sa nepodarilo odoslať')
    }
    router.push('/dashboard/zakaznici')
  }

  if (!mounted) return null

  return (
    <div style={{ paddingBottom: '100px' }}>
      {/* Protocol header */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '14px 16px' }}>
        <h1 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.4 }}>
          Protokol o vykonaní servisnej prehliadky
        </h1>
        <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b' }}>REVITHERM Gas service</p>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Customer selector */}
        {!customerId && (
          <div>
            <label style={lbl}>Zákazník *</label>
            <CustomerSearch customers={customers} selectedId={selectedCustomerId} onSelect={handleCustomerChange} accentColor="#2563eb" />
          </div>
        )}

        {/* Info fields */}
        <div style={{ background: '#f8fafc', borderRadius: 14, padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid #e2e8f0' }}>
          <div>
            <label style={lbl}>Umiestnenie</label>
            <input type="text" value={umiestnenie} onChange={e => setUmiestnenie(e.target.value)} style={inp}
              onFocus={e => (e.target.style.borderColor = '#2563eb')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
          </div>
          <div>
            <label style={lbl}>Prevádzkovateľ</label>
            <input type="text" value={customer?.nazov || ''} readOnly
              style={{ ...inp, background: '#f1f5f9', color: '#94a3b8' }} />
          </div>
          <div>
            <label style={lbl}>Typ kotla</label>
            <KotolSearch value={kotol} onChange={setKotol} placeholder="Hľadaj kotol..." inputStyle={{ padding: '12px 13px', fontSize: '15px', borderRadius: 12 }} />
          </div>
          <div>
            <label style={lbl}>Výrobné číslo</label>
            <input type="text" value={vyrobneCislo} onChange={e => setVyrobneCislo(e.target.value)} style={inp}
              onFocus={e => (e.target.style.borderColor = '#2563eb')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
          </div>
          <div>
            <label style={lbl}>Dátum prehliadky</label>
            <input type="date" value={datum} onChange={e => setDatum(e.target.value)} style={inp}
              onFocus={e => (e.target.style.borderColor = '#2563eb')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
          </div>
        </div>

        {/* Checklist */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Kontrolný zoznam</span>
            <button onClick={allChecked ? uncheckAll : checkAll}
              style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {allChecked ? 'Odznačiť všetko' : 'Označiť všetko'}
            </button>
          </div>
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            {checks.map((item, idx) => (
              <button key={item.id} onClick={() => toggleCheck(item.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '13px 14px', textAlign: 'left', border: 'none', cursor: 'pointer',
                  background: item.checked ? '#eff6ff' : '#ffffff',
                  borderBottom: idx < checks.length - 1 ? '1px solid #f1f5f9' : 'none',
                }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  background: item.checked ? '#2563eb' : '#f1f5f9',
                  border: item.checked ? 'none' : '1.5px solid #cbd5e1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {item.checked && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <span style={{ fontSize: '13px', color: item.checked ? '#1d4ed8' : '#475569', lineHeight: 1.4 }}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Poznamka */}
        <div>
          <label style={lbl}>Poznámka</label>
          <textarea value={poznamka} onChange={e => setPoznamka(e.target.value)} rows={3}
            style={{ ...inp, resize: 'none' }} placeholder="Poznámka k prehliadke..."
            onFocus={e => (e.target.style.borderColor = '#2563eb')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
        </div>

        {/* Sposobilosť */}
        <div>
          <p style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
            Bezpečnej prevádzky podľa platných noriem SR
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button onClick={() => setSposobile(true)}
              style={{
                padding: '15px', borderRadius: 12, fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                background: sposobile === true ? '#16a34a' : '#f0fdf4',
                color: sposobile === true ? '#fff' : '#16a34a',
                border: `2px solid #16a34a`,
              }}>
              SPÔSOBILÉ
            </button>
            <button onClick={() => setSposobile(false)}
              style={{
                padding: '15px', borderRadius: 12, fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                background: sposobile === false ? '#dc2626' : '#fef2f2',
                color: sposobile === false ? '#fff' : '#dc2626',
                border: `2px solid #dc2626`,
              }}>
              NESPÔSOBILÉ
            </button>
          </div>
        </div>

        {/* Photo upload */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <label style={lbl}>Fotky zariadenia</label>
            <button onClick={() => fileInputRef.current?.click()}
              style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              + Pridať fotku
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handlePhotoAdd} />
          {photoPreviews.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {photoPreviews.map((src, i) => (
                <div key={i} style={{ position: 'relative', width: '88px', height: '88px', borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                  <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => removePhoto(i)}
                    style={{
                      position: 'absolute', top: '3px', right: '3px',
                      background: 'rgba(15,23,42,0.6)', border: 'none', borderRadius: '50%',
                      width: '20px', height: '20px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                    }}>
                    <X size={12} color="#fff" />
                  </button>
                </div>
              ))}
              <button onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '88px', height: '88px', borderRadius: 10,
                  border: '2px dashed #cbd5e1', background: '#f8fafc',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#94a3b8',
                }}>
                <span style={{ fontSize: '20px', lineHeight: 1 }}>+</span>
                <span style={{ fontSize: '10px' }}>Pridať</span>
              </button>
            </div>
          ) : (
            <button onClick={() => fileInputRef.current?.click()}
              style={{
                width: '100%', padding: '20px', border: '2px dashed #cbd5e1',
                borderRadius: 12, background: '#f8fafc', cursor: 'pointer',
                color: '#94a3b8', fontSize: '13px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '6px',
              }}>
              <span style={{ fontSize: '22px', lineHeight: 1 }}>📷</span>
              Kliknite pre pridanie fotiek
            </button>
          )}
        </div>

        {/* Podpis zákazníka */}
        <div>
          <SignaturePad value={signatureDataUrl} onChange={setSignatureDataUrl} label="Podpis zákazníka" />
          <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
            Svojim podpisom súhlasíte so{' '}
            <button type="button" onClick={() => setShowGdpr(true)}
              style={{ background: 'none', border: 'none', padding: 0, color: '#2563eb', textDecoration: 'underline', fontSize: 'inherit', fontFamily: 'inherit', cursor: 'pointer' }}>
              spracovaním osobných údajov
            </button>
            {' '}a{' '}
            <button type="button" onClick={() => setShowVop(true)}
              style={{ background: 'none', border: 'none', padding: 0, color: '#2563eb', textDecoration: 'underline', fontSize: 'inherit', fontFamily: 'inherit', cursor: 'pointer' }}>
              všeobecnými obchodnými podmienkami
            </button>
            .
          </p>
        </div>

        {showGdpr && <GdprModal onClose={() => setShowGdpr(false)} />}
        {showVop && <VopModal onClose={() => setShowVop(false)} />}

        {/* Podpis info */}
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: '12px 14px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 3px' }}>
            Dátum servisnej prehliadky: <strong style={{ color: '#0f172a' }}>{datum ? new Date(datum).toLocaleDateString('sk-SK') : ''}</strong>
          </p>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
            Podpis servisného technika: <strong style={{ color: '#0f172a' }}>Jozef Pachník</strong>
          </p>
        </div>
      </div>

      {/* Fixed action buttons */}
      <div style={{
        position: 'fixed', bottom: 56, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid #e2e8f0',
        padding: '10px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px',
      }}>
        <button onClick={saveRevizia} disabled={saving || sending}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            background: '#2563eb', color: '#fff', border: 'none', borderRadius: 12,
            padding: '16px', fontSize: '15px', fontWeight: 600, minHeight: 52,
            cursor: saving || sending ? 'not-allowed' : 'pointer',
            opacity: saving || sending ? 0.6 : 1,
          }}>
          <Save size={16} />
          {saving ? 'Ukladám...' : 'Uložiť'}
        </button>
        <button onClick={saveAndSend} disabled={saving || sending}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            background: '#2563eb', color: '#fff', border: 'none', borderRadius: 12,
            padding: '16px', fontSize: '15px', fontWeight: 600, minHeight: 52,
            cursor: saving || sending ? 'not-allowed' : 'pointer',
            opacity: saving || sending ? 0.6 : 1,
          }}>
          <Send size={16} />
          {sending ? sendStatus || 'Odosielam...' : 'Uložiť a poslať'}
        </button>
      </div>
    </div>
  )
}
