import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase-server'
import { ReviziaUpdate } from '@/lib/database.types'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { data, error } = await auth.supabase
    .from('revizie')
    .select('*, customers(*)')
    .eq('id', params.id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const body = await req.json() as ReviziaUpdate
  const { data, error } = await auth.supabase
    .from('revizie')
    .update(body)
    .eq('id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
