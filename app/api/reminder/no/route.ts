import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const reviziaId = searchParams.get('reviziaId')

  // Try to load the technician's company branding via the revízia → company chain
  let company = 'Gas Service'
  let phone = ''
  let email = ''

  if (reviziaId) {
    // Record response (no)
    await supabaseAdmin
      .from('revizie')
      .update({ reminder_response: 'no', reminder_response_at: new Date().toISOString() })
      .eq('id', reviziaId)

    const { data: revizia } = await supabaseAdmin
      .from('revizie')
      .select('company_id')
      .eq('id', reviziaId)
      .maybeSingle()
    const r = revizia as { company_id?: string } | null
    if (r?.company_id) {
      const { data: c } = await supabaseAdmin
        .from('companies')
        .select('name, phone, email')
        .eq('id', r.company_id)
        .maybeSingle()
      const cc = c as { name?: string; phone?: string; email?: string } | null
      if (cc) {
        company = cc.name || company
        phone = cc.phone || ''
        email = cc.email || ''
      }
    }
  }

  const contactBits = [email, phone].filter(Boolean).join(' · ')

  return new NextResponse(`
    <html><body style="font-family: Arial, sans-serif; text-align: center; padding: 48px 24px; background: #f8fafc;">
      <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 1px 6px rgba(0,0,0,0.06);">
        <h2 style="color: #475569; margin: 0 0 12px;">Rozumieme.</h2>
        <p style="color: #475569; line-height: 1.6;">Ak si neskôr rozmyslíte, neváhajte nás kontaktovať.</p>
        <p style="color: #94a3b8; font-size: 13px; margin: 24px 0 0;">${company}${contactBits ? ' · ' + contactBits : ''}</p>
      </div>
    </body></html>
  `, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
