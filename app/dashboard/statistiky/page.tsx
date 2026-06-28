'use client'

import { useEffect, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend as RcLegend,
} from 'recharts'

interface StatsResponse {
  overview: {
    customersCount: number
    zariadeniaCount: number
    servicesThisYear: number
    servicesTotal: number
    reviziaThisYear: number
    reviziaTotal: number
    opravaThisYear: number
    opravaTotal: number
    reviziaThisMonth: number
    opravaThisMonth: number
    remindersSent: number
    remindersYes: number
    remindersNo: number
  }
  year: number
  lastYear: number
  monthly: Array<{ month: number; reviziaThis: number; reviziaLast: number; opravaThis: number; opravaLast: number; thisYear: number; lastYear: number }>
  daily: Array<{ day: number; revizia: number; oprava: number }>
  topBrands: Array<{ name: string; count: number }>
  topModels: Array<{ name: string; count: number }>
  topParts: Array<{ name: string; count: number }>
  recent: Array<{
    id: number
    typ: 'revizia' | 'oprava'
    datum: string
    customerName: string
    kotol: string
    technicianName: string
  }>
  perTech: Array<{ name: string; revizia: number; oprava: number }>
  reminderLog: Array<{
    id: number
    customerName: string
    customerEmail: string
    sentAt: string | null
    response: 'yes' | 'no' | null
    respondedAt: string | null
  }>
}

const BLUE = '#2563eb'
const BLUE_DARK = '#1d4ed8'
const BLUE_SOFT = '#dbeafe'
const ORANGE = '#ea580c'
const ORANGE_SOFT = '#ffedd5'
const TEXT = '#0f172a'
const MUTED = '#64748b'

function formatDate(s: string): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateTime(s: string | null): string {
  if (!s) return '—'
  return new Date(s).toLocaleString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function CountUp({ to }: { to: number }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const dur = 700
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur)
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to])
  return <>{v}</>
}

