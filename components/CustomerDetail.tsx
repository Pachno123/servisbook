'use client'

import { useState, useEffect } from 'react'
import { Customer } from '@/lib/database.types'
import { useRouter } from 'next/navigation'

interface CustomerDetailProps {
  customer: Customer
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

interface HistoryItem {
  id: number
  typ: 'revizia' | 'oprava'
  datum: string
  sposobile?: boolean | null
  nahlasena_porucha?: string
  checks?: Array<{ id: string; label: string; checked: boolean }>
  diagnostika?: string
  odstranenie?: string
  servisny_list_cislo?: string
  poznamka?: string
  material?: Array<{ id: string; nazov: string; ks: number; cena_za_ks: number }>
  ukony?: Array<{ id: string; nazov: string; cena: number }>
  pdfUrl?: string | null
}

function formatDate(str: string): string {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      {children}
    </div>
  )
}

function RecordDetail({ item, onBack }: { item: HistoryItem; onBack: () => void }) {
  const checks = item.checks || []
  const material = item.material || []
  const ukony = item.ukony || []
  const isRevizia = item.typ === 'revizia'

  return (
    <div>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10, background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px',
      }}>
        <button onClick={onBack} style={{
          background: '#f1f5f9', border: 'none', cursor: 'pointer',
          width: 44, height: 44, borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#475569', fontSize: '22px', flexShrink: 0,
        }}>‹</button>
        <div style={{ flex: 1 }}>
          <span style={{
            fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: 20,
            background: isRevizia ? '#dbeafe' : '#fff7ed',
            color: isRevizia ? '#1d4ed8' : '#c2410c',
          }}>
            {isRevizia ? 'Revízia' : 'Oprava'}
          </span>
          <span style={{ marginLeft: '8px', fontSize: '13px', color: '#64748b' }}>{formatDate(item.datum)}</span>
        </div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {item.pdfUrl && (
          <a
            href={item.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: '#2563eb', color: '#fff', textDecoration: 'none',
              padding: '13px 16px', borderRadius: 12, fontSize: 14, fontWeight: 600,
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>📄</span>
            Otvoriť PDF protokol
          </a>
        )}
        {isRevizia ? (
          <>
            {item.sposobile !== null && item.sposobile !== undefined && (
              <div style={{
                textAlign: 'center', padding: '12px', borderRadius: 12,
                background: item.sposobile ? '#f0fdf4' : '#fef2f2',
                color: item.sposobile ? '#16a34a' : '#dc2626',
                fontWeight: 700, fontSize: '15px', letterSpacing: '0.04em',
              }}>
                {item.sposobile ? '✓ SPÔSOBILÉ' : '✗ NESPÔSOBILÉ'}
              </div>
            )}
            {checks.length > 0 && (
              <Section label="Kontrolný zoznam">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {checks.map(c => (
                    <div key={c.id} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '8px 10px', borderRadius: 8,
                      background: c.checked ? '#eff6ff' : '#f8fafc',
                    }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                        background: c.checked ? '#2563eb' : '#e2e8f0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {c.checked && (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <span style={{ fontSize: '13px', color: c.checked ? '#0f172a' : '#94a3b8' }}>{c.label}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </>
        ) : (
          <>
            {item.servisny_list_cislo && (
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>{item.servisny_list_cislo}</p>
            )}
            {item.nahlasena_porucha && (
              <Section label="Nahlásená porucha">
                <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>{item.nahlasena_porucha}</p>
              </Section>
            )}
            {item.diagnostika && (
              <Section label="Diagnostika">
                <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>{item.diagnostika}</p>
              </Section>
            )}
            {item.odstranenie && (
              <Section label="Odstránenie">
                <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>{item.odstranenie}</p>
              </Section>
            )}
            {material.length > 0 && (
              <Section label="Materiál">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {material.map(m => (
                    <div key={m.id} style={{ fontSize: '13px', color: '#334155', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                      {m.nazov}{m.ks > 1 ? ` × ${m.ks}` : ''}
                    </div>
                  ))}
                </div>
              </Section>
            )}
            {ukony.length > 0 && (
              <Section label="Úkony">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {ukony.map(u => (
                    <div key={u.id} style={{ fontSize: '13px', color: '#334155', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>{u.nazov}</div>
                  ))}
                </div>
              </Section>
            )}
          </>
        )}
        {item.poznamka && (
          <Section label="Poznámka">
            <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>{item.poznamka}</p>
          </Section>
        )}
      </div>
    </div>
  )
}

export default function CustomerDetail({ customer, onClose, onEdit, onDelete }: CustomerDetailProps) {
  const router = useRouter()
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [selectedRecord, setSelectedRecord] = useState<HistoryItem | null>(null)

  useEffect(() => {
    async function load() {
      setHistoryLoading(true)
      const [revRes, oprRes] = await Promise.all([
        fetch('/api/revizie'),
        fetch('/api/opravy'),
      ])
      const combined: HistoryItem[] = []
      if (revRes.ok) {
        const data = await revRes.json()
        for (const r of data) {
          if (r.customer_id === customer.id) {
            combined.push({
              id: r.id, typ: 'revizia',
              datum: r.datum || r.created_at,
              sposobile: r.sposobile,
              checks: r.checks,
              poznamka: r.poznamka,
              pdfUrl: r.protokol_url ?? null,
            })
          }
        }
      }
      if (oprRes.ok) {
        const data = await oprRes.json()
        for (const o of data) {
          if (o.customer_id === customer.id) {
            combined.push({
              id: o.id, typ: 'oprava',
              datum: o.datum_vyjazdu || o.created_at,
              nahlasena_porucha: o.nahlasena_porucha,
              diagnostika: o.diagnostika,
              odstranenie: o.odstranenie,
              servisny_list_cislo: o.servisny_list_cislo,
              material: o.material,
              ukony: o.ukony,
              poznamka: o.poznamka,
              pdfUrl: o.zaznam_url ?? null,
            })
          }
        }
      }
      combined.sort((a, b) => (a.datum < b.datum ? 1 : -1))
      setHistory(combined)
      setHistoryLoading(false)
    }
    load()
  }, [customer.id])

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.5)', animation: 'fadeIn 0.2s ease' }} />

      {/* Sheet */}
      <div
        style={{
          position: 'relative', background: '#fff', borderRadius: '20px 20px 0 0',
          width: '100%', maxHeight: '92dvh', overflowY: 'auto',
          paddingBottom: 'env(safe-area-inset-bottom)',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          display: 'flex', flexDirection: 'column',
          animation: 'slideUp 0.25s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e2e8f0' }} />
        </div>

        {selectedRecord ? (
          <RecordDetail item={selectedRecord} onBack={() => setSelectedRecord(null)} />
        ) : (
          <>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px 14px', borderBottom: '1px solid #f1f5f9',
            }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '12px', letterSpacing: '-0.01em' }}>
                {customer.nazov}
              </h2>
              <button onClick={onClose} style={{
                background: '#f1f5f9', border: 'none', borderRadius: 10,
                width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#64748b', cursor: 'pointer', fontSize: '22px', flexShrink: 0,
              }}>×</button>
            </div>

            {/* Info */}
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(customer.ulica || customer.mesto) && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                    </svg>
                    <div>
                      {customer.ulica && <p style={{ margin: 0, fontSize: '14px', color: '#334155' }}>{customer.ulica}</p>}
                      {customer.mesto && <p style={{ margin: 0, fontSize: '14px', color: '#334155' }}>{customer.mesto}</p>}
                    </div>
                  </div>
                )}
                {customer.tel && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.45 2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.8a16 16 0 0 0 6.29 6.29l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    <a href={`tel:${customer.tel}`} style={{ fontSize: '14px', color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>{customer.tel}</a>
                  </div>
                )}
                {customer.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                    </svg>
                    <a href={`mailto:${customer.email}`} style={{ fontSize: '14px', color: '#2563eb', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customer.email}</a>
                  </div>
                )}
                {customer.kotol && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                    </svg>
                    <p style={{ margin: 0, fontSize: '14px', color: '#334155' }}>{customer.kotol}</p>
                  </div>
                )}
                {customer.interval && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                    <p style={{ margin: 0, fontSize: '14px', color: '#334155' }}>Interval: {customer.interval}</p>
                  </div>
                )}
                {customer.vyrobne_cislo && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                    <p style={{ margin: 0, fontSize: '14px', color: '#334155' }}>VČ: {customer.vyrobne_cislo}</p>
                  </div>
                )}
                {customer.poznamka && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                    </svg>
                    <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>{customer.poznamka}</p>
                  </div>
                )}
              </div>

              {/* GDPR consent */}
              {customer.gdpr_consent && (
                <div style={{
                  marginTop: 4, padding: '12px 14px',
                  background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: customer.gdpr_signature ? 10 : 0 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', background: '#16a34a',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <div style={{ fontSize: 13, color: '#166534', lineHeight: 1.4 }}>
                      <strong style={{ fontWeight: 700 }}>Súhlasil s GDPR</strong>
                      {customer.gdpr_consent_date && (
                        <span style={{ color: '#15803d' }}> · {formatDate(customer.gdpr_consent_date)}</span>
                      )}
                    </div>
                  </div>
                  {customer.gdpr_signature && (
                    <div style={{
                      background: '#fff', border: '1px solid #d1fae5', borderRadius: 8,
                      padding: 8, display: 'flex', justifyContent: 'center',
                    }}>
                      <img
                        src={customer.gdpr_signature}
                        alt="Podpis zákazníka"
                        style={{ maxWidth: '100%', maxHeight: 90, objectFit: 'contain' }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                onClick={() => { onClose(); router.push(`/dashboard/revizia?customerId=${customer.id}`) }}
                style={{
                  background: '#2563eb', color: '#fff', border: 'none', borderRadius: 12,
                  padding: '16px', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                Revízia
              </button>
              <button
                onClick={() => { onClose(); router.push(`/dashboard/oprava?customerId=${customer.id}`) }}
                style={{
                  background: '#f97316', color: '#fff', border: 'none', borderRadius: 12,
                  padding: '16px', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
                Oprava
              </button>
            </div>

            {/* History */}
            <div style={{ padding: '16px' }}>
              <p style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>História</p>
              {historyLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                  <div style={{ width: 24, height: 24, border: '2px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                </div>
              ) : history.length === 0 ? (
                <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>Zatiaľ žiadna história</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {history.map(item => (
                    <button
                      key={`${item.typ}-${item.id}`}
                      onClick={() => setSelectedRecord(item)}
                      style={{
                        width: '100%', textAlign: 'left', background: '#f8fafc',
                        border: '1px solid #e2e8f0', borderRadius: 10,
                        padding: '14px 14px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '10px',
                        minHeight: 56,
                      }}
                    >
                      <span style={{
                        fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: 20, flexShrink: 0,
                        background: item.typ === 'revizia' ? '#dbeafe' : '#fff7ed',
                        color: item.typ === 'revizia' ? '#1d4ed8' : '#c2410c',
                      }}>
                        {item.typ === 'revizia' ? 'Revízia' : 'Oprava'}
                      </span>
                      <span style={{ fontSize: '13px', color: '#64748b', flexShrink: 0 }}>{formatDate(item.datum)}</span>
                      <span style={{ fontSize: '13px', color: '#334155', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.typ === 'revizia'
                          ? (item.sposobile === true ? 'Spôsobilé' : item.sposobile === false ? 'Nespôsobilé' : '')
                          : (item.nahlasena_porucha || '')}
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Edit / Delete */}
            <div style={{ padding: '4px 16px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button onClick={onEdit}
                style={{
                  border: '1px solid #e2e8f0', background: '#fff', borderRadius: 12,
                  padding: '14px', fontSize: '15px', fontWeight: 600,
                  color: '#475569', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Upraviť
              </button>
              <button onClick={onDelete}
                style={{
                  border: 'none', background: '#fef2f2', borderRadius: 12,
                  padding: '14px', fontSize: '15px', fontWeight: 600,
                  color: '#dc2626', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
                Zmazať
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
