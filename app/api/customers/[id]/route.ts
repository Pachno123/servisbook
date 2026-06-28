import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase-server'
import { CustomerUpdate } from '@/lib/database.types'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { data, error } = await auth.supabase
    .from('customers')
    .select('*')
    .eq('id', params.id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const body = await req.json() as CustomerUpdate & Record<string, unknown>

  // Retry-on-missing-column: pending migrations (04 GDPR consent, 05 signature)
  // may not yet be applied. Strip any column the schema rejects and try again.
  const attempt = async (payload: Record<string, unknown>) =>
    auth.supabase.from('customers').update(payload).eq('id', params.id).select().single()

  let payload: Record<string, unknown> = { ...body }
  for (let i = 0; i < 5; i++) {
    const { data, error } = await attempt(payload)
    if (!error) return NextResponse.json(data)
    const msg = error.message || ''
    // Postgres: "column 'X' does not exist"
    // PostgREST schema cache: "Could not find the 'X' column of 'customers' ..."
    const m =
      msg.match(/column ['"]?(?:customers\.)?([a-z_]+)['"]? does not exist/i) ||
      msg.match(/find the ['"]?([a-z_]+)['"]? column of/i)
    if (!m) return NextResponse.json({ error: msg }, { status: 500 })
    const offending = m[1]
    if (!(offending in payload)) {
      return NextResponse.json({ error: msg }, { status: 500 })
    }
    delete payload[offending]
  }
  return NextResponse.json({ error: 'Update failed after retries' }, { status: 500 })
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { error } = await auth.supabase.from('customers').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
