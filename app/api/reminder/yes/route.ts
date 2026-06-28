import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { sendMail } from '@/lib/mailer'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const reviziaId = searchParams.get('reviziaId')

  let technicianBranding = {
    company_name: 'Gas Service',
    phone: '',
    email: '',
  }

  if (reviziaId) {
    const { data: revizia } = await supabaseAdmin
      .from('revizie')
      .select('*, customers(*)')
      .eq('id', reviziaId)
      .single()

    const r = revizia as {
      company_id?: string
      customers: { nazov?: string; tel?: string; email?: string; ulica?: string; mesto?: string } | null
    } | null

    const customer = r?.customers
    const companyId = r?.company_id

    // Load company branding (used as "from" identity and recipient = company email)
    if (companyId) {
      const { data: company } = await supabaseAdmin
        .from('companies')
        .select('name, phone, email')
        .eq('id', companyId)
        .maybeSingle()
      const c = company as { name?: string; phone?: string; email?: string } | null
      if (c) {
        technicianBranding = {
          company_name: c.name || 'Gas Service',
          phone: c.phone || '',
          email: c.email || '',
        }
      }
    }

    // Record response (yes)
    await supabaseAdmin
      .from('revizie')
      .update({ reminder_response: 'yes', reminder_response_at: new Date().toISOString() })
      .eq('id', reviziaId)

    if (customer && technicianBranding.email) {
      const adresa = [customer.ulica, customer.mesto].filter(Boolean).join(', ')
      await sendMail({
        to: technicianBranding.email,
        fromName: technicianBranding.company_name || 'ServisBook',
        replyTo: customer.email || undefined,
        subject: `Záujem o servisnú prehliadku – ${customer.nazov || 'zákazník'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #16a34a; margin: 0 0 16px;">Zákazník má záujem o servisnú prehliadku</h2>
            <p style="margin: 0 0 16px; color: #444;">Zákazník klikol na "Áno, mám záujem" v upomienkovom e-maile.</p>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr><td style="padding: 8px 12px; background: #f3f4f6; color: #6b7280; width: 35%;">Meno</td>
                  <td style="padding: 8px 12px; color: #111827;"><strong>${customer.nazov || '–'}</strong></td></tr>
              <tr><td style="padding: 8px 12px; background: #f3f4f6; color: #6b7280;">Adresa</td>
                  <td style="padding: 8px 12px; color: #111827;">${adresa || '–'}</td></tr>
              <tr><td style="padding: 8px 12px; background: #f3f4f6; color: #6b7280;">Telefón</td>
                  <td style="padding: 8px 12px; color: #111827;">${customer.tel ? `<a href="tel:${customer.tel}" style="color: #2563eb; text-decoration: none;">${customer.tel}</a>` : '–'}</td></tr>
              <tr><td style="padding: 8px 12px; background: #f3f4f6; color: #6b7280;">E-mail</td>
                  <td style="padding: 8px 12px; color: #111827;">${customer.email ? `<a href="mailto:${customer.email}" style="color: #2563eb; text-decoration: none;">${customer.email}</a>` : '–'}</td></tr>
            </table>
            <p style="margin: 20px 0 0; color: #6b7280; font-size: 13px;">Kontaktujte zákazníka a dohodnite si termín.</p>
          </div>
        `,
      })
    }
  }

  const company = technicianBranding.company_name || 'Gas Service'
  const phone = technicianBranding.phone

  return new NextResponse(`
    <html><body style="font-family: Arial, sans-serif; text-align: center; padding: 48px 24px; background: #f8fafc;">
      <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 1px 6px rgba(0,0,0,0.06);">
        <div style="font-size: 48px; margin-bottom: 12px;">✓</div>
        <h2 style="color: #16a34a; margin: 0 0 12px;">Ďakujeme za záujem!</h2>
        <p style="color: #475569; line-height: 1.6;">Budeme Vás kontaktovať kvôli dohodnutiu termínu servisnej prehliadky.</p>
        <p style="color: #94a3b8; font-size: 13px; margin: 24px 0 0;">${company}${phone ? ' | ' + phone : ''}</p>
      </div>
    </body></html>
  `, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
