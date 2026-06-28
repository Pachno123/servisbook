'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Customer } from '@/lib/database.types'
import CustomerCard from '@/components/CustomerCard'
import CustomerForm from '@/components/CustomerForm'
import CustomerDetail from '@/components/CustomerDetail'

function getIntervalYears(interval: string): number | null {
  if (interval === '1 rok') return 1
  if (interval === '2 roky') return 2
  if (interval === '3 roky') return 3
  return null
}

function computeNextService(lastDateStr: string, interval: string): Date | null {
  const years = getIntervalYears(interval)
  if (!years) return null
  const d = new Date(lastDateStr)
  d.setFullYear(d.getFullYear() + years)
  return d
}

export default function ZakazniciPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filtered, setFiltered] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterStatus, setFilterStatus] = useState<'' | 'overdue' | 'soon30' | 'soon90'>('')
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'last_desc' | 'last_asc' | 'next_asc'>('name_asc')
  const [prefsLoaded, setPrefsLoaded] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [lastReviziaMap, setLastReviziaMap] = useState<Record<number, { datum: string; nextReviziaDate: string | null }>>({})
  const filterRef = useRef<HTMLDivElement>(null)

  const fetchData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true)
    setLoadError(false)

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 5000)
    )

    try {
      const res = await Promise.race([fetch('/api/zakaznici/list'), timeout])

      if (res.ok) {
        const { customers, latestRevizie }: {
          customers: Customer[]
          latestRevizie: { customer_id: number; datum: string; next_revizia_date: string | null }[]
        } = await res.json()
        setCustomers(customers)
        try { sessionStorage.setItem('zakaznici_customers', JSON.stringify(customers)) } catch {}

        const map: Record<number, { datum: string; nextReviziaDate: string | null }> = {}
        for (const r of latestRevizie) {
          map[r.customer_id] = { datum: r.datum, nextReviziaDate: r.next_revizia_date }
        }
        setLastReviziaMap(map)
        try { sessionStorage.setItem('zakaznici_revizie_map', JSON.stringify(map)) } catch {}
      } else if (!isBackground) {
        setLoadError(true)
      }
    } catch (err) {
      console.error('[zakaznici] fetchData failed:', err)
      if (!isBackground) setLoadError(true)
    }

    setLoading(false)
  }, [])

  // Stale-while-revalidate: paint cached data immediately, then refresh in background.
  useEffect(() => {
    let hadCache = false
    try {
      const cachedCustomers = sessionStorage.getItem('zakaznici_customers')
      const cachedMap = sessionStorage.getItem('zakaznici_revizie_map')
      if (cachedCustomers) {
        const data = JSON.parse(cachedCustomers)
        setCustomers(data)
        hadCache = true
      }
      if (cachedMap) setLastReviziaMap(JSON.parse(cachedMap))
    } catch {}
    if (hadCache) {
      setLoading(false)
      fetchData(true)
    } else {
      fetchData(false)
    }
  }, [fetchData])

  // Load saved filter preferences once on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('zakaznici_prefs')
      if (raw) {
        const p = JSON.parse(raw)
        if (p.sortBy) setSortBy(p.sortBy)
        if (typeof p.filterCity === 'string') setFilterCity(p.filterCity)
        if (typeof p.filterStatus === 'string') setFilterStatus(p.filterStatus)
      }
    } catch {}
    setPrefsLoaded(true)
  }, [])

  // Persist filter preferences whenever they change (after initial load)
  useEffect(() => {
    if (!prefsLoaded) return
    try {
      localStorage.setItem('zakaznici_prefs', JSON.stringify({ sortBy, filterCity, filterStatus }))
    } catch {}
  }, [prefsLoaded, sortBy, filterCity, filterStatus])

  const uniqueCities = Array.from(new Set(customers.map((c) => c.mesto).filter(Boolean))).sort()

  useEffect(() => {
    const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    const q = fold(search)
    const today = new Date(); today.setHours(0, 0, 0, 0)

    function daysToNext(custId: number): number | null {
      const next = lastReviziaMap[custId]?.nextReviziaDate
      if (!next) return null
      const d = new Date(next); d.setHours(0, 0, 0, 0)
      return Math.round((d.getTime() - today.getTime()) / 86_400_000)
    }

    const out = customers.filter((c) => {
      const matchSearch = !q ||
        fold(c.nazov).includes(q) ||
        fold(c.ulica || '').includes(q) ||
        fold(c.mesto || '').includes(q) ||
        fold(c.tel || '').includes(q) ||
        fold(c.kotol || '').includes(q)
      if (!matchSearch) return false
      if (filterCity && c.mesto !== filterCity) return false
      if (filterStatus) {
        const days = daysToNext(c.id)
        if (filterStatus === 'overdue' && (days === null || days >= 0)) return false
        if (filterStatus === 'soon30' && (days === null || days < 0 || days > 30)) return false
        if (filterStatus === 'soon90' && (days === null || days < 0 || days > 90)) return false
      }
      return true
    })

    // Sort
    out.sort((a, b) => {
      const aL = lastReviziaMap[a.id]?.datum || ''
      const bL = lastReviziaMap[b.id]?.datum || ''
      const aN = lastReviziaMap[a.id]?.nextReviziaDate || ''
      const bN = lastReviziaMap[b.id]?.nextReviziaDate || ''
      switch (sortBy) {
        case 'name_asc':  return a.nazov.localeCompare(b.nazov, 'sk')
        case 'name_desc': return b.nazov.localeCompare(a.nazov, 'sk')
        case 'last_desc': return (bL || '0').localeCompare(aL || '0')
        case 'last_asc':  return (aL || '9').localeCompare(bL || '9')
        case 'next_asc':  return (aN || '9').localeCompare(bN || '9')
      }
    })

    setFiltered(out)
  }, [search, filterCity, filterStatus, sortBy, customers, lastReviziaMap])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilters(false)
      }
    }
    if (showFilters) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showFilters])

  const handleFormClose = () => { setShowForm(false); setEditCustomer(null) }
  const handleFormSaved = () => { fetchData(); setShowForm(false); setEditCustomer(null) }
  const handleEdit = (customer: Customer) => { setSelectedCustomer(null); setEditCustomer(customer); setShowForm(true) }
  const handleDelete = async (id: number) => {
    if (!confirm('Naozaj chcete zmazať tohto zákazníka?')) return
    await fetch(`/api/customers/${id}`, { method: 'DELETE' })
    fetchData()
    setSelectedCustomer(null)
  }

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Search + Filter + Add */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hľadaj zákazníka..."
            style={{
              width: '100%', boxSizing: 'border-box',
              border: '1px solid #e2e8f0', borderRadius: 12,
              paddingLeft: '38px', paddingRight: '12px', paddingTop: '13px', paddingBottom: '13px',
              fontSize: '15px', color: '#0f172a', background: '#fff', outline: 'none',
              boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
            }}
          />
        </div>
        <div style={{ position: 'relative' }} ref={filterRef}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '13px 14px', borderRadius: 12,
              border: (filterCity || filterStatus) ? 'none' : '1px solid #e2e8f0',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              background: (filterCity || filterStatus) ? '#2563eb' : '#fff',
              color: (filterCity || filterStatus) ? '#fff' : '#475569',
              boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
              position: 'relative',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
            </svg>
            Filtre
            {(filterCity || filterStatus) && (
              <span style={{
                fontSize: 10, fontWeight: 700,
                background: 'rgba(255,255,255,0.25)', borderRadius: 10,
                padding: '1px 6px', marginLeft: 2,
              }}>{[filterCity, filterStatus].filter(Boolean).length}</span>
            )}
          </button>
          {showFilters && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 6px)',
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14,
              boxShadow: '0 12px 32px rgba(15,23,42,0.15)', zIndex: 20, minWidth: 240, maxWidth: 280,
              padding: '6px 0',
              maxHeight: '70vh', overflowY: 'auto',
            }}>
              {/* Sort */}
              <p style={{ padding: '10px 14px 4px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Zoradiť</p>
              {([
                ['name_asc', 'Meno A → Z'],
                ['name_desc', 'Meno Z → A'],
                ['last_desc', 'Najnovšia revízia hore'],
                ['last_asc', 'Najstaršia revízia hore'],
                ['next_asc', 'Blížiaca sa revízia hore'],
              ] as const).map(([key, label]) => (
                <button key={key} onClick={() => { setSortBy(key); setShowFilters(false) }}
                  style={{ width: '100%', textAlign: 'left', padding: '13px 16px', fontSize: 15, border: 'none', background: 'none', cursor: 'pointer', color: sortBy === key ? '#2563eb' : '#475569', fontWeight: sortBy === key ? 600 : 400 }}>
                  {sortBy === key ? '✓ ' : ''}{label}
                </button>
              ))}

              {/* Status (upcoming revision) */}
              <div style={{ height: 1, background: '#f1f5f9', margin: '4px 0' }} />
              <p style={{ padding: '10px 14px 4px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Stav revízie</p>
              {([
                ['', 'Všetky'],
                ['overdue', 'Po termíne'],
                ['soon30', 'Do 30 dní'],
                ['soon90', 'Do 90 dní'],
              ] as const).map(([key, label]) => (
                <button key={key} onClick={() => { setFilterStatus(key); setShowFilters(false) }}
                  style={{ width: '100%', textAlign: 'left', padding: '13px 16px', fontSize: 15, border: 'none', background: 'none', cursor: 'pointer', color: filterStatus === key ? '#2563eb' : '#475569', fontWeight: filterStatus === key ? 600 : 400 }}>
                  {filterStatus === key ? '✓ ' : ''}{label}
                </button>
              ))}

              {/* Mesto */}
              {uniqueCities.length > 0 && (
                <>
                  <div style={{ height: 1, background: '#f1f5f9', margin: '4px 0' }} />
                  <p style={{ padding: '10px 14px 4px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Mesto</p>
                  <button onClick={() => { setFilterCity(''); setShowFilters(false) }}
                    style={{ width: '100%', textAlign: 'left', padding: '13px 16px', fontSize: 15, border: 'none', background: 'none', cursor: 'pointer', color: !filterCity ? '#2563eb' : '#475569', fontWeight: !filterCity ? 600 : 400 }}>
                    {!filterCity ? '✓ ' : ''}Všetky mestá
                  </button>
                  {uniqueCities.map((city) => (
                    <button key={city} onClick={() => { setFilterCity(city); setShowFilters(false) }}
                      style={{ width: '100%', textAlign: 'left', padding: '13px 16px', fontSize: 15, border: 'none', background: 'none', cursor: 'pointer', color: filterCity === city ? '#2563eb' : '#475569', fontWeight: filterCity === city ? 600 : 400 }}>
                      {filterCity === city ? '✓ ' : ''}{city}
                    </button>
                  ))}
                </>
              )}

              {/* Reset */}
              {(filterCity || filterStatus || sortBy !== 'name_asc') && (
                <>
                  <div style={{ height: 1, background: '#f1f5f9', margin: '4px 0' }} />
                  <button onClick={() => { setFilterCity(''); setFilterStatus(''); setSortBy('name_asc'); setShowFilters(false) }}
                    style={{ width: '100%', textAlign: 'left', padding: '14px 16px', fontSize: 14, border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626', fontWeight: 600 }}>
                    Vymazať všetky filtre
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Add button */}
        <button
          onClick={() => setShowForm(true)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 46, height: 46, borderRadius: 12, flexShrink: 0,
            background: '#2563eb', color: '#fff', border: 'none',
            cursor: 'pointer', fontSize: '22px', lineHeight: 1,
            boxShadow: '0 2px 8px rgba(37,99,235,0.35)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(37,99,235,0.5)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(37,99,235,0.35)' }}
          onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.95)' }}
          onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)' }}
          aria-label="Pridať zákazníka"
        >
          +
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
          {filtered.length} {filtered.length === 1 ? 'zákazník' : filtered.length < 5 ? 'zákazníci' : 'zákazníkov'}
        </span>
        {filterCity && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
            <span>Mesto: <strong style={{ color: '#0f172a' }}>{filterCity}</strong></span>
            <button onClick={() => setFilterCity('')} style={{ color: '#2563eb', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: 0 }}>×</button>
          </div>
        )}
      </div>

      {/* Customer list */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '56px 0' }}>
          <div style={{ width: 28, height: 28, border: '2.5px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        </div>
      ) : loadError ? (
        <div style={{ textAlign: 'center', padding: '48px 16px' }}>
          <div style={{ fontSize: '38px', marginBottom: '12px' }}>⚠️</div>
          <p style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: '0 0 6px' }}>Nepodarilo sa načítať zákazníkov</p>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px' }}>Skontrolujte pripojenie alebo skúste znova.</p>
          <button
            onClick={() => fetchData()}
            style={{
              background: '#2563eb', color: '#fff', border: 'none',
              borderRadius: 12, padding: '12px 28px',
              fontSize: '15px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Skúsiť znova
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M19 8v6M22 11h-6" />
            </svg>
          </div>
          <div>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
              {search || filterCity ? 'Žiadna zhoda' : 'Zatiaľ žiadni zákazníci'}
            </p>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
              {search || filterCity ? 'Skús inakšie hľadanie alebo zruš filter.' : 'Pridaj prvého zákazníka kliknutím na modré +'}
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map((customer, index) => {
            const entry = lastReviziaMap[customer.id] || null
            const lastDate = entry?.datum || null
            const nextDate = lastDate && customer.interval ? computeNextService(lastDate, customer.interval) : null
            const nextReviziaDate = entry?.nextReviziaDate || null
            return (
              <div
                key={customer.id}
                style={{
                  animation: 'fadeInUp 0.35s ease both',
                  animationDelay: `${Math.min(index * 0.05, 0.4)}s`,
                }}
              >
                <CustomerCard
                  customer={customer}
                  onClick={() => setSelectedCustomer(customer)}
                  lastReviziaDate={lastDate}
                  nextServiceDate={nextDate}
                  nextReviziaDate={nextReviziaDate}
                />
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <CustomerForm
          customer={editCustomer}
          onClose={handleFormClose}
          onSaved={handleFormSaved}
        />
      )}

      {selectedCustomer && (
        <CustomerDetail
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onEdit={() => handleEdit(selectedCustomer)}
          onDelete={() => handleDelete(selectedCustomer.id)}
        />
      )}
    </div>
  )
}
