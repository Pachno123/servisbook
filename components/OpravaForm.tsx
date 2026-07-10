'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Trash2, X } from 'lucide-react'
import type { Customer, Komponent, Ukon } from '@/lib/database.types'
import CustomerSearch from '@/components/CustomerSearch'
import KotolSearch from '@/components/KotolSearch'
import { rotateCanvas90CW, normalizePhotoFile } from '@/lib/imageUtils'
import GdprModal from '@/components/GdprModal'
import VopModal from '@/components/VopModal'
import SignaturePad from '@/components/SignaturePad'

// ----- Generic autocomplete for name-only reference tables -----
function AutocompleteInput({ value, onChange, suggestions, placeholder }: {
  value: string
  onChange: (v: string) => void
  suggestions: { id: number; nazov: string }[]
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const filtered = value.length > 0
    ? suggestions.filter(k => k.nazov.toLowerCase().includes(value.toLowerCase()))
    : []

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <input
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 13px', fontSize: '15px', color: '#0f172a', outline: 'none', background: '#fff', boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}
      />
      {open && filtered.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', zIndex: 100, maxHeight: '180px', overflowY: 'auto' }}>
          {filtered.map(k => (
            <div
              key={k.id}
              onMouseDown={() => { onChange(k.nazov); setOpen(false) }}
              style={{ padding: '10px 12px', fontSize: '14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', color: '#0f172a' }}
            >
              {k.nazov}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ----- Main form -----
export default function OpravaForm() {
  const searchParams = useSearchParams()
  const customerId = searchParams.get('customerId')
  const router = useRouter()

  const [mounted, setMounted] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [komponenty, setKomponenty] = useState<Komponent[]>([])
  const [ukonyDb, setUkonyDb] = useState<Ukon[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState(customerId || '')
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendStatus, setSendStatus] = useState('')
  const [saved, setSaved] = useState(false)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [showGdpr, setShowGdpr] = useState(false)
  const [showVop, setShowVop] = useState(false)
  const [servisnyListCislo, setServisnyListCislo] = useState('')

  const [form, setForm] = useState({
    datum_vyjazdu: new Date().toISOString().split('T')[0],
    zariadenie: '',
    vyrobne_cislo: '',
    nahlasena_porucha: '',
    diagnostika: '',
    odstranenie: '',
    poznamka: '',
  })

  const [material, setMaterial] = useState<string[]>([])
  const [ukony, setUkony] = useState<string[]>([])

  // Photos
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])

  const handlePhotoAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Array.from(e.target.files || [])
    if (!raw.length) return
    e.target.value = ''
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

  useEffect(() => {
    setMounted(true)
    fetch('/api/customers').then(r => r.json()).then(setCustomers).catch(() => {})
    fetch('/api/komponenty').then(r => r.json()).then(setKomponenty).catch(() => {})
    fetch('/api/ukony').then(r => r.json()).then(setUkonyDb).catch(() => {})
    const year = new Date().getFullYear()
    const rand = Math.floor(Math.random() * 900) + 100
    setServisnyListCislo(`SL-${year}-${rand}`)
  }, [])

  useEffect(() => {
    if (selectedCustomerId) {
      fetch(`/api/customers/${selectedCustomerId}`).then(r => r.json()).then((data: Customer) => {
        setCustomer(data)
        setForm(p => ({ ...p, vyrobne_cislo: data.vyrobne_cislo || '', zariadenie: p.zariadenie || data.kotol || '' }))
      }).catch(() => {})
    } else {
      setCustomer(null)
    }
  }, [selectedCustomerId])

  // Learn new reference-list entries so the autocomplete gets richer over time.
  // Silent: any 400/500 is ignored — the oprava itself has already been saved.
  async function learnReferences() {
    const knownMaterial = new Set(komponenty.map(k => k.nazov.toLowerCase()))
    const knownUkony = new Set(ukonyDb.map(u => u.nazov.toLowerCase()))
    const newMaterial = material.map(m => m.trim()).filter(m => m && !knownMaterial.has(m.toLowerCase()))
    const newUkony = ukony.map(u => u.trim()).filter(u => u && !knownUkony.has(u.toLowerCase()))
    await Promise.all([
      ...newMaterial.map(nazov =>
        fetch('/api/komponenty', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nazov }) }).catch(() => {})
      ),
      ...newUkony.map(nazov =>
        fetch('/api/ukony', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nazov }) }).catch(() => {})
      ),
    ])
  }

  function buildBody() {
    return {
      customer_id: parseInt(selectedCustomerId),
      servisny_list_cislo: servisnyListCislo,
      datum_vyjazdu: form.datum_vyjazdu,
      nahlasena_porucha: form.nahlasena_porucha,
      diagnostika: form.diagnostika,
      odstranenie: form.odstranenie,
      poznamka: form.poznamka,
      material: material.filter(Boolean).map(nazov => ({ nazov })),
      ukony: ukony.filter(Boolean).map(nazov => ({ nazov })),
    }
  }

  async function save() {
    if (!selectedCustomerId) return
    setSaving(true)
    const res = await fetch('/api/opravy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildBody()),
    })
    if (res.ok) {
      const oprava = await res.json()
      if (photos.length > 0) {
        try {
          const { uploadPhotoToStorage } = await import('@/lib/uploadToStorage')
          await Promise.all(photos.map((f, i) => uploadPhotoToStorage(f, 'opravy', String(oprava.id), i)))
        } catch (e) { console.error('[opravy] photo upload error:', e) }
      }
      learnReferences()
      setSaved(true)
      setTimeout(() => router.push('/dashboard/zakaznici'), 1500)
    }
    setSaving(false)
  }

  async function saveAndSend() {
    if (!selectedCustomerId || !customer?.email) return
    setSending(true)
    setSendStatus('Ukladám...')

    const res = await fetch('/api/opravy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildBody()),
    })
    if (!res.ok) { setSending(false); setSendStatus(''); return }
    const oprava = await res.json()
    learnReferences()

    setSendStatus('Nahrávam fotky...')
    if (photos.length > 0) {
      try {
        const { uploadPhotoToStorage } = await import('@/lib/uploadToStorage')
        await Promise.all(photos.map((f, i) => uploadPhotoToStorage(f, 'opravy', String(oprava.id), i)))
      } catch (e) { console.error('[opravy] photo upload error:', e) }
    }

    setSendStatus('Generujem PDF...')
    let zaznamUrl = ''
    try {
      const { generateOpravaPDF } = await import('@/lib/pdfGenerator')
      const { uploadPdfToStorage, fileToDataUrl } = await import('@/lib/uploadToStorage')
      const photoDataUrls = await Promise.all(photos.map(f => fileToDataUrl(f)))

      let technicianName = ''
      let companyEmail = ''
      let companyPhone = ''
      try {
        const [meRes, coRes] = await Promise.all([fetch('/api/profile'), fetch('/api/company')])
        if (meRes.ok) technicianName = (await meRes.json()).full_name || ''
        if (coRes.ok) {
          const co = await coRes.json()
          companyEmail = co?.email || ''
          companyPhone = co?.phone || ''
        }
      } catch (_e) {}

      const pdfData = {
        customer: { nazov: customer.nazov, ulica: customer.ulica, mesto: customer.mesto, tel: customer.tel, email: customer.email },
        zariadenie: form.zariadenie,
        vyrobneCislo: form.vyrobne_cislo,
        datumVyjazdu: form.datum_vyjazdu,
        nahlasenaPorucha: form.nahlasena_porucha,
        diagnostika: form.diagnostika,
        odstranenie: form.odstranenie,
        poznamka: form.poznamka,
        material: material.filter(Boolean),
        ukony: ukony.filter(Boolean),
        photoDataUrls,
        signatureDataUrl: signatureDataUrl ?? undefined,
        technicianName,
        companyEmail,
        companyPhone,
      }
      const pdfBlob = await generateOpravaPDF(pdfData)
      setSendStatus('Nahrávam PDF...')
      zaznamUrl = await uploadPdfToStorage(pdfBlob, `opravy/${oprava.id}/zaznam.pdf`)

      try {
        await fetch(`/api/opravy/${oprava.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ zaznam_url: zaznamUrl }),
        })
      } catch (_e) {}
    } catch (e) {
      console.error('[PDF] oprava error:', e)
    }

    setSendStatus('Odosielam email...')
    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: customer.email,
        type: 'oprava',
        customer: { nazov: customer.nazov },
        oprava: {
          datum_vyjazdu: form.datum_vyjazdu,
          nahlasena_porucha: form.nahlasena_porucha,
          diagnostika: form.diagnostika,
          odstranenie: form.odstranenie,
          material: material.filter(Boolean),
        },
        zaznamUrl,
        zaznamPdfUrl: zaznamUrl || undefined,
      }),
    })

    setSending(false)
    setSendStatus('')
    setSaved(true)
    setTimeout(() => router.push('/dashboard/zakaznici'), 1500)
  }

  if (!mounted) return null

  if (saved) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <div style={{ fontSize: '56px', color: '#2563eb', marginBottom: '12px' }}>✓</div>
        <p style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>Oprava uložená!</p>
      </div>
    )
  }

  const s: Record<string, React.CSSProperties> = {
    section: { marginBottom: '20px' },
    sectionTitle: { margin: '0 0 10px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.06em' },
    inp: { width: '100%', boxSizing: 'border-box', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 13px', fontSize: '15px', color: '#0f172a', outline: 'none', background: '#fff', boxShadow: '0 1px 2px rgba(15,23,42,0.04)' },
    lbl: { display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '5px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
    readonlyInp: { width: '100%', boxSizing: 'border-box', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 13px', fontSize: '15px', color: '#94a3b8', background: '#f8fafc' },
    card: { background: '#f8fafc', borderRadius: 14, padding: '14px', marginBottom: '16px', border: '1px solid #e2e8f0' },
  }

  return (
    <div style={{ padding: '0 0 120px' }}>
      {/* Header */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '14px 16px' }}>
        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Potvrdenie opravy zariadenia
        </div>
        <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>Revitherm Gas service</div>
        <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px', fontWeight: 500 }}>Servisný list č.: {servisnyListCislo}</div>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Customer selector */}
        {!customerId && (
          <div style={s.section}>
            <label style={s.lbl}>Zákazník</label>
            <CustomerSearch customers={customers} selectedId={selectedCustomerId} onSelect={setSelectedCustomerId} accentColor="#2563eb" />
          </div>
        )}

        {/* Dodavatel */}
        <div style={{ ...s.card, fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>Revitherm s.r.o.</div>
          <div>Komárňanská 76, 821 05 Bratislava</div>
          <div>IČO: 56315201 | IČ DPH: SK 212 227 27 35</div>
          <div>tel.: 0904 885 444 | pachnik@revitherm.sk</div>
        </div>

        {/* Customer info */}
        <div style={s.section}>
          <p style={s.sectionTitle}>Zákazník</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={s.lbl}>Meno / Firma</label>
              <input readOnly value={customer?.nazov || ''} style={s.readonlyInp} />
            </div>
            <div>
              <label style={s.lbl}>Adresa</label>
              <input readOnly value={customer ? [customer.ulica, customer.mesto].filter(Boolean).join(', ') : ''} style={s.readonlyInp} />
            </div>
            <div>
              <label style={s.lbl}>Kontakt</label>
              <input readOnly value={customer?.tel || ''} style={s.readonlyInp} />
            </div>
          </div>
        </div>

        {/* Vyjazd */}
        <div style={s.section}>
          <p style={s.sectionTitle}>Výjazd</p>
          <div>
            <label style={s.lbl}>Dátum výjazdu</label>
            <input type="date" value={form.datum_vyjazdu} onChange={e => setForm(p => ({ ...p, datum_vyjazdu: e.target.value }))} style={s.inp}
              onFocus={e => (e.target.style.borderColor = '#2563eb')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
          </div>
        </div>

        {/* Zariadenie */}
        <div style={s.section}>
          <p style={s.sectionTitle}>Zariadenie</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={s.lbl}>Zariadenie / Typ kotla</label>
              <KotolSearch
                value={form.zariadenie}
                onChange={v => setForm(p => ({ ...p, zariadenie: v }))}
                placeholder="Hľadaj kotol..."
                accentColor="#2563eb"
                inputStyle={{ padding: '12px 13px', fontSize: '15px', borderRadius: 12 }}
              />
            </div>
            <div>
              <label style={s.lbl}>Výrobné číslo</label>
              <input type="text" value={form.vyrobne_cislo} onChange={e => setForm(p => ({ ...p, vyrobne_cislo: e.target.value }))} style={s.inp}
                onFocus={e => (e.target.style.borderColor = '#2563eb')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
            </div>
          </div>
        </div>

        {/* Popis poruchy */}
        <div style={s.section}>
          <p style={s.sectionTitle}>Popis poruchy</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'Nahlásená porucha', field: 'nahlasena_porucha' },
              { label: 'Diagnostika poruchy', field: 'diagnostika' },
              { label: 'Odstránenie poruchy', field: 'odstranenie' },
              { label: 'Poznámka', field: 'poznamka' },
            ].map(({ label, field }) => (
              <div key={field}>
                <label style={s.lbl}>{label}</label>
                <textarea
                  value={form[field as keyof typeof form]}
                  onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                  rows={field === 'poznamka' ? 2 : 3}
                  style={{ ...s.inp, resize: 'none' }}
                  onFocus={e => (e.target.style.borderColor = '#2563eb')}
                  onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Material */}
        <div style={s.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <p style={{ ...s.sectionTitle, margin: 0 }}>Materiál</p>
            <button onClick={() => setMaterial(prev => [...prev, ''])}
              style={{ fontSize: '13px', color: '#2563eb', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
              + Pridať
            </button>
          </div>
          {material.map((nazov, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
              <AutocompleteInput
                value={nazov}
                onChange={v => setMaterial(prev => prev.map((r, idx) => idx === i ? v : r))}
                suggestions={komponenty}
                placeholder="Názov materiálu"
              />
              <button onClick={() => setMaterial(prev => prev.filter((_, idx) => idx !== i))}
                style={{ background: '#fef2f2', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#dc2626', padding: '9px 8px', flexShrink: 0 }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        {/* Ukony */}
        <div style={s.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <p style={{ ...s.sectionTitle, margin: 0 }}>Úkony pri opravách</p>
            <button onClick={() => setUkony(prev => [...prev, ''])}
              style={{ fontSize: '13px', color: '#2563eb', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
              + Pridať
            </button>
          </div>
          {ukony.map((nazov, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
              <AutocompleteInput
                value={nazov}
                onChange={v => setUkony(prev => prev.map((r, idx) => idx === i ? v : r))}
                suggestions={ukonyDb}
                placeholder="Názov úkonu"
              />
              <button onClick={() => setUkony(prev => prev.filter((_, idx) => idx !== i))}
                style={{ background: '#fef2f2', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#dc2626', padding: '9px 8px', flexShrink: 0 }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        {/* Photos */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '16px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 0 0 1px #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <p style={{ ...s.sectionTitle, margin: 0 }}>Fotky zariadenia</p>
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

        {/* Signature */}
        <div style={{ marginBottom: '24px' }}>
          <SignaturePad value={signatureDataUrl} onChange={setSignatureDataUrl} label="Podpis zákazníka" />
          <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#64748b', lineHeight: 1.5, textAlign: 'center' }}>
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
      </div>

      {/* Action buttons */}
      <div style={{ position: 'fixed', bottom: 56, left: 0, right: 0, background: '#fff', borderTop: '1px solid #e2e8f0', padding: '10px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <button onClick={save} disabled={saving || sending || !selectedCustomerId}
          style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 12, padding: '16px', fontSize: '15px', fontWeight: 600, minHeight: 52, cursor: saving || sending || !selectedCustomerId ? 'not-allowed' : 'pointer', opacity: saving || sending || !selectedCustomerId ? 0.6 : 1 }}>
          {saving ? 'Ukladám...' : 'Uložiť'}
        </button>
        <button onClick={saveAndSend} disabled={saving || sending || !selectedCustomerId || !customer?.email}
          style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 12, padding: '16px', fontSize: '15px', fontWeight: 600, minHeight: 52, cursor: saving || sending || !selectedCustomerId || !customer?.email ? 'not-allowed' : 'pointer', opacity: saving || sending || !selectedCustomerId || !customer?.email ? 0.6 : 1 }}>
          {sending ? (sendStatus || 'Odosielam...') : 'Uložiť a poslať'}
        </button>
      </div>
    </div>
  )
}
