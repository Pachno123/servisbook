import { NextResponse } from 'next/server'
import { sendMail } from '@/lib/mailer'
import { requireUser, supabaseAdmin } from '@/lib/supabase-server'

export async function GET() {
  const auth = await requireUser()
  if ('error' in auth) return auth.error

  // Load my company branding (used in customer-facing emails)
  const { data: company } = await supabaseAdmin
    .from('companies')
    .select('name, phone, email')
    .eq('id', auth.user.companyId)
    .maybeSingle()
  const c = (company as { name?: string; phone?: string; email?: string } | null) || {}
  const companyName = c.name || 'ServisBook'
  const techName = auth.user.fullName || ''
  const techPhone = c.phone || ''
  const techEmail = c.email || ''

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const testReviziaId = 'TEST-123'
  const customerName = 'Testovací zákazník'

  const parts = companyName.split('|').map((s: string) => s.trim())
  const main = (parts[0] || companyName).toUpperCase()
  const sub = (parts[1] || 'Gas Service').toUpperCase()

  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;background:#f2f2f2;padding:28px 0;margin:0;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:3px;overflow:hidden;">

    <div style="padding:38px 48px 28px;border-bottom:1px solid #e6e6e6;text-align:center;">
      <div style="font-size:24px;font-weight:800;letter-spacing:4px;color:#1a1a1a;">${main}</div>
      <div style="font-size:11px;color:#aaa;letter-spacing:0.14em;margin-top:4px;">${sub}</div>
      <div style="width:40px;height:2px;background:#e85d04;margin:10px auto 0;"></div>
    </div>

    <div style="padding:36px 48px 28px;">
      <p style="margin:0 0 15px;font-size:15px;color:#1a1a1a;line-height:1.6;">Dobrý deň, <strong>${customerName}</strong>,</p>
      <p style="margin:0 0 26px;font-size:15px;color:#333;line-height:1.75;">Blíži sa výročný termín vykonania servisnej prehliadky vášho kotla.</p>
      <p style="margin:0 0 26px;font-size:15px;color:#333;">V prípade záujmu dohodnutia si termínu prosím kliknite na nasledovný odkaz.</p>

      <div style="margin:30px 0;text-align:center;">
        <a href="${baseUrl}/api/reminder/yes?reviziaId=${testReviziaId}"
           style="background:#16a34a;color:#fff;padding:13px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
          Áno, mám záujem
        </a>
        <p style="color:#9ca3af;font-size:13px;margin:14px 0 0;">Po kliknutí Vás budeme kontaktovať v čo najkratšom čase.</p>
      </div>

      ${techName ? `<p style="margin:0 0 2px;font-size:14px;color:#1a1a1a;font-weight:700;">${techName}</p>` : ''}
      <p style="margin:0;font-size:13px;color:#999;">${companyName}</p>
    </div>

    ${(techEmail || techPhone) ? `
    <div style="background:#f7f7f7;border-top:1px solid #e6e6e6;padding:18px 48px 14px;text-align:center;">
      ${techEmail ? `<a href="mailto:${techEmail}" style="font-size:13px;color:#1155cc;text-decoration:underline;">${techEmail}</a>` : ''}
      ${techEmail && techPhone ? '&nbsp;&nbsp;|&nbsp;&nbsp;' : ''}
      ${techPhone ? `<a href="tel:${techPhone.replace(/\s+/g, '')}" style="font-size:13px;color:#1155cc;text-decoration:underline;">${techPhone}</a>` : ''}
    </div>` : ''}

  </div>
</div>
  `

  const recipient = techEmail || auth.user.email
  const result = await sendMail({
    to: recipient,
    fromName: companyName,
    replyTo: techEmail || undefined,
    subject: `TEST – Termín servisnej prehliadky${companyName ? ' – ' + companyName.split('|')[0].trim() : ''}`,
    html,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  return new NextResponse(`
    <html><body style="font-family:Arial;text-align:center;padding:60px 20px;">
      <h2 style="color:#16a34a;">✓ Test email odoslaný</h2>
      <p style="font-size:16px;">Email bol odoslaný na <strong>${recipient}</strong></p>
      <p style="color:#6b7280;font-size:13px;">Message ID: ${result.messageId}</p>
    </body></html>
  `, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
