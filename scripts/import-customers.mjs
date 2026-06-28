// Reads CSV and emits SQL INSERTs for Supabase.
// Run:  node scripts/import-customers.mjs /path/to/zakaznici.csv > import.sql

import { readFileSync } from 'fs'

const file = process.argv[2]
if (!file) { console.error('Usage: node import-customers.mjs <csv>'); process.exit(1) }

// CSV parser — handles quoted fields with commas inside
function parseCSV(text) {
  const rows = []
  let row = []
  let cell = ''
  let inQuote = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuote) {
      if (c === '"' && text[i+1] === '"') { cell += '"'; i++ }
      else if (c === '"') inQuote = false
      else cell += c
    } else {
      if (c === '"') inQuote = true
      else if (c === ',') { row.push(cell); cell = '' }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = '' }
      else if (c === '\r') {/* skip */}
      else cell += c
    }
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row) }
  return rows
}

function sql(v) {
  if (v == null) return 'NULL'
  return "'" + String(v).replace(/'/g, "''") + "'"
}

// Parse "Ulica 12, Mesto, 12345" → { ulica, mesto }
function splitAdresa(a) {
  if (!a) return { ulica: '', mesto: '' }
  const parts = a.split(',').map(s => s.trim()).filter(Boolean)
  if (parts.length === 0) return { ulica: '', mesto: '' }
  if (parts.length === 1) return { ulica: parts[0], mesto: '' }
  const ulica = parts[0]
  // City is everything between street and PSČ; PSČ matches digits
  const cityParts = parts.slice(1).filter(p => !/^\d{3}\s?\d{2}$/.test(p))
  const mesto = cityParts.join(', ')
  return { ulica, mesto }
}

const raw = readFileSync(file, 'utf8').replace(/^﻿/, '')
const rows = parseCSV(raw).filter(r => r.length > 1 && r.some(c => c.trim()))
const header = rows.shift()

console.log(`-- Import ${rows.length} customers from ${file}`)
console.log(`-- Run in Supabase SQL editor while logged in as the technician owner.`)
console.log(`-- Resolves user_id + company_id from the auth.users record for info@revitherm.sk`)
console.log()
console.log(`DO $$`)
console.log(`DECLARE`)
console.log(`  v_user_id   UUID;`)
console.log(`  v_company_id UUID;`)
console.log(`BEGIN`)
console.log(`  SELECT id INTO v_user_id FROM auth.users WHERE email = 'info@revitherm.sk' LIMIT 1;`)
console.log(`  IF v_user_id IS NULL THEN RAISE EXCEPTION 'User info@revitherm.sk not found'; END IF;`)
console.log(`  SELECT company_id INTO v_company_id FROM profiles WHERE user_id = v_user_id LIMIT 1;`)
console.log(`  IF v_company_id IS NULL THEN RAISE EXCEPTION 'Company not found for user'; END IF;`)
console.log()

let inserted = 0
let skipped = 0
for (const r of rows) {
  const [meno, email, tel, adresa,
    z1_znacka, z1_model, z1_sn, z1_typ, z1_servis, _z1_inst,
    z2_znacka, z2_model, z2_sn, _z2_typ, _z2_servis] = r

  const nazov = (meno || '').trim()
  if (!nazov) { skipped++; continue }

  const { ulica, mesto } = splitAdresa(adresa || '')
  const kotol = [z1_znacka, z1_model].filter(Boolean).join(' ').trim()
  const vyrobne_cislo = (z1_sn || '').trim()
  const datum_m = (z1_servis || '').trim() || null  // YYYY-MM-DD

  // Second device → poznámka
  let poznamka = ''
  if ((z2_znacka || z2_model || z2_sn || '').trim()) {
    const z2 = [z2_znacka, z2_model].filter(Boolean).join(' ').trim()
    poznamka = `2. zariadenie: ${z2}${z2_sn ? ` (SN: ${z2_sn})` : ''}`
  }

  const values = [
    'v_user_id',
    'v_company_id',
    sql(nazov),
    sql(ulica),
    sql(mesto),
    sql((tel || '').trim()),
    sql((email || '').trim()),
    sql(kotol),
    sql(''),                  // interval — empty, user can set later
    datum_m ? sql(datum_m) : 'NULL',
    sql(poznamka),
    sql('Servis'),            // default sluzba
    sql(vyrobne_cislo),
  ].join(', ')

  console.log(`  INSERT INTO customers (user_id, company_id, nazov, ulica, mesto, tel, email, kotol, interval, datum_m, poznamka, sluzba, vyrobne_cislo) VALUES (${values});`)
  inserted++
}

console.log()
console.log(`  RAISE NOTICE 'Imported % customers', ${inserted};`)
console.log(`END $$;`)

console.error(`Generated ${inserted} INSERTs (skipped ${skipped} empty rows).`)
