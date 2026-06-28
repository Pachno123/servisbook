import { NextResponse } from 'next/server'
import { requireUser, supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type ReviziaRow = {
  id: number
  datum: string
  user_id: string
  customer_id: number | null
  reminder_sent?: boolean
  // These fields may not exist yet (migration 03 not applied)
  reminder_sent_at?: string | null
  reminder_response?: 'yes' | 'no' | null
  reminder_response_at?: string | null
  kotol?: string
  customers: { nazov?: string; email?: string; kotol?: string } | null
}

type OpravaRow = {
  id: number
  datum_vyjazdu: string
  user_id: string
  customer_id: number | null
  material: unknown
  customers: { nazov?: string; kotol?: string } | null
}

type CustomerRow = { id: number; kotol?: string }

function brandOf(kotol: string): string {
  return (kotol || '').trim().split(/\s+/)[0] || ''
}

function modelOf(kotol: string): string {
  return (kotol || '').trim().split(/\s+/).slice(1).join(' ').trim()
}

function topN<T>(map: Map<T, number>, n: number): Array<{ key: T; count: number }> {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ key, count }))
}

export async function GET() {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { user } = auth

  const [reviziaRes, opravaRes, custRes, teamRes] = await Promise.all([
    // Use SELECT * so the API still works before the reminder-tracking migration is applied.
    supabaseAdmin
      .from('revizie')
      .select('*, customers(nazov, email, kotol)')
      .eq('company_id', user.companyId),
    supabaseAdmin
      .from('opravy')
      .select('id, datum_vyjazdu, user_id, customer_id, material, customers(nazov, kotol)')
      .eq('company_id', user.companyId),
    supabaseAdmin
      .from('customers')
      .select('id, kotol')
      .eq('company_id', user.companyId),
    supabaseAdmin
      .from('profiles')
      .select('user_id, full_name')
      .eq('company_id', user.companyId),
  ])

  const revizie = (reviziaRes.data as ReviziaRow[] | null) || []
  const opravy = (opravaRes.data as OpravaRow[] | null) || []
  const customers = (custRes.data as CustomerRow[] | null) || []
  const team = (teamRes.data as Array<{ user_id: string; full_name?: string }> | null) || []

  const nameByUser = new Map(team.map(t => [t.user_id, t.full_name || '']))

  const now = new Date()
  const year = now.getFullYear()
  const lastYear = year - 1

  // Combined service count (revízia + oprava)
  const allServices = [
    ...revizie.map(r => ({ datum: r.datum })),
    ...opravy.map(o => ({ datum: o.datum_vyjazdu })),
  ]

  const servicesThisYear = allServices.filter(s => new Date(s.datum).getFullYear() === year).length
  const servicesTotal = allServices.length

  const reviziaThisYear = revizie.filter(r => new Date(r.datum).getFullYear() === year).length
  const reviziaTotal = revizie.length
  const opravaThisYear = opravy.filter(o => new Date(o.datum_vyjazdu).getFullYear() === year).length
  const opravaTotal = opravy.length

  // Monthly breakdown split by type for current + previous year
  const monthly: { month: number; reviziaThis: number; reviziaLast: number; opravaThis: number; opravaLast: number; thisYear: number; lastYear: number }[] = []
  for (let m = 0; m < 12; m++) monthly.push({ month: m + 1, reviziaThis: 0, reviziaLast: 0, opravaThis: 0, opravaLast: 0, thisYear: 0, lastYear: 0 })
  for (const r of revizie) {
    const d = new Date(r.datum); const y = d.getFullYear(); const m = d.getMonth()
    if (y === year) { monthly[m].reviziaThis++; monthly[m].thisYear++ }
    else if (y === lastYear) { monthly[m].reviziaLast++; monthly[m].lastYear++ }
  }
  for (const o of opravy) {
    const d = new Date(o.datum_vyjazdu); const y = d.getFullYear(); const m = d.getMonth()
    if (y === year) { monthly[m].opravaThis++; monthly[m].thisYear++ }
    else if (y === lastYear) { monthly[m].opravaLast++; monthly[m].lastYear++ }
  }

  // Daily breakdown for the current month
  const monthNow = now.getMonth()
  const daysInMonth = new Date(year, monthNow + 1, 0).getDate()
  const daily: { day: number; revizia: number; oprava: number }[] = []
  for (let d = 1; d <= daysInMonth; d++) daily.push({ day: d, revizia: 0, oprava: 0 })
  for (const r of revizie) {
    const d = new Date(r.datum)
    if (d.getFullYear() === year && d.getMonth() === monthNow) daily[d.getDate() - 1].revizia++
  }
  for (const o of opravy) {
    const d = new Date(o.datum_vyjazdu)
    if (d.getFullYear() === year && d.getMonth() === monthNow) daily[d.getDate() - 1].oprava++
  }
  const reviziaThisMonth = daily.reduce((s, x) => s + x.revizia, 0)
  const opravaThisMonth = daily.reduce((s, x) => s + x.oprava, 0)

  // Distinct devices = customers with non-empty kotol
  const zariadeniaCount = customers.filter(c => (c.kotol || '').trim()).length

  // Top brands (from customer.kotol — every distinct customer device)
  const brandMap = new Map<string, number>()
  for (const c of customers) {
    const b = brandOf(c.kotol || '')
    if (!b) continue
    brandMap.set(b, (brandMap.get(b) || 0) + 1)
  }

  // Top models — combine kotol from revizie + customers
  const modelMap = new Map<string, number>()
  for (const r of revizie) {
    const m = modelOf(r.kotol || r.customers?.kotol || '')
    if (!m) continue
    modelMap.set(m, (modelMap.get(m) || 0) + 1)
  }
  // Also count once per customer device if no revízie touched it yet
  if (modelMap.size < 5) {
    for (const c of customers) {
      const m = modelOf(c.kotol || '')
      if (!m) continue
      modelMap.set(m, (modelMap.get(m) || 0) + 1)
    }
  }

  // Top changed parts from opravy.material (each item in the array)
  const partsMap = new Map<string, number>()
  for (const o of opravy) {
    const items = Array.isArray(o.material) ? (o.material as unknown[]) : []
    for (const it of items) {
      let name = ''
      if (typeof it === 'string') name = it
      else if (it && typeof it === 'object') {
        const obj = it as Record<string, unknown>
        name = String(obj.nazov || obj.name || obj.title || '')
      }
      const trimmed = name.trim().toLowerCase()
      if (!trimmed) continue
      partsMap.set(trimmed, (partsMap.get(trimmed) || 0) + 1)
    }
  }

  // Recent services (top 8 by date desc)
  const recent = allServices
    .map((_, i) => i < revizie.length
      ? { typ: 'revizia' as const, id: revizie[i].id, datum: revizie[i].datum, customer: revizie[i].customers, kotol: revizie[i].kotol || revizie[i].customers?.kotol || '', userId: revizie[i].user_id }
      : { typ: 'oprava' as const, id: opravy[i - revizie.length].id, datum: opravy[i - revizie.length].datum_vyjazdu, customer: opravy[i - revizie.length].customers, kotol: opravy[i - revizie.length].customers?.kotol || '', userId: opravy[i - revizie.length].user_id }
    )
    .sort((a, b) => (b.datum || '').localeCompare(a.datum || ''))
    .slice(0, 8)
    .map(s => ({
      id: s.id,
      typ: s.typ,
      datum: s.datum,
      customerName: s.customer?.nazov || '—',
      kotol: s.kotol,
      technicianName: nameByUser.get(s.userId) || '',
    }))

  // Per-technician
  const perTech: Record<string, { name: string; revizia: number; oprava: number }> = {}
  for (const t of team) {
    perTech[t.user_id] = { name: t.full_name || '—', revizia: 0, oprava: 0 }
  }
  for (const r of revizie) {
    if (!perTech[r.user_id]) perTech[r.user_id] = { name: nameByUser.get(r.user_id) || '—', revizia: 0, oprava: 0 }
    perTech[r.user_id].revizia++
  }
  for (const o of opravy) {
    if (!perTech[o.user_id]) perTech[o.user_id] = { name: nameByUser.get(o.user_id) || '—', revizia: 0, oprava: 0 }
    perTech[o.user_id].oprava++
  }

  // Reminder log
  const reminderLog = revizie
    .filter(r => r.reminder_sent_at)
    .sort((a, b) => (b.reminder_sent_at || '').localeCompare(a.reminder_sent_at || ''))
    .slice(0, 50)
    .map(r => ({
      id: r.id,
      customerName: r.customers?.nazov || '—',
      customerEmail: r.customers?.email || '',
      sentAt: r.reminder_sent_at,
      response: r.reminder_response,
      respondedAt: r.reminder_response_at,
    }))

  return NextResponse.json({
    overview: {
      customersCount: customers.length,
      zariadeniaCount,
      servicesThisYear,
      servicesTotal,
      reviziaThisYear,
      reviziaTotal,
      opravaThisYear,
      opravaTotal,
      reviziaThisMonth,
      opravaThisMonth,
      remindersSent: reminderLog.length,
      remindersYes: revizie.filter(r => r.reminder_response === 'yes').length,
      remindersNo: revizie.filter(r => r.reminder_response === 'no').length,
    },
    year,
    lastYear,
    monthly,
    daily,
    topBrands: topN(brandMap, 5).map(b => ({ name: b.key, count: b.count })),
    topModels: topN(modelMap, 5).map(m => ({ name: m.key, count: m.count })),
    topParts: topN(partsMap, 5).map(p => ({ name: p.key, count: p.count })),
    recent,
    perTech: Object.values(perTech).sort((a, b) => (b.revizia + b.oprava) - (a.revizia + a.oprava)),
    reminderLog,
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'CDN-Cache-Control': 'no-store',
      'Vercel-CDN-Cache-Control': 'no-store',
    },
  })
}
