// Runs the customer import directly against Supabase (no SQL pasting needed).
// 1. Wipes all customers in Jozef's company
// 2. Inserts the 503 from CSV in batches
//
// Usage:  node scripts/run-import.mjs <csv>

import { readFileSync } from 'fs'

const CSV = process.argv[2] || '/Users/patrickpachnik/Downloads/zakaznici_zaznam_sk.csv'
const TARGET_EMAIL = 'info@revitherm.sk'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter(l => l && !l.startsWith('#') && l.includes('='))
  .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)] }))

const SUPA_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SUPA_KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPA_URL || !SUPA_KEY) { console.error('Missing Supabase env'); process.exit(1) }

const headers = {
  'apikey': SUPA_KEY,
  'Authorization': `Bearer ${SUPA_KEY}`,
  'Content-Type': 'application/json',
}

function parseCSV(text) {
  const rows = []; let row = []; let cell = ''; let inQ = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQ) {
      if (c === '"' && text[i+1] === '"') { cell += '"'; i++ }
      else if (c === '"') inQ = false
      else cell += c
    } else {
      if (c === '"') inQ = true
      else if (c === ',') { row.push(cell); cell = '' }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = '' }
      else if (c === '\r') {}
      else cell += c
    }
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row) }
  return rows
}

function splitAdresa(a) {
  if (!a) return { ulica: '', mesto: '' }
  const parts = a.split(',').map(s => s.trim()).filter(Boolean)
  if (parts.length === 0) return { ulica: '', mesto: '' }
  if (parts.length === 1) return { ulica: parts[0], mesto: '' }
  const ulica = parts[0]
  const cityParts = parts.slice(1).filter(p => !/^\d{3}\s?\d{2}$/.test(p))
  return { ulica, mesto: cityParts.join(', ') }
}

async function main() {
  // 1. Resolve user_id + company_id
  console.log(`Looking up user ${TARGET_EMAIL}…`)
  const userRes = await fetch(`${SUPA_URL}/auth/v1/admin/users?email=${encodeURIComponent(TARGET_EMAIL)}`, { headers })
  const users = (await userRes.json()).users || []
  const user = users.find(u => u.email === TARGET_EMAIL)
  if (!user) { console.error(`User ${TARGET_EMAIL} not found`); process.exit(1) }
  const userId = user.id
  console.log(`  user_id: ${userId}`)

  const profRes = await fetch(`${SUPA_URL}/rest/v1/profiles?user_id=eq.${userId}&select=company_id`, { headers })
  const profs = await profRes.json()
  const companyId = profs[0]?.company_id
  if (!companyId) { console.error('No company_id'); process.exit(1) }
  console.log(`  company_id: ${companyId}`)

  // 2. Wipe existing customers for this company
  console.log(`\nDeleting all customers for company ${companyId}…`)
  const delRes = await fetch(`${SUPA_URL}/rest/v1/customers?company_id=eq.${companyId}`, {
    method: 'DELETE',
    headers: { ...headers, 'Prefer': 'return=representation' },
  })
  const delData = await delRes.json()
  console.log(`  deleted ${Array.isArray(delData) ? delData.length : '?'} rows`)

  // 3. Parse CSV
  console.log(`\nParsing CSV ${CSV}…`)
  const raw = readFileSync(CSV, 'utf8').replace(/^﻿/, '')
  const rows = parseCSV(raw).filter(r => r.length > 1 && r.some(c => c.trim()))
  rows.shift()  // header
  console.log(`  ${rows.length} rows`)

  const inserts = []
  for (const r of rows) {
    const [meno, email, tel, adresa,
      z1_znacka, z1_model, z1_sn, _z1_typ, z1_servis, _z1_inst,
      z2_znacka, z2_model, z2_sn] = r
    const nazov = (meno || '').trim()
    if (!nazov) continue
    const { ulica, mesto } = splitAdresa(adresa || '')
    const kotol = [z1_znacka, z1_model].filter(Boolean).join(' ').trim()
    const vyrobne_cislo = (z1_sn || '').trim()
    const datum_m = (z1_servis || '').trim() || null
    let poznamka = ''
    if ((z2_znacka || z2_model || z2_sn || '').trim()) {
      const z2 = [z2_znacka, z2_model].filter(Boolean).join(' ').trim()
      poznamka = `2. zariadenie: ${z2}${z2_sn ? ` (SN: ${z2_sn})` : ''}`
    }
    inserts.push({
      user_id: userId,
      company_id: companyId,
      nazov,
      ulica,
      mesto,
      tel: (tel || '').trim(),
      email: (email || '').trim(),
      kotol,
      interval: '',
      datum_m,
      poznamka,
      sluzba: 'Servis',
      vyrobne_cislo,
    })
  }

  // 4. Batch insert (100 at a time)
  console.log(`\nInserting ${inserts.length} customers in batches of 100…`)
  let done = 0
  for (let i = 0; i < inserts.length; i += 100) {
    const batch = inserts.slice(i, i + 100)
    const insRes = await fetch(`${SUPA_URL}/rest/v1/customers`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify(batch),
    })
    if (!insRes.ok) {
      const err = await insRes.text()
      console.error(`  batch ${i/100+1} FAILED:`, err)
      process.exit(1)
    }
    done += batch.length
    console.log(`  batch ${i/100+1}: ${done}/${inserts.length}`)
  }

  console.log(`\n✓ Done. Imported ${done} customers for ${TARGET_EMAIL}.`)
}

main().catch(e => { console.error(e); process.exit(1) })
