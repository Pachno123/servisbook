// Seeds the komponenty table with Jozef's parts list.
// Run: node scripts/seed-komponenty.mjs

import { readFileSync } from 'fs'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter(l => l && !l.startsWith('#') && l.includes('='))
  .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)] }))

const SUPA_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SUPA_KEY = env.SUPABASE_SERVICE_ROLE_KEY

const headers = {
  'apikey': SUPA_KEY,
  'Authorization': `Bearer ${SUPA_KEY}`,
  'Content-Type': 'application/json',
}

const PARTS = [
  '3-cestný ventil',
  'automatika',
  'automatika zapal. DKG',
  'Automatika zapaľovania',
  'BAXI Kontrolná elektróda B&P 710424200',
  'BAXI Tesnenie príruba/výmenník JJJ005411000',
  'čerpadlo solárneho okruhu',
  'čerpadlo VV',
  'Chemické čistenie doskového výmenníka',
  'Chemické čistenie výmenníka',
  'Cikula',
  'diagnostika poruchy',
  'Dopĺňací ventil',
  'doplnené prečerpávač kondenzu',
  'dopojenie plynu - nerez 3/4',
  'dopustacia smyčka - 7825726',
  'doskový výmenník',
  'doskový výmenník TUV',
  'dovod kondenzátu - hadica',
  'elektrická vložka dohrevu',
  'elektróda',
  'elektródy set',
  'Eurotis hadica 3/4" 0,5m',
  'expanzná nádoba',
  'expanzná nádoba TUV',
  'hadica na dopúšťanie vody',
  'havarijný snímač',
  'Honeywell T3R',
  'horák',
  'Horák zariadenia',
  'horáková izolácia - zadná',
  'Horáková trubica',
  'horákové tesnenie',
  'Horčíková anóda zásobníka',
  'ionizačná elektróda',
  'Ionizačná elektróda',
  'ionizačná elektróda gb112',
  'izolácia',
  'Izolácia horáka',
  'Izolácia spaľovacej komory',
  'kábel čerpadla',
  'Kaskadový modul Logamatic 4000',
  'KIM gb122-24',
  'Kombinovaná elektróda',
  'Komín v nevyhovujúcom stave, treba vymeniť!',
  'komínové ukončenie dn80 UV',
  'Kontrola odťahu spalín',
  'manometer tlaku',
  'Manostat',
  'Motor 3CV',
  'Nasávacia trubica',
  'NTC snímač',
  'nutná výmena systému odvodu spalín!',
  'O-krúžok',
  'obehové čerpadlo',
  'obehové čerpadlo 2.vykur.okruhu',
  'Obmedzovač vzduchu',
  'odporúčam výmenu odvzdušňovacej banky',
  'odporúčaná oprava komínu',
  'odvzdušňovací ventil',
  'odvzdušňovacia banka',
  'oprava priechodnosti TUV',
  'oprava riadiacej dosky',
  'oprava venturiho trubice',
  'Plošný spoj',
  'Plynová armatúra',
  'plynová armatúra G334',
  'plynová armatúra GB162-100',
  'plynová hadica - nerez',
  'poistný ventil opravený',
  'poistný ventil TÚV',
  'poistný ventil UK 3bar',
  'poistný ventil UK GB142',
  'poistný ventil VV',
  'práčková hadica na sifón',
  'Pridanie inhibítoru',
  'pripojovacia rúra výmenníka',
  'pružinová vložka výmenníka',
  'riadiaca doska',
  'riadiaca doska - elektronika',
  'riadiaca doska - reklamácia',
  'riadiaca doska gb072',
  'riadiaca doska gb122',
  'Riadiaca elektronika',
  'rozbočovač spalín výmenníka',
  'Rúrka odvodu kondenzátu',
  'rúry na dopojenie zásobníka',
  'rychlouzáver 4x',
  'S1056000',
  'Sada elektród s tesnením',
  'Sada pre údržbu Vitodens 200',
  'Servisná sada',
  'set elektród',
  'set elektród 8-729-012-530-0',
  'set elektród gb072',
  'Set elektród GB192',
  'sifón',
  'sifón kondenzátu',
  'snímač prietoku',
  'snímač teploty spalín',
  'snímač tlaku',
  'Šnúra tesniaca',
  'spalinový snímač',
  'šrobenie tuv',
  'štartovací horák',
  'štartovacie elektródy',
  'termočlánok',
  'termostat',
  'termostat Honeywell T3',
  'termostat T3R',
  'Tesnenie zberač kondenzátu 100kW',
  'tesnenie horák',
  'tesnenie elektród',
  'tesnenia',
  'tesnenie - tangit',
  'tesnenie 1/2"',
  'tesnenie 3/4 voda',
  'Tesnenie elektród',
  'tesnenie elektroda',
  'tesnenie elektrody',
  'tesnenie gas',
  'Tesnenie horáka',
  'tesnenie horáku',
  'tesnenie horáku - malé',
  'tesnenie komín',
  'tesnenie komory',
  'tesnenie servisného otvoru',
  'tesnenie vane výmenníka',
  'tesnenie výmenník',
  'tesnenie výmenníka',
  'Tesniaca sada B3M/L',
  'Tesniaca šnúra',
  'tlakovanie soláru L20',
  'tlakový snímač gb142',
  'tlakový snímač GB162',
  'vadná expanzná nádoba',
  'vadný poistný ventil TUV - treba výmena',
  'vadný poistný ventil UK',
  'vadný poistný ventil UK - treba vymeniť',
  'ventil dopúšťania',
  'ventil expanznej nádoby',
  'ventil na dopúšťanie vody + hadica',
  'ventilátor',
  'ventilátor repas - v priebehu roka',
  'VIESSMANN - Šamotová izolácia spaľ. komory 7830016',
  'Vložka 3CV',
  'vložka gsu',
  'vsuvka 3/4 × 1/2',
  'Výmenník',
  'výmenníkové tesnenie gb022',
  'vypúšťací ventil Herz 1/2"',
  'vypúšťací ventil na zásobníku',
  'Základný modul Logamatic 4000',
  'zanesenie spaľovacej komory - vyriešené',
  'zanesený komín',
  'Zapaľovací horák Logano',
  'Zapaľovacia elektróda',
  'Zapaľovacia elektronika',
  'zásobníkový snímač',
  'žhaviaca elektróda',
]

// Dedupe (case-insensitive)
const seen = new Set()
const unique = []
for (const p of PARTS) {
  const k = p.toLowerCase()
  if (!seen.has(k)) { seen.add(k); unique.push(p) }
}
console.log(`Parsed ${PARTS.length} parts (${unique.length} unique after dedupe)`)

// Wipe existing
console.log('Deleting existing komponenty…')
const delRes = await fetch(`${SUPA_URL}/rest/v1/komponenty?id=gte.0`, {
  method: 'DELETE',
  headers: { ...headers, 'Prefer': 'return=minimal' },
})
console.log(`  status: ${delRes.status}`)

// Insert
console.log(`Inserting ${unique.length}…`)
const ins = await fetch(`${SUPA_URL}/rest/v1/komponenty`, {
  method: 'POST',
  headers: { ...headers, 'Prefer': 'return=minimal' },
  body: JSON.stringify(unique.map(nazov => ({ nazov }))),
})
if (!ins.ok) {
  console.error('insert failed:', await ins.text())
  process.exit(1)
}
console.log(`✓ Inserted ${unique.length} komponenty.`)
