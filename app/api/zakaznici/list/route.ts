import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase-server'

// Combined endpoint for the customer list screen.
// Returns customers + latest-revízia-per-customer in one round-trip so the
// /dashboard/zakaznici screen doesn't pay two cold-start hops on first load.
export async function GET() {
  const auth = await requireUser()
  if ('error' in auth) return auth.error

  const [cusRes, revRes] = await Promise.all([
    auth.supabase.from('customers').select('*').order('nazov'),
    auth.supabase
      .from('revizie')
      .select('customer_id, datum, next_revizia_date')
      .not('customer_id', 'is', null)
      .order('datum', { ascending: false }),
  ])

  if (cusRes.error) return NextResponse.json({ error: cusRes.error.message }, { status: 500 })
  if (revRes.error) return NextResponse.json({ error: revRes.error.message }, { status: 500 })

  const seen = new Set<number>()
  const latestRevizie: { customer_id: number; datum: string; next_revizia_date: string | null }[] = []
  for (const r of revRes.data || []) {
    if (r.customer_id == null) continue
    if (seen.has(r.customer_id)) continue
    seen.add(r.customer_id)
    latestRevizie.push({
      customer_id: r.customer_id,
      datum: r.datum,
      next_revizia_date: r.next_revizia_date ?? null,
    })
  }

  return NextResponse.json({
    customers: cusRes.data || [],
    latestRevizie,
  })
}