export default function StatistikyPage() {
  const [data, setData] = useState<StatsResponse | null>(null)
  const [err, setErr] = useState<string>('')
  const [range, setRange] = useState<'month' | 'year'>('month')
  const [kind, setKind] = useState<'revizia' | 'oprava' | 'all'>('all')

  const load = () => {
    fetch(`/api/stats?_t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(setData)
      .catch(e => setErr(String(e)))
  }
  useEffect(() => {
    load()
    const onVis = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', load)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', load)
    }
  }, [])

  if (err) return <div style={{ padding: 24, color: '#dc2626' }}>Chyba: {err}</div>
  if (!data) return <div style={{ padding: 24, color: MUTED }}>Načítavam…</div>

  // Build chart data based on toggles
  const chartData = range === 'month'
    ? data.daily.map(d => ({
        label: String(d.day),
        Revízie: d.revizia,
        Opravy: d.oprava,
      }))
    : data.monthly.map(m => ({
        label: String(m.month).padStart(2, '0'),
        Revízie: m.reviziaThis,
        Opravy: m.opravaThis,
      }))

  const pieData = range === 'month'
    ? [
        { name: 'Revízie', value: data.overview.reviziaThisMonth, fill: BLUE },
        { name: 'Opravy', value: data.overview.opravaThisMonth, fill: ORANGE },
      ]
    : [
        { name: 'Revízie', value: data.overview.reviziaThisYear, fill: BLUE },
        { name: 'Opravy', value: data.overview.opravaThisYear, fill: ORANGE },
      ]

  const pieTotal = pieData.reduce((s, p) => s + p.value, 0)

  return (
    <div style={{
      padding: '20px 16px 100px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      background: '#f5f5f7',
      minHeight: '100vh',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0 20px' }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: TEXT, letterSpacing: '-0.02em' }}>
          Prehľad
        </h1>
        <button
          onClick={() => { setData(null); load() }}
          aria-label="Obnoviť dáta"
          style={{
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
            width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: BLUE_DARK,
            boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>

      {/* Stav firmy */}
      <Section icon="chart" title="Stav firmy" delay={0}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <StatCard icon="user" label="Zákazníci" value={data.overview.customersCount} />
          <StatCard icon="hex" label="Zariadenia" value={data.overview.zariadeniaCount} />
          <StatCard icon="cal" label="Revízie (mesiac)" value={data.overview.reviziaThisMonth} accent={BLUE} />
          <StatCard icon="wrench" label="Opravy (mesiac)" value={data.overview.opravaThisMonth} accent={ORANGE} />
          <StatCard icon="cal" label={`Revízie (${data.year})`} value={data.overview.reviziaThisYear} accent={BLUE} />
          <StatCard icon="wrench" label={`Opravy (${data.year})`} value={data.overview.opravaThisYear} accent={ORANGE} />
          <StatCard icon="cal" label="Revízie celkom" value={data.overview.reviziaTotal} />
          <StatCard icon="wrench" label="Opravy celkom" value={data.overview.opravaTotal} />
        </div>
      </Section>

      {/* Vývoj servisov — animovaný graf s prepínačmi */}
      <Section icon="bars" title="Vývoj servisov" delay={0.06}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
          <SegmentedControl
            options={[
              { value: 'month', label: 'Mesiac' },
              { value: 'year', label: 'Rok' },
            ]}
            value={range}
            onChange={(v) => setRange(v as 'month' | 'year')}
          />
          <SegmentedControl
            options={[
              { value: 'all', label: 'Spolu' },
              { value: 'revizia', label: 'Revízie' },
              { value: 'oprava', label: 'Opravy' },
            ]}
            value={kind}
            onChange={(v) => setKind(v as 'revizia' | 'oprava' | 'all')}
          />
        </div>
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }}
                cursor={{ fill: 'rgba(37,99,235,0.06)' }}
              />
              {(kind === 'all' || kind === 'revizia') && (
                <Bar dataKey="Revízie" fill={BLUE} radius={[4, 4, 0, 0]} isAnimationActive animationDuration={700} />
              )}
              {(kind === 'all' || kind === 'oprava') && (
                <Bar dataKey="Opravy" fill={ORANGE} radius={[4, 4, 0, 0]} isAnimationActive animationDuration={700} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* Rozdelenie typov */}
      {pieTotal > 0 && (
        <Section icon="chart" title={`Rozdelenie ${range === 'month' ? 'mesiac' : 'rok'}`} delay={0.12}>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85}
                  paddingAngle={2}
                  isAnimationActive
                  animationDuration={700}
                  label={(entry: { value?: number }) => `${entry.value ?? 0}`}
                  labelLine={false}
                >
                  {pieData.map((p) => <Cell key={p.name} fill={p.fill} />)}
                </Pie>
                <RcLegend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      {/* Nedávne servisy */}
      <Section icon="cal" title="Nedávne servisy" delay={0.18}>
        {data.recent.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: MUTED }}>Zatiaľ žiadne servisy.</p>
        ) : (
          <div>
            {data.recent.map((r, i) => (
              <div key={`${r.typ}-${r.id}`} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 12, padding: '14px 0',
                borderBottom: i < data.recent.length - 1 ? '1px solid #f1f5f9' : 'none',
              }}>
                <div style={{ fontSize: 14, color: TEXT, fontWeight: 600, minWidth: 88, flexShrink: 0 }}>
                  {formatDate(r.datum)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.customerName}
                  </div>
                  {r.kotol && (
                    <div style={{ fontSize: 12, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                      {r.kotol}
                    </div>
                  )}
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 700,
                  padding: '3px 8px', borderRadius: 20,
                  background: r.typ === 'revizia' ? BLUE_SOFT : ORANGE_SOFT,
                  color: r.typ === 'revizia' ? BLUE_DARK : '#c2410c',
                  flexShrink: 0, whiteSpace: 'nowrap',
                }}>
                  {r.typ === 'revizia' ? 'REVÍZIA' : 'OPRAVA'}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Pripomienky */}
      <Section icon="bell" title="Pripomienky" delay={0.24}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <MiniStat label="Odoslané" value={data.overview.remindersSent} color={TEXT} />
          <MiniStat label="Záujem" value={data.overview.remindersYes} color={BLUE} />
          <MiniStat label="Bez záujmu" value={data.overview.remindersNo} color={MUTED} />
          <MiniStat label="Čakajúce" value={Math.max(0, data.overview.remindersSent - data.overview.remindersYes - data.overview.remindersNo)} color={ORANGE} />
        </div>
        {data.reminderLog.length > 0 && (
          <div style={{ marginTop: 16, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Posledné pripomienky
            </div>
            {data.reminderLog.slice(0, 6).map((r, i) => (
              <div key={r.id} style={{
                padding: '10px 0',
                borderBottom: i < Math.min(5, data.reminderLog.length - 1) ? '1px solid #f8fafc' : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <strong style={{ fontSize: 13, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.customerName}
                  </strong>
                  <ResponseBadge response={r.response} />
                </div>
                <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                  Odoslané {formatDateTime(r.sentAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Vaše zariadenia */}
      <Section icon="gear" title="Vaše zariadenia" delay={0.3}>
        <TopList title="Najčastejšie servisované zariadenia" items={data.topBrands} />
        <div style={{ height: 14 }} />
        <TopList title="Najčastejšie servisované modely" items={data.topModels} />
        {data.topParts.length > 0 && (
          <>
            <div style={{ height: 14 }} />
            <TopList title="Najčastejšie menené diely" items={data.topParts} />
          </>
        )}
      </Section>

      {/* Tým */}
      {data.perTech.length > 1 && (
        <Section icon="user" title="Podľa technika" delay={0.36}>
          {data.perTech.map((p, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 0',
              borderBottom: i < data.perTech.length - 1 ? '1px solid #f1f5f9' : 'none',
            }}>
              <span style={{ fontSize: 14, color: TEXT, fontWeight: 600 }}>{p.name}</span>
              <span style={{ fontSize: 12, color: MUTED }}>
                <strong style={{ color: BLUE_DARK }}>{p.revizia}</strong> rev. ·{' '}
                <strong style={{ color: ORANGE }}>{p.oprava}</strong> opr.
              </span>
            </div>
          ))}
        </Section>
      )}
    </div>
  )
}

// ────────────────────────── components ──────────────────────────

function Section({ icon, title, children, delay = 0 }: { icon: 'chart' | 'cal' | 'bars' | 'gear' | 'user' | 'bell'; title: string; children: React.ReactNode; delay?: number }) {
  return (
    <section style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 16,
      padding: '18px 18px 20px',
      marginBottom: 16,
      boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      animation: 'fadeInUp 0.4s ease both',
      animationDelay: `${delay}s`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Icon name={icon} color={BLUE_DARK} size={20} />
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: TEXT, letterSpacing: '-0.01em' }}>
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

function SegmentedControl({ options, value, onChange }: {
  options: Array<{ value: string; label: string }>
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div style={{
      display: 'flex', background: '#f1f5f9', borderRadius: 10, padding: 3, gap: 2,
    }}>
      {options.map(opt => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1,
              border: 'none', cursor: 'pointer',
              padding: '8px 10px', borderRadius: 8,
              fontSize: 13, fontWeight: 600,
              background: active ? '#fff' : 'transparent',
              color: active ? TEXT : MUTED,
              boxShadow: active ? '0 1px 3px rgba(15,23,42,0.08)' : 'none',
              transition: 'background 0.15s ease, color 0.15s ease',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function StatCard({ icon, label, value, accent }: { icon: 'user' | 'hex' | 'cal' | 'wrench'; label: string; value: number; accent?: string }) {
  const color = accent || BLUE_DARK
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      padding: '14px',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name={icon} color={color} size={18} />
        <span style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: TEXT, letterSpacing: '-0.02em', lineHeight: 1 }}>
        <CountUp to={value} />
      </div>
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      background: '#f8fafc',
      border: '1px solid #e5e7eb',
      borderRadius: 10,
      padding: '10px 12px',
    }}>
      <div style={{ fontSize: 11, color: MUTED, fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: '-0.02em' }}>
        <CountUp to={value} />
      </div>
    </div>
  )
}

function TopList({ title, items }: { title: string; items: Array<{ name: string; count: number }> }) {
  if (items.length === 0) return null
  return (
    <div>
      <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: TEXT }}>{title}</h3>
      {items.map((it, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '8px 0',
          borderBottom: i < items.length - 1 ? '1px solid #f8fafc' : 'none',
        }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            background: BLUE_SOFT, color: BLUE_DARK,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, flexShrink: 0,
          }}>{i + 1}</div>
          <div style={{ flex: 1, fontSize: 13, color: TEXT, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {it.name}
          </div>
          <div style={{
            background: '#f1f5f9', borderRadius: 20,
            padding: '3px 10px', fontSize: 12, fontWeight: 700, color: TEXT, flexShrink: 0,
          }}>{it.count}</div>
        </div>
      ))}
    </div>
  )
}

function ResponseBadge({ response }: { response: 'yes' | 'no' | null }) {
  if (response === 'yes') return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: BLUE_SOFT, color: BLUE_DARK, whiteSpace: 'nowrap' }}>ZÁUJEM</span>
  if (response === 'no') return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#f1f5f9', color: MUTED, whiteSpace: 'nowrap' }}>BEZ ZÁUJMU</span>
  return <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#fef3c7', color: '#92400e', whiteSpace: 'nowrap' }}>ČAKÁ</span>
}

function Icon({ name, color, size = 20 }: { name: 'chart' | 'cal' | 'bars' | 'gear' | 'user' | 'hex' | 'bell' | 'wrench'; color: string; size?: number }) {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (name) {
    case 'chart': return <svg {...props}><polyline points="3 17 9 11 13 15 21 7" /><polyline points="14 7 21 7 21 14" /></svg>
    case 'cal': return <svg {...props}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
    case 'bars': return <svg {...props}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
    case 'gear': return <svg {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
    case 'user': return <svg {...props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
    case 'hex': return <svg {...props}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>
    case 'bell': return <svg {...props}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
    case 'wrench': return <svg {...props}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
  }
}
