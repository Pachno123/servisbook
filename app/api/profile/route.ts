import { NextResponse } from 'next/server'
import { requireUser, supabaseAdmin } from '@/lib/supabase-server'

export async function GET() {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('user_id, full_name, email, role, company_id')
    .eq('user_id', auth.user.id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) {
    return NextResponse.json({
      user_id: auth.user.id,
      full_name: auth.user.fullName,
      email: auth.user.email,
      role: auth.user.role,
      company_id: auth.user.companyId,
    })
  }
  return NextResponse.json(data)
}

// PUT — update one's own profile fields (full_name only; email is auth-managed)
export async function PUT(req: Request) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const body = await req.json() as { full_name?: string }
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ full_name: body.full_name ?? '', updated_at: new Date().toISOString() })
    .eq('user_id', auth.user.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
