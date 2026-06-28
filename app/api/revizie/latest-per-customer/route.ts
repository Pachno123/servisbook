import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase-server'

// Slim endpoint for the customer list view.
// Returns ONE row per customer (the most recent revízia) with only the fields
// the card needs. Replaces /api/revizie which pulls every revízia + the full
// joined customer object — ~95% smaller payload.
export async function GET() {
  const auth = await requireUser()
  if ('error' in auth) return auth.error

  const { data, error } = await auth.supabase
    .from('revizie')
    .select('customer_id, datum, next_revizia_date')
    .not('customer_id', 'is', null)
    .order('datum', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const seen = new Set<number>()
  const out: { customer_id: number; datum: string; next_revizia_date: string | null }[] = []
  for (const r of data || []) {
    if (r.customer_id == null) continue
    if (seen.has(r.customer_id)) continue
    seen.add(r.customer_id)
    out.push({
      customer_id: r.customer_id,
      datum: r.datum,
      next_revizia_date: r.next_revizia_date ?? null,
    })
  }

  return NextResponse.json(out)
}
