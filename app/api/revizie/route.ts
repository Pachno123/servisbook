import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase-server'

export async function GET() {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { data, error } = await auth.supabase
    .from('revizie')
    .select('*, customers(*)')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const body = await req.json()
  console.log('[revizie POST] body keys:', Object.keys(body))
  if (body.datum) {
    const d = new Date(body.datum)
    d.setMonth(d.getMonth() + 11)
    body.next_revizia_date = d.toISOString().split('T')[0]
  }
  const { data, error } = await auth.supabase
    .from('revizie')
    .insert({ ...body, user_id: auth.user.id, company_id: auth.user.companyId })
    .select()
    .single()
  if (error) {
    console.error('[revizie POST] supabase error:', error)
    return NextResponse.json({ error: error.message, details: error.details, hint: error.hint }, { status: 500 })
  }
  return NextResponse.json(data)
}
