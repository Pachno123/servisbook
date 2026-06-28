import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { Revizia } from '@/lib/database.types'

type ReviziaWithCustomer = Revizia & {
  customers: { email?: string; nazov?: string } | null
}

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Pull ALL not-yet-reminded revízie with a linked customer.
  // We need to consider every revízia per customer (not just old ones) so we can
  // pick the LATEST one per customer and only send if THAT one is 11+ months old.
  const { data: revizie, error } = await supabaseAdmin
    .from('revizie')
    .select('*, customers(*)')
    .eq('reminder_sent', false)
    .is('reminder_response', null)
    .not('customer_id', 'is', null)

  if (error) {
    console.error('[cron/reminders] query error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Group by customer_id and keep ONLY the most recent revízia per customer.
  // This prevents an old (pre-existing) revízia row from triggering a reminder
  // when a newer revízia for the same customer already exists.
  const latestByCustomer = new Map<number, ReviziaWithCustomer>()
  for (const r of ((revizie || []) as ReviziaWithCustomer[])) {
    if (r.customer_id == null || !r.datum) continue
    const existing = latestByCustomer.get(r.customer_id)
    if (!existing || r.datum > existing.datum) {
      latestByCustomer.set(r.customer_id, r)
    }
  }

  const elevenMonthsAgo = new Date()
  elevenMonthsAgo.setMonth(elevenMonthsAgo.getMonth() - 11)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://servisbook-beryl.vercel.app'

  let sent = 0
  let skippedRecent = 0
  let skippedNoEmail = 0
  let updateFailed = 0

  for (const revizia of Array.from(latestByCustomer.values())) {
    const customer = revizia.customers
    const reviziaDate = new Date(revizia.datum)

    // Defensive: skip if latest revízia is newer than 11 months
    if (reviziaDate > elevenMonthsAgo) {
      skippedRecent++
      continue
    }

    if (!customer?.email) {
      skippedNoEmail++
      continue
    }

    // Mark ALL of this customer's pending revízie as reminder_sent=true FIRST.
    // This ensures we never re-send tomorrow even if email sending fails or any
    // stale older revízia row exists for the same customer.
    const { error: updErr } = await supabaseAdmin
      .from('revizie')
      .update({ reminder_sent: true, reminder_sent_at: new Date().toISOString() })
      .eq('customer_id', revizia.customer_id!)
      .eq('reminder_sent', false)

    if (updErr) {
      console.error('[cron/reminders] update failed for customer', revizia.customer_id, updErr)
      updateFailed++
      continue
    }

    try {
      const res = await fetch(`${baseUrl}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: customer.email,
          type: 'reminder',
          reviziaId: revizia.id,
          customerName: customer.nazov,
          // Pass user_id of the technician who performed the original revízia
          // so send-email loads their company's branding.
          userId: revizia.user_id,
        }),
      })
      if (!res.ok) {
        console.error('[cron/reminders] send-email failed', res.status, await res.text())
      } else {
        sent++
      }
    } catch (e) {
      console.error('[cron/reminders] fetch error', e)
    }
  }

  return NextResponse.json({
    sent,
    candidates: latestByCustomer.size,
    skippedRecent,
    skippedNoEmail,
    updateFailed,
  })
}
