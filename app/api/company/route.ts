import { NextResponse } from 'next/server'
import { requireUser, supabaseAdmin } from '@/lib/supabase-server'

export async function GET() {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { data, error } = await supabaseAdmin
    .from('companies')
    .select('*')
    .eq('id', auth.user.companyId)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: Request) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  if (auth.user.role !== 'admin') {
    return NextResponse.json({ error: 'Only admin can edit company' }, { status: 403 })
  }
  const body = await req.json() as { name?: string; phone?: string; email?: string }
  const { data, error } = await supabaseAdmin
    .from('companies')
    .update({
      name: body.name,
      phone: body.phone,
      email: body.email,
      updated_at: new Date().toISOString(),
    })
    .eq('id', auth.user.companyId)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
