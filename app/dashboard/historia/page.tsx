'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface HistoriaItem {
  id: number
  typ: 'revizia' | 'oprava'
  datum: string
  customers: {
    id: number
    nazov: string
    ulica?: string
    mesto?: string
    kotol?: string
  } | null
  // revizia fields
  checks?: unknown
  poznamka?: string
  // oprava fields
  nahlasena_porucha?: string
  diagnostika?: string
  odstranenie?: string
  servisny_list_cislo?: string
  material?: unknown
  ukony?: unknown
}

function formatDate(str: string): string {
  if (!str) return '—'
  const d = new Date(str)
  return d.toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function ReviziaDetail({ item }: { item: HistoriaItem }) {
  const checks = (item.checks as Array<{ id: string; label: string; checked: boolean }>) || []
  const [photos, setPhotos] = useState<string[]>([])
  const [pdfs, setPdfs] = useState<{ name: string; url: string }[]>([])
  const [lightbox, setLightbox] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadAssets() {
      // Photos: list files in fotky/revizie/{id}/
      const { data: photoList } = await supabase.storage
        .from('fotky')
        .list(`revizie/${item.id}`, { sortBy: { column: 'name', order: 'asc' } })
      if (cancelled) return
      if (photoList && photoList.length > 0) {
        const urls = photoList
          .filter((f) => !f.name.startsWith('.'))
          .map((f) => supabase.storage.from('fotky').getPublicUrl(`revizie/${item.id}/${f.name}`).data.publicUrl)
        setPhotos(urls)
      }

      // PDFs: check if zaznam.pdf and protokol.pdf exist in protokoly/{id}/
      const { data: pdfList } = await supabase.storage
        .from('protokoly')
        .list(String(item.id))
      if (cancelled) return
      if (pdfList && pdfList.length > 0) {
        const out = pdfList
          .filter((f) => f.name.endsWith('.pdf'))
          .map((f) => ({
            name: f.name === 'protokol.pdf' ? 'Protokol' : f.name === 'zaznam.pdf' ? 'Servisný záznam (starý)' : f.name,
            url: supabase.storage.from('protokoly').getPublicUrl(`${item.id}/${f.name}`).data.publicUrl,
          }))
        // Prefer protokol.pdf — if both exist (old data) show protokol first
        out.sort((a, b) => (a.name === 'Protokol' ? -1 : 1))
        setPdfs(out)
      }
    }
    loadAssets()
    return () => { cancelled = true }
  }, [item.id])

  return (
    <div>
      <div style={{ marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>ZÁKAZNÍK</span>
        <p style={{ margin: '2px 0 0', fontSize: '15px', fontWeight: 600, color: '#111827' }}>{item.customers?.nazov || '—'}</p>
        {(item.customers?.ulica || item.customers?.mesto) && (
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>
            {item.customers?.ulica ? `${item.customers.ulica}, ` : ''}{item.customers?.mesto}
          </p>
        )}
        {item.customers?.kotol && (
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>{item.customers.kotol}</p>
        )}
      </div>
      <div style={{ marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>DÁTUM</span>
        <p style={{ margin: '2px 0 0', fontSize: '15px', color: '#111827' }}>{formatDate(item.datum)}</p>
      </div>
      {checks.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>KONTROLNÉ BODY</span>
          <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {checks.map((c) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px' }}>{c.checked ? '✅' : '⬜'}</span>
                <span style={{ fontSize: '13px', color: c.checked ? '#111827' : '#9ca3af' }}>{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {item.poznamka && (
        <div style={{ marginBottom: '12px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>POZNÁMKA</span>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#374151' }}>{item.poznamka}</p>
        </div>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>FOTKY ({photos.length})</span>
          <div style={{ marginTop: '6px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {photos.map((url, i) => (
              <button
                key={i}
                onClick={() => setLightbox(url)}
                style={{
                  position: 'relative', padding: 0, border: 'none', background: 'none', cursor: 'pointer',
                  borderRadius: '10px', overflow: 'hidden', aspectRatio: '1 / 1',
                }}
              >
                <img src={url} alt={`Foto ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PDFs */}
      {pdfs.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>POSLANÉ PDF</span>
          <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {pdfs.map((p) => (
              <a
                key={p.name}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', borderRadius: '10px',
                  background: '#f3f4f6', textDecoration: 'none',
                  color: '#111827', fontSize: '14px', fontWeight: 600,
                }}
              >
                <span style={{ fontSize: '18px' }}>📄</span>
                <span style={{ flex: 1 }}>{p.name}</span>
                <span style={{ color: '#2563eb', fontSize: '13px' }}>Otvoriť</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox for photo preview */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
            cursor: 'pointer',
          }}
        >
          <img
            src={lightbox}
            alt=""
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'absolute', top: '20px', right: '20px',
              background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
              fontSize: '24px', width: '40px', height: '40px', borderRadius: '50%',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}

function OpravaDetail({ item }: { item: HistoriaItem }) {
  const material = (item.material as Array<{ id: string; nazov: string; ks: number; cena_bez_dph: number }>) || []
  const ukony = (item.ukony as Array<{ id: string; nazov: string; cena_bez_dph: number }>) || []
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabase.storage.from('protokoly').list(`opravy/${item.id}`)
      if (cancelled) return
      if (data && data.some((f) => f.name === 'zaznam.pdf')) {
        setPdfUrl(supabase.storage.from('protokoly').getPublicUrl(`opravy/${item.id}/zaznam.pdf`).data.publicUrl)
      }
    }
    load()
    return () => { cancelled = true }
  }, [item.id])

  return (
    <div>
      <div style={{ marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>ZÁKAZNÍK</span>
        <p style={{ margin: '2px 0 0', fontSize: '15px', fontWeight: 600, color: '#111827' }}>{item.customers?.nazov || '—'}</p>
        {(item.customers?.ulica || item.customers?.mesto) && (
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>
            {item.customers?.ulica ? `${item.customers.ulica}, ` : ''}{item.customers?.mesto}
          </p>
        )}
        {item.customers?.kotol && (
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>{item.customers.kotol}</p>
        )}
      </div>
      <div style={{ marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>DÁTUM</span>
        <p style={{ margin: '2px 0 0', fontSize: '15px', color: '#111827' }}>{formatDate(item.datum)}</p>
        {item.servisny_list_cislo && (
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#9ca3af' }}>{item.servisny_list_cislo}</p>
        )}
      </div>
      {item.nahlasena_porucha && (
        <div style={{ marginBottom: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>NAHLÁSENÁ PORUCHA</span>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#374151' }}>{item.nahlasena_porucha}</p>
        </div>
      )}
      {item.diagnostika && (
        <div style={{ marginBottom: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>DIAGNOSTIKA</span>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#374151' }}>{item.diagnostika}</p>
        </div>
      )}
      {item.odstranenie && (
        <div style={{ marginBottom: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>ODSTRÁNENIE</span>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#374151' }}>{item.odstranenie}</p>
        </div>
      )}
      {material.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>MATERIÁL</span>
          <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {material.map((m) => (
              <div key={m.id} style={{ fontSize: '13px', color: '#374151' }}>
                {m.nazov} {m.ks > 1 ? `× ${m.ks}` : ''}
              </div>
            ))}
          </div>
        </div>
      )}
      {ukony.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>ÚKONY</span>
          <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {ukony.map((u) => (
              <div key={u.id} style={{ fontSize: '13px', color: '#374151' }}>{u.nazov}</div>
            ))}
          </div>
        </div>
      )}
      {pdfUrl && (
        <div>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>POSLANÉ PDF</span>
          <div style={{ marginTop: '6px' }}>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '10px',
                background: '#f3f4f6', textDecoration: 'none',
                color: '#111827', fontSize: '14px', fontWeight: 600,
              }}
            >
              <span style={{ fontSize: '18px' }}>📄</span>
              <span style={{ flex: 1 }}>Servisný záznam</span>
              <span style={{ color: '#2563eb', fontSize: '13px' }}>Otvoriť</span>
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

export default function HistoriaPage() {
  const [items, setItems] = useState<HistoriaItem[]>([])
  const [filtered, setFiltered] = useState<HistoriaItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<HistoriaItem | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [revRes, oprRes] = await Promise.all([
        fetch('/api/revizie'),
        fetch('/api/opravy'),
      ])
      const combined: HistoriaItem[] = []
      if (revRes.ok) {
        const revData = await revRes.json()
        for (const r of revData) {
          combined.push({
            id: r.id,
            typ: 'revizia',
            datum: r.datum || r.created_at,
            customers: r.customers,
            checks: r.checks,
            poznamka: r.poznamka,
          })
        }
      }
      if (oprRes.ok) {
        const oprData = await oprRes.json()
        for (const o of oprData) {
          combined.push({
            id: o.id,
            typ: 'oprava',
            datum: o.datum_vyjazdu || o.created_at,
            customers: o.customers,
            nahlasena_porucha: o.nahlasena_porucha,
            diagnostika: o.diagnostika,
            odstranenie: o.odstranenie,
            servisny_list_cislo: o.servisny_list_cislo,
            material: o.material,
            ukony: o.ukony,
            poznamka: o.poznamka,
          })
        }
      }
      // Sort newest first
      combined.sort((a, b) => (a.datum < b.datum ? 1 : -1))
      setItems(combined)
      setFiltered(combined)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    if (!q) { setFiltered(items); return }
    setFiltered(items.filter((item) => {
      const name = item.customers?.nazov?.toLowerCase() || ''
      return name.includes(q)
    }))
  }, [search, items])

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Search */}
      <div style={{ position: 'relative' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hľadaj podľa mena zákazníka..."
          style={{
            width: '100%', boxSizing: 'border-box',
            border: '1.5px solid #e5e7eb', borderRadius: '10px',
            paddingLeft: '36px', paddingRight: '12px', paddingTop: '12px', paddingBottom: '12px',
            fontSize: '15px', color: '#111827', background: '#fff', outline: 'none',
          }}
        />
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>
          <p style={{ fontSize: '17px', margin: '0 0 4px' }}>Žiadne záznamy</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map((item) => (
            <button
              key={`${item.typ}-${item.id}`}
              onClick={() => setSelected(item)}
              style={{
                width: '100%', textAlign: 'left', background: '#fff',
                border: '1px solid #e5e7eb', borderRadius: '12px',
                padding: '14px 16px', cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{
                      fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px',
                      background: item.typ === 'revizia' ? '#dbeafe' : '#fff7ed',
                      color: item.typ === 'revizia' ? '#1d4ed8' : '#c2410c',
                    }}>
                      {item.typ === 'revizia' ? 'Revízia' : 'Oprava'}
                    </span>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>{formatDate(item.datum)}</span>
                  </div>
                  <p style={{ margin: '0 0 3px', fontSize: '15px', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.customers?.nazov || '—'}
                  </p>
                  {(item.customers?.ulica || item.customers?.mesto) && (
                    <p style={{ margin: '0 0 2px', fontSize: '13px', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.customers?.ulica ? `${item.customers.ulica}, ` : ''}{item.customers?.mesto}
                    </p>
                  )}
                  {item.customers?.kotol && (
                    <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.customers.kotol}
                    </p>
                  )}
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '4px' }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setSelected(null)}>
          <div
            style={{
              width: '100%', background: '#fff', borderRadius: '20px 20px 0 0',
              maxHeight: '88dvh', overflowY: 'auto',
              padding: '0 0 calc(48px + env(safe-area-inset-bottom))',
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{
              position: 'sticky', top: 0, background: selected.typ === 'revizia' ? '#dbeafe' : '#fff7ed',
              borderBottom: `1px solid ${selected.typ === 'revizia' ? '#bfdbfe' : '#fed7aa'}`,
              padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderRadius: '20px 20px 0 0',
            }}>
              <div>
                <span style={{
                  fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                  background: selected.typ === 'revizia' ? '#bfdbfe' : '#fed7aa',
                  color: selected.typ === 'revizia' ? '#1e40af' : '#9a3412',
                }}>
                  {selected.typ === 'revizia' ? 'Revízia' : 'Oprava'}
                </span>
                <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 700, color: selected.typ === 'revizia' ? '#1e40af' : '#9a3412' }}>
                  {selected.customers?.nazov || '—'}
                </p>
              </div>
              <button onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', fontSize: '24px', color: '#9ca3af', cursor: 'pointer', lineHeight: 1, padding: '4px' }}>
                ×
              </button>
            </div>
            <div style={{ padding: '16px' }}>
              {selected.typ === 'revizia'
                ? <ReviziaDetail item={selected} />
                : <OpravaDetail item={selected} />}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
