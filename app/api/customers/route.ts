import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase-server'

export async function GET() {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { data, error } = await auth.supabase.from('customers').select('*').order('nazov')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const body = await req.json()

  // Retry-on-missing-column: see PUT route for rationale (pending migrations).
  let payload: Record<string, unknown> = { ...body, user_id: auth.user.id, company_id: auth.user.companyId }
  for (let i = 0; i < 5; i++) {
    const { data, error } = await auth.supabase.from('customers').insert(payload).select().single()
    if (!error) return NextResponse.json(data)
    const msg = error.message || ''
    const m =
      msg.match(/column ['"]?(?:customers\.)?([a-z_]+)['"]? does not exist/i) ||
      msg.match(/find the ['"]?([a-z_]+)['"]? column of/i)
    if (!m) return NextResponse.json({ error: msg }, { status: 500 })
    const offending = m[1]
    if (!(offending in payload)) return NextResponse.json({ error: msg }, { status: 500 })
    delete payload[offending]
  }
  return NextResponse.json({ error: 'Insert failed after retries' }, { status: 500 })
}
