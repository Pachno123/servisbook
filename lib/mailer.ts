import { Resend } from 'resend'

// Resend sending domain verified 2026-07-19: revitherm.sk (eu-west-1).
// From address defaults to noreply@revitherm.sk unless RESEND_FROM_ADDRESS
// overrides it (e.g. a per-tenant address in a future multi-tenant setup).
const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS || 'noreply@revitherm.sk'
const REPLY_TO_FALLBACK = process.env.RESEND_REPLY_TO || undefined

let _resend: Resend | null = null

function getClient(): Resend {
  if (_resend) return _resend
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY env var is required for sending email')
  _resend = new Resend(key)
  return _resend
}

export interface MailOptions {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
  /** Display name shown before the From address. e.g. "Revitherm | Servis kotlov" */
  fromName?: string
  attachments?: Array<{
    filename: string
    /** Either base64 encoded string OR a Buffer */
    content: string | Buffer
    /** If content is a base64 string, set this to 'base64' */
    encoding?: 'base64'
  }>
}

export interface MailResult {
  ok: boolean
  messageId?: string
  error?: string
}

export async function sendMail(opts: MailOptions): Promise<MailResult> {
  try {
    const resend = getClient()
    const fromName = (opts.fromName || 'ServisBook').trim().replace(/"/g, '')
    const from = `${fromName} <${FROM_ADDRESS}>`

    const attachments = opts.attachments?.map(a => ({
      filename: a.filename,
      // Resend accepts either a Buffer directly or a base64 string; nodemailer's
      // dual-form API let callers pass raw strings, so keep the same contract.
      content: a.encoding === 'base64' && typeof a.content === 'string'
        ? Buffer.from(a.content, 'base64')
        : a.content,
    }))

    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      html: opts.html,
      reply_to: opts.replyTo || REPLY_TO_FALLBACK,
      attachments,
    })

    if (error) {
      console.error('[mailer] resend error:', error)
      return { ok: false, error: error.message }
    }
    return { ok: true, messageId: data?.id }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[mailer] send failed:', msg)
    return { ok: false, error: msg }
  }
}
