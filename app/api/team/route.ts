import { NextResponse } from 'next/server'
import { requireUser, supabaseAdmin } from '@/lib/supabase-server'

// GET — list team members in the current company
export async function GET() {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('user_id, full_name, email, role, created_at')
    .eq('company_id', auth.user.companyId)
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — invite a new technician (admin only)
// Creates an auth user and links to current company.
export async function POST(req: Request) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  if (auth.user.role !== 'admin') {
    return NextResponse.json({ error: 'Only admin can add technicians' }, { status: 403 })
  }
  const body = await req.json() as { email?: string; password?: string; fullName?: string }
  const email = (body.email || '').trim().toLowerCase()
  const password = (body.password || '').trim()
  const fullName = (body.fullName || '').trim()
  if (!email || !password || password.length < 6) {
    return NextResponse.json({ error: 'Email a heslo (min. 6 znakov) sú povinné' }, { status: 400 })
  }

  // Create auth user with company_id + role in metadata so the signup trigger
  // attaches them to the existing company instead of spawning a new one.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: created, error: createErr } = await (supabaseAdmin.auth as any).admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      company_id: auth.user.companyId,
      role: 'technician',
    },
  })
  if (createErr) {
    return NextResponse.json({ error: createErr.message }, { status: 400 })
  }

  // If the trigger didn't attach (e.g. ON CONFLICT skip), update profile explicitly.
  const newUserId = created?.user?.id
  if (newUserId) {
    await supabaseAdmin
      .from('profiles')
      .update({
        company_id: auth.user.companyId,
        role: 'technician',
        full_name: fullName,
        email,
      })
      .eq('user_id', newUserId)
  }

  return NextResponse.json({ ok: true, userId: newUserId, email, password })
}

// DELETE — remove a technician (admin only). Use ?userId=...
export async function DELETE(req: Request) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  if (auth.user.role !== 'admin') {
    return NextResponse.json({ error: 'Only admin can remove technicians' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const targetUserId = searchParams.get('userId')
  if (!targetUserId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
  if (targetUserId === auth.user.id) {
    return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })
  }

  // Verify the target is in the same company
  const { data: targetProfile } = await supabaseAdmin
    .from('profiles')
    .select('company_id')
    .eq('user_id', targetUserId)
    .maybeSingle()
  const tp = targetProfile as { company_id?: string } | null
  if (!tp || tp.company_id !== auth.user.companyId) {
    return NextResponse.json({ error: 'Not your team member' }, { status: 403 })
  }

  // Delete auth user (cascades profile via FK ON DELETE CASCADE)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: delErr } = await (supabaseAdmin.auth as any).admin.deleteUser(targetUserId)
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
