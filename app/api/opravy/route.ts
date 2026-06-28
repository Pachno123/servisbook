import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase-server'

export async function GET() {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { data, error } = await auth.supabase
    .from('opravy')
    .select('*, customers(*)')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const body = await req.json()
  // Auto-generate servisny_list_cislo if not provided (per-user counter)
  if (!body.servisny_list_cislo) {
    const year = new Date().getFullYear()
    const { count } = await auth.supabase
      .from('opravy')
      .select('*', { count: 'exact', head: true })
    body.servisny_list_cislo = `SL-${year}-${String((count || 0) + 1).padStart(3, '0')}`
  }
  const { data, error } = await auth.supabase
    .from('opravy')
    .insert({ ...body, user_id: auth.user.id, company_id: auth.user.companyId })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
