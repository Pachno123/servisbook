import { NextResponse } from 'next/server'
import { requireUser, supabaseAdmin } from '@/lib/supabase-server'
import { sendMail } from '@/lib/mailer'

interface BrandingProfile {
  full_name: string
  company_name: string
  phone: string
  email: string
}

const DEFAULT_BRANDING: BrandingProfile = {
  full_name: '',
  company_name: 'Gas Service',
  phone: '',
  email: '',
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function buildLogo(brand: BrandingProfile) {
  const company = escapeHtml(brand.company_name || 'Gas Service')
  // Show first word as the big mark, rest as subtitle
  const parts = company.split('|').map(s => s.trim())
  const main = (parts[0] || company).toUpperCase()
  const sub = (parts[1] || 'Gas Service').toUpperCase()
  return `
    <div style="text-align: center; padding: 30px 0 20px 0;">
      <div style="font-size: 28px; font-weight: 800; letter-spacing: 4px; color: #1a1a1a;">${main}</div>
      <div style="font-size: 13px; color: #888; letter-spacing: 2px; margin-top: 4px;">${sub}</div>
      <div style="width: 40px; height: 2px; background: #e85d04; margin: 10px auto 0;"></div>
    </div>`
}

function buildFooter(brand: BrandingProfile) {
  const items: string[] = []
  if (brand.email) {
    items.push(`<a href="mailto:${escapeHtml(brand.email)}" style="color: #555; text-decoration: none; font-size: 13px;">${escapeHtml(brand.email)}</a>`)
  }
  if (brand.phone) {
    items.push(`<a href="tel:${escapeHtml(brand.phone.replace(/\s+/g, ''))}" style="color: #555; text-decoration: none; font-size: 13px;">${escapeHtml(brand.phone)}</a>`)
  }
  if (!items.length) return ''
  return `
    <div style="background: #f9f9f9; padding: 20px 40px; text-align: center; border-top: 1px solid #eeeeee;">
      ${items.join('&nbsp;&nbsp;|&nbsp;&nbsp;')}
    </div>`
}

function buildSignature(brand: BrandingProfile) {
  const name = escapeHtml(brand.full_name || '')
  const company = escapeHtml(brand.company_name || '')
  return `${name}${name && company ? '<br/>' : ''}${company}`
}

function emailWrapper(content: string, brand: BrandingProfile) {
  return `
  <div style="background-color: #f4f4f4; padding: 40px 0; font-family: Arial, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden;">
      <div style="background: #ffffff; border-bottom: 1px solid #eeeeee;">
        ${buildLogo(brand)}
      </div>
      <div style="padding: 40px;">
        ${content}
      </div>
      ${buildFooter(brand)}
    </div>
  </div>`
}

async function loadBranding(userId: string | null): Promise<BrandingProfile> {
  if (!userId) return DEFAULT_BRANDING
  // Branding = technician's full_name (signature) + their company name/phone/email (header & footer)
  const { data: prof } = await supabaseAdmin
    .from('profiles')
    .select('full_name, company_id')
    .eq('user_id', userId)
    .maybeSingle()
  const p = prof as { full_name?: string; company_id?: string } | null
  if (!p?.company_id) return DEFAULT_BRANDING
  const { data: company } = await supabaseAdmin
    .from('companies')
    .select('name, phone, email')
    .eq('id', p.company_id)
    .maybeSingle()
  const c = company as { name?: string; phone?: string; email?: string } | null
  return {
    full_name: p.full_name || '',
    company_name: c?.name || 'Gas Service',
    phone: c?.phone || '',
    email: c?.email || '',
  }
}

export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch (e) {
    console.error('[send-email] req.json() failed:', e)
    return NextResponse.json({ error: 'Invalid request body', detail: String(e) }, { status: 400 })
  }

  const { to, type, customer, revizia, oprava } = body as {
    to: string
    type: string
    customer?: { nazov: string }
    revizia?: { datum: string }
    oprava?: {
      datum_vyjazdu: string
      nahlasena_porucha?: string
      diagnostika?: string
      odstranenie?: string
      material?: string[]
    }
  }
  const zaznamUrl = body.zaznamUrl as string | undefined

  // Reminder type is called from cron / public reminder links - no user session.
  // For revizia/oprava, require user session and load their branding.
  let brand: BrandingProfile = DEFAULT_BRANDING
  if (type === 'revizia' || type === 'oprava') {
    const auth = await requireUser()
    if ('error' in auth) return auth.error
    brand = await loadBranding(auth.user.id)
  } else if (type === 'reminder') {
    // Reminders: branding may be passed in body (set by cron), or fall back to default
    if (typeof body.userId === 'string') {
      brand = await loadBranding(body.userId)
    }
  }

  console.log('[send-email] type:', type, '| to:', to, '| brand:', brand.company_name)

  let subject: string = (body.subject as string) || ''
  let html: string = ''
  const sigBlock = buildSignature(brand)

  if (type === 'revizia') {
    const datum = revizia!.datum
    const datumFormatted = new Date(datum).toLocaleDateString('sk-SK', { day: '2-digit', month: 'long', year: 'numeric' })
    if (!subject) subject = `Servisná prehliadka ${datumFormatted}${brand.company_name ? ' – ' + brand.company_name.split('|')[0].trim() : ''}`

    const protokolUrl = body.protokolPdfUrl as string | undefined
    const downloadButton = protokolUrl ? `
      <div style="margin: 28px 0; text-align: center;">
        <a href="${escapeHtml(protokolUrl)}" style="background: #1e3a5f; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block;">Stiahnuť protokol (PDF)</a>
      </div>` : ''

    html = emailWrapper(`
      <p style="font-size: 16px; color: #222;">Dobrý deň, <strong>${escapeHtml(customer!.nazov)}</strong>,</p>
      <p style="color: #444; line-height: 1.6;">ďakujeme, že využívate naše služby. Posielame Vám protokol z vykonanej servisnej prehliadky Vášho vykurovacieho zariadenia <strong>zo dňa ${escapeHtml(datumFormatted)}</strong>.</p>
      ${downloadButton}
      <p style="color: #444; line-height: 1.6;">Ak sme sa s Vami nedohodli inak, o termíne nasledujúcej servisnej prehliadky Vás budeme <strong>kontaktovať prostredníctvom e-mailu</strong>.</p>
      <p style="color: #444;">V prípade akýchkoľvek otázok nás neváhajte kontaktovať.</p>
      <p style="color: #444; margin-top: 24px;">${sigBlock}</p>
    `, brand)

  } else if (type === 'oprava') {
    const datumFormatted = oprava!.datum_vyjazdu
      ? new Date(oprava!.datum_vyjazdu).toLocaleDateString('sk-SK', { day: '2-digit', month: 'long', year: 'numeric' })
      : oprava!.datum_vyjazdu
    if (!subject) subject = `Servisný záznam – oprava ${datumFormatted}${brand.company_name ? ' – ' + brand.company_name.split('|')[0].trim() : ''}`

    const infoRows = [
      oprava!.nahlasena_porucha ? ['Nahlásená porucha', oprava!.nahlasena_porucha] : null,
      oprava!.diagnostika       ? ['Diagnostika',       oprava!.diagnostika]        : null,
      oprava!.odstranenie       ? ['Odstránenie',       oprava!.odstranenie]        : null,
    ].filter(Boolean) as [string, string][]

    const materialRows = (oprava!.material || []).filter(Boolean)

    const infoTable = (infoRows.length || materialRows.length) ? `
      <table style="width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 14px;">
        ${infoRows.map(([label, val]) => `
        <tr>
          <td style="padding: 9px 14px; background: #f9f9f9; color: #888; width: 40%; border-bottom: 1px solid #eeeeee; vertical-align: top;">${escapeHtml(label)}</td>
          <td style="padding: 9px 14px; color: #222; border-bottom: 1px solid #eeeeee; vertical-align: top;">${escapeHtml(val)}</td>
        </tr>`).join('')}
        ${materialRows.length ? `
        <tr>
          <td style="padding: 9px 14px; background: #f9f9f9; color: #888; border-bottom: 1px solid #eeeeee; vertical-align: top;">Použité diely</td>
          <td style="padding: 9px 14px; color: #222; border-bottom: 1px solid #eeeeee; vertical-align: top;">${escapeHtml(materialRows.join(', '))}</td>
        </tr>` : ''}
      </table>` : ''

    const downloadButton = zaznamUrl ? `
      <div style="margin: 28px 0; text-align: center;">
        <a href="${escapeHtml(zaznamUrl)}" style="background: #1e3a5f; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block;">Stiahnuť protokol (PDF)</a>
      </div>` : ''

    html = emailWrapper(`
      <p style="font-size: 16px; color: #222;">Dobrý deň, <strong>${escapeHtml(customer!.nazov)}</strong>,</p>
      <p style="color: #444; line-height: 1.6;">ďakujeme, že využívate naše služby. Posielame Vám protokol z vykonanej opravy Vášho zariadenia <strong>zo dňa ${escapeHtml(datumFormatted)}</strong>.</p>
      ${infoTable}
      ${downloadButton}
      <p style="color: #444; line-height: 1.6;">V prípade akýchkoľvek otázok alebo ďalšej poruchy nás neváhajte kontaktovať.</p>
      <p style="color: #444; margin-top: 24px;">${sigBlock}</p>
    `, brand)

  } else if (type === 'reminder') {
    const { reviziaId, customerName } = body as { reviziaId: string; customerName: string }
    if (!subject) subject = `Termín servisnej prehliadky${brand.company_name ? ' – ' + brand.company_name.split('|')[0].trim() : ''}`
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://servisbook-beryl.vercel.app'

    html = emailWrapper(`
      <p style="font-size: 16px; color: #222;">Dobrý deň, <strong>${escapeHtml(customerName)}</strong>,</p>
      <p style="color: #444; line-height: 1.6;">Blíži sa výročný termín vykonania servisnej prehliadky vášho kotla.</p>
      <p style="color: #444;">V prípade záujmu dohodnutia si termínu prosím kliknite na nasledovný odkaz.</p>

      <div style="margin: 30px 0; text-align: center;">
        <a href="${baseUrl}/api/reminder/yes?reviziaId=${encodeURIComponent(reviziaId)}" style="background: #16a34a; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; display: block; width: 100%; max-width: 280px; margin: 0 auto 12px; box-sizing: border-box;">Áno, mám záujem</a>
        <p style="color: #9ca3af; font-size: 13px; margin: 8px 0 0;">Po kliknutí vás budeme kontaktovať v čo najkratšom čase.</p>
      </div>

      <p style="color: #444; margin-top: 24px;">${sigBlock}</p>
    `, brand)
  }

  if (!subject || !html) {
    console.error('[send-email] missing subject or html, type was:', type)
    return NextResponse.json({ error: 'Unknown email type: ' + type }, { status: 400 })
  }

  console.log('[send-email] subject:', subject, '| html length:', html.length)

  // PDF is delivered as a download link in the email body — no attachments.
  const result = await sendMail({
    to,
    subject,
    html,
    fromName: brand.company_name || 'ServisBook',
    replyTo: brand.email || undefined,
  })

  if (!result.ok) {
    console.error('[send-email] mailer error:', result.error)
    return NextResponse.json({ error: 'send_failed', message: result.error }, { status: 500 })
  }

  console.log('[send-email] sent OK, id:', result.messageId)
  return NextResponse.json({ id: result.messageId })
}
