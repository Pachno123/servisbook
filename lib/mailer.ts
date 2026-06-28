import nodemailer from 'nodemailer'

let _transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (_transporter) return _transporter
  const user = process.env.GMAIL_USER
  // Google displays the app password with spaces but the SMTP accepts the joined form.
  // Strip whitespace so users don't have to worry about copy/paste artifacts.
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '')
  if (!user || !pass) {
    throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD env vars are required for sending email')
  }
  _transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })
  return _transporter
}

export interface MailOptions {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
  /** Display name shown before the actual <gmail-address>. e.g. "Revitherm | Gas service" */
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
    const transporter = getTransporter()
    const gmailUser = process.env.GMAIL_USER!
    const fromName = (opts.fromName || 'ServisBook').trim()
    const from = `"${fromName.replace(/"/g, '')}" <${gmailUser}>`

    const info = await transporter.sendMail({
      from,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      html: opts.html,
      replyTo: opts.replyTo,
      attachments: opts.attachments?.map(a => ({
        filename: a.filename,
        content: a.content,
        ...(a.encoding ? { encoding: a.encoding } : {}),
      })),
    })
    return { ok: true, messageId: info.messageId }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[mailer] send failed:', msg)
    return { ok: false, error: msg }
  }
}
