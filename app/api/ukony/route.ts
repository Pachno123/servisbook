import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET() {
  const { data, error } = await supabaseAdmin.from('ukony').select('*').order('nazov')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { nazov?: string } | null
  const nazov = body?.nazov?.trim()
  if (!nazov) return NextResponse.json({ error: 'nazov required' }, { status: 400 })

  // Upsert on the unique nazov — duplicates are silently no-ops.
  const { data, error } = await supabaseAdmin
    .from('ukony')
    .upsert({ nazov }, { onConflict: 'nazov', ignoreDuplicates: true })
    .select()
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? { nazov })
}
