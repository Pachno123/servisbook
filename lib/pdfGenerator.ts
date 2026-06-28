import type { CheckItem } from './database.types'

export interface OpravaData {
  customer: {
    nazov: string
    ulica?: string
    mesto?: string
    tel?: string
    email?: string
  }
  zariadenie: string
  vyrobca?: string
  vyrobneCislo: string
  datumVyjazdu: string
  nahlasenaPorucha: string
  diagnostika: string
  odstranenie: string
  poznamka: string
  material: string[]
  ukony: string[]
  photoDataUrls?: string[]
  signatureDataUrl?: string
  technicianName?: string
  companyEmail?: string
  companyPhone?: string
}

export interface PdfData {
  customer: {
    nazov: string
    ulica?: string
    mesto?: string
    tel?: string
    email?: string
    interval?: string
  }
  umiestnenie: string
  kotol: string
  vyrobneCislo: string
  datum: string
  checks: CheckItem[]
  poznamka: string
  sposobile: boolean | null
  photoDataUrls?: string[]
  signatureDataUrl?: string
  /** Name of the technician who performed the service. Shows in the "Servisoval" row. */
  technicianName?: string
  /** Company-wide contact (shown in header next to logo). */
  companyEmail?: string
  companyPhone?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type P = any

const PW = 210
const ML = 10
const CW = PW - ML * 2  // 190mm usable width

// ─── ROBOTO FONT LOADER (Slovak diacritics) ───────────────────────────────────

let _robotoCache: { regular: string | null; bold: string | null } | null = null

async function fetchFontAsBase64(url: string): Promise<string | null> {
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || '')
    const fullUrl = url.startsWith('http') ? url : `${base}${url}`
    const r = await fetch(fullUrl)
    if (!r.ok) {
      console.error('[font] fetch failed', fullUrl, r.status)
      return null
    }
    const buf = await r.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let bin = ''
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)))
    }
    return typeof btoa !== 'undefined' ? btoa(bin) : Buffer.from(bin, 'binary').toString('base64')
  } catch (e) {
    console.error('[font] fetch error', e)
    return null
  }
}

async function ensureRoboto(pdf: P): Promise<boolean> {
  if (!_robotoCache) {
    const [regular, bold] = await Promise.all([
      fetchFontAsBase64('/fonts/Roboto-Regular.ttf'),
      fetchFontAsBase64('/fonts/Roboto-Bold.ttf'),
    ])
    _robotoCache = { regular, bold }
  }
  const { regular, bold } = _robotoCache
  if (!regular || !bold) return false
  try {
    pdf.addFileToVFS('Roboto-Regular.ttf', regular)
    pdf.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
    pdf.addFileToVFS('Roboto-Bold.ttf', bold)
    pdf.addFont('Roboto-Bold.ttf', 'Roboto', 'bold')
    return true
  } catch (e) {
    console.error('[font] register error', e)
    return false
  }
}

function fmtDate(str: string): string {
  if (!str) return '-'
  try { return new Date(str).toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch (_e) { return str }
}

// Passthrough — Roboto supports full Slovak Latin Extended.
// Kept as a thin wrapper to avoid a sweeping rename of `d(label)` callsites.
function d(s: string): string {
  return s || ''
}

// ─── SHARED DRAWING ───────────────────────────────────────────────────────────

function drawSymbol(pdf: P, x: number, y: number, h = 10) {
  pdf.setLineWidth(1.8)
  pdf.setDrawColor(20, 20, 20)
  pdf.line(x,      y + h, x + 5.5, y)
  pdf.line(x + 7,  y + h, x + 12.5, y)
  pdf.line(x + 14, y + h, x + 19.5, y)
}

function drawLogoRight(pdf: P, topY = 6) {
  const rx = PW - ML
  drawSymbol(pdf, rx - 56, topY, 10)
  pdf.setFont('Roboto', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(20, 20, 20)
  let cx = rx - 34
  for (const ch of 'REVITHERM') {
    pdf.text(ch, cx, topY + 7)
    cx += 3.5
  }
  pdf.setFont('Roboto', 'normal')
  pdf.setFontSize(6.5)
  pdf.setTextColor(140, 140, 140)
  pdf.text('Gas service', rx - 34 + (3.5 * 4), topY + 12, { align: 'center' })
}

function pageFooter(pdf: P) {
  pdf.setFont('Roboto', 'normal')
  pdf.setFontSize(6.5)
  pdf.setTextColor(180, 180, 180)
  pdf.setDrawColor(210, 210, 210)
  pdf.setLineWidth(0.15)
  pdf.line(ML, 283, PW - ML, 283)
  pdf.text('© ServisBook', PW / 2, 287, { align: 'center' })
}

function checkbox(pdf: P, x: number, y: number, checked: boolean, size = 2.6) {
  const top = y - size + 0.5
  if (checked) {
    pdf.setFillColor(18, 18, 18)
    pdf.rect(x, top, size, size, 'F')
  } else {
    pdf.setDrawColor(170, 170, 170)
    pdf.setLineWidth(0.2)
    pdf.rect(x, top, size, size, 'S')
  }
}

function sec(pdf: P, label: string, x: number, y: number, w: number): number {
  pdf.setFont('Roboto', 'bold')
  pdf.setFontSize(6.5)
  pdf.setTextColor(37, 99, 235)
  pdf.text(d(label).toUpperCase(), x, y)
  pdf.setDrawColor(37, 99, 235)
  pdf.setLineWidth(0.25)
  pdf.line(x, y + 1.5, x + w, y + 1.5)
  pdf.setTextColor(20, 20, 20)
  return y + 6
}

function kv(pdf: P, label: string, val: string, x: number, y: number, lw: number, maxW: number): number {
  pdf.setFont('Roboto', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(120, 120, 120)
  pdf.text(d(label), x, y)
  pdf.setFont('Roboto', 'bold')
  pdf.setTextColor(18, 18, 18)
  const lines = pdf.splitTextToSize(d(val || '-'), maxW - lw) as string[]
  pdf.text(lines, x + lw, y)
  return y + lines.length * 3.8 + 0.8
}

// ─── IMAGE LOADER + COMPRESSOR ────────────────────────────────────────────────

async function resizeImageForPdf(dataUrl: string, maxW: number, maxH: number): Promise<string> {
  if (typeof document === 'undefined') return dataUrl
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const ratio = Math.min(maxW / img.width, maxH / img.height, 1)
      if (ratio >= 1) { resolve(dataUrl); return }
      const w = Math.round(img.width * ratio)
      const h = Math.round(img.height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

function imgFormat(url: string): string {
  return url.includes('data:image/jpeg') ? 'JPEG' : 'PNG'
}

// Compute width/height in mm for an image dataUrl, fitting inside a max box
// while preserving its natural aspect ratio. Used to stop signatures from being
// stretched into the legacy fixed 70×10 mm rectangle.
async function fitImage(dataUrl: string, maxW: number, maxH: number): Promise<{ w: number; h: number }> {
  if (typeof document === 'undefined') return { w: maxW, h: maxH }
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const ratio = img.naturalWidth / img.naturalHeight
      let w = maxW
      let h = w / ratio
      if (h > maxH) { h = maxH; w = h * ratio }
      resolve({ w, h })
    }
    img.onerror = () => resolve({ w: maxW, h: maxH })
    img.src = dataUrl
  })
}

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    const fullUrl = url.startsWith('http') ? url : `${base}${url}`
    const res = await fetch(fullUrl)
    console.log(`[pdfGenerator] fetch ${fullUrl} status:`, res.status)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch (e) {
    console.error('[pdfGenerator] fetch error:', e)
    return null
  }
}

// Load image and resolve its natural aspect ratio (width / height) for non-stretched placement.
async function loadImageWithRatio(url: string): Promise<{ dataUrl: string; ratio: number } | null> {
  const raw = await loadImageAsDataUrl(url)
  if (!raw) return null
  if (typeof document === 'undefined') return { dataUrl: raw, ratio: 1 }
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ dataUrl: raw, ratio: img.width / img.height })
    img.onerror = () => resolve({ dataUrl: raw, ratio: 1 })
    img.src = raw
  })
}


// ─── SERVISNY PROTOKOL (page renderer) ─────────────────────────────────────────

// Brand palette
const NAVY: [number, number, number] = [30, 58, 95]      // #1e3a5f
const ORANGE: [number, number, number] = [232, 93, 4]    // #e85d04
const TEXT: [number, number, number] = [15, 23, 42]      // #0f172a
const MUTED: [number, number, number] = [100, 116, 139]  // #64748b
const SOFT: [number, number, number] = [248, 250, 252]   // #f8fafc
const BORDER: [number, number, number] = [226, 232, 240] // #e2e8f0

async function drawProtokolPage(
  pdf: P,
  data: PdfData,
  logo: { dataUrl: string; ratio: number } | null,
  peciatka: { dataUrl: string; ratio: number } | null,
): Promise<void> {
  // ── Header band ──
  // thin orange accent strip
  pdf.setFillColor(...ORANGE)
  pdf.rect(0, 0, PW, 2.2, 'F')

  // Logo top-right (correct aspect)
  let logoBottomY = 5
  if (logo) {
    const logoH = 16
    const logoW = logoH * logo.ratio
    try { pdf.addImage(logo.dataUrl, imgFormat(logo.dataUrl), PW - ML - logoW, 5, logoW, logoH) }
    catch (_e) { drawLogoRight(pdf, 6) }
    logoBottomY = 5 + logoH
  } else { drawLogoRight(pdf, 6); logoBottomY = 5 + 16 }

  // Company contact (under logo, right-aligned)
  const contactBits: string[] = []
  if (data.companyEmail) contactBits.push(data.companyEmail)
  if (data.companyPhone) contactBits.push(data.companyPhone)
  if (contactBits.length > 0) {
    pdf.setFont('Roboto', 'normal')
    pdf.setFontSize(7.5)
    pdf.setTextColor(...MUTED)
    pdf.text(contactBits.join('  ·  '), PW - ML, logoBottomY + 3, { align: 'right' })
  }

  // Title left
  pdf.setFont('Roboto', 'bold')
  pdf.setFontSize(20)
  pdf.setTextColor(...TEXT)
  pdf.text('PROTOKOL', ML, 16)

  pdf.setFont('Roboto', 'normal')
  pdf.setFontSize(7.5)
  pdf.setTextColor(...MUTED)
  pdf.text('O VYKONANÍ SERVISNEJ PREHLIADKY ZARIADENIA', ML, 21)

  // Underline (navy)
  pdf.setDrawColor(...NAVY)
  pdf.setLineWidth(0.6)
  pdf.line(ML, 25, PW - ML, 25)

  // Vyhláška subtitle
  pdf.setFont('Roboto', 'normal')
  pdf.setFontSize(6.5)
  pdf.setTextColor(...MUTED)
  const subLs = pdf.splitTextToSize(
    'Protokol o periodickej kontrole spotrebiča na plynné palivo (kotla) podľa vyhlášky MPSVaR SR 508/2009 Z.z.', CW
  ) as string[]
  pdf.text(subLs, ML, 29)
  let y = 29 + subLs.length * 3.4 + 3

  // ── Info cards (two columns with subtle bg) ──
  const cardGap = 3
  const cardW = (CW - cardGap) / 2
  const cardX1 = ML
  const cardX2 = ML + cardW + cardGap
  const cardH = 38

  const drawCard = (x: number, h: number) => {
    pdf.setFillColor(...SOFT)
    pdf.setDrawColor(...BORDER)
    pdf.setLineWidth(0.2)
    pdf.roundedRect(x, y, cardW, h, 1.5, 1.5, 'FD')
  }
  drawCard(cardX1, cardH)
  drawCard(cardX2, cardH)

  // Section labels
  pdf.setFont('Roboto', 'bold')
  pdf.setFontSize(6.5)
  pdf.setTextColor(...NAVY)
  pdf.text('ZÁKAZNÍK', cardX1 + 3, y + 4)
  pdf.text('ZARIADENIE A SERVIS', cardX2 + 3, y + 4)

  // Card content
  const innerPadX = 3
  const innerStartY = y + 8
  const lblW = 18
  const lineH = 4.4
  const adresa = [data.customer.ulica, data.customer.mesto].filter(Boolean).join(', ')

  function row(x: number, lineY: number, label: string, val: string, maxW: number) {
    pdf.setFont('Roboto', 'normal')
    pdf.setFontSize(6.8)
    pdf.setTextColor(...MUTED)
    pdf.text(label, x, lineY)
    pdf.setFont('Roboto', 'bold')
    pdf.setTextColor(...TEXT)
    const lines = pdf.splitTextToSize(val || '–', maxW - lblW) as string[]
    pdf.text(lines[0] || '–', x + lblW, lineY)
  }

  // Left card rows
  let ly = innerStartY
  row(cardX1 + innerPadX, ly, 'Meno', data.customer.nazov, cardW - innerPadX * 2); ly += lineH
  row(cardX1 + innerPadX, ly, 'Adresa', adresa, cardW - innerPadX * 2); ly += lineH
  row(cardX1 + innerPadX, ly, 'Tel.', data.customer.tel || '', cardW - innerPadX * 2); ly += lineH
  row(cardX1 + innerPadX, ly, 'E-mail', data.customer.email || '', cardW - innerPadX * 2)

  // Right card rows (6 fields)
  let ry = innerStartY
  row(cardX2 + innerPadX, ry, 'Typ kotla', data.kotol, cardW - innerPadX * 2); ry += lineH
  row(cardX2 + innerPadX, ry, 'Výrobné č.', data.vyrobneCislo, cardW - innerPadX * 2); ry += lineH
  row(cardX2 + innerPadX, ry, 'Umiestnenie', data.umiestnenie, cardW - innerPadX * 2); ry += lineH
  row(cardX2 + innerPadX, ry, 'Servisoval', data.technicianName || '—', cardW - innerPadX * 2); ry += lineH
  row(cardX2 + innerPadX, ry, 'Interval', data.customer.interval || '', cardW - innerPadX * 2); ry += lineH
  row(cardX2 + innerPadX, ry, 'Dátum', fmtDate(data.datum), cardW - innerPadX * 2)

  y += cardH + 5

  // ── Checklist ──
  // header band — navy
  pdf.setFillColor(...NAVY)
  pdf.rect(ML, y, CW, 5.5, 'F')
  pdf.setFont('Roboto', 'bold')
  pdf.setFontSize(7)
  pdf.setTextColor(255, 255, 255)
  pdf.text('VYKONANÉ ÚKONY PRI SERVISNEJ PREHLIADKE', ML + 3, y + 3.7)
  y += 5.5

  const rowH = 4.6
  data.checks.forEach((item, idx) => {
    // alternating bg
    if (idx % 2 === 0) {
      pdf.setFillColor(...SOFT)
      pdf.rect(ML, y, CW, rowH, 'F')
    }
    // checkbox
    if (item.checked) {
      pdf.setFillColor(22, 163, 74)  // green
      pdf.rect(ML + 3, y + rowH / 2 - 1.1, 2.2, 2.2, 'F')
      pdf.setDrawColor(255, 255, 255)
      pdf.setLineWidth(0.4)
      pdf.line(ML + 3.4, y + rowH / 2, ML + 3.9, y + rowH / 2 + 0.5)
      pdf.line(ML + 3.9, y + rowH / 2 + 0.5, ML + 4.9, y + rowH / 2 - 0.6)
    } else {
      pdf.setDrawColor(...BORDER)
      pdf.setLineWidth(0.25)
      pdf.rect(ML + 3, y + rowH / 2 - 1.1, 2.2, 2.2, 'S')
    }
    pdf.setFont('Roboto', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(...TEXT)
    pdf.text(item.label, ML + 7.5, y + 3.1)
    y += rowH
  })

  // bottom border on checklist
  pdf.setDrawColor(...BORDER)
  pdf.setLineWidth(0.25)
  pdf.line(ML, y, PW - ML, y)

  y += 5

  // ── JE/NIE JE statement (highlighted box) ──
  const boxH = 14
  pdf.setFillColor(...SOFT)
  pdf.setDrawColor(...NAVY)
  pdf.setLineWidth(0.4)
  pdf.roundedRect(ML, y, CW, boxH, 1.5, 1.5, 'FD')

  pdf.setFont('Roboto', 'bold')
  pdf.setFontSize(8.5)
  pdf.setTextColor(...TEXT)

  const prefix = 'ZARIADENIE  '
  const wordA = 'JE'
  const dash = '  /  '
  const wordB = 'NIE JE'
  const suffix = '  SCHOPNÉ'
  const line1 = prefix + wordA + dash + wordB + suffix
  const line2 = 'BEZPEČNEJ PREVÁDZKY PODĽA PLATNÝCH NORIEM SR'
  const x1 = (PW - pdf.getTextWidth(line1)) / 2
  const x2 = (PW - pdf.getTextWidth(line2)) / 2

  const lineY = y + 5.5
  pdf.text(prefix, x1, lineY)
  let cx = x1 + pdf.getTextWidth(prefix)
  // selected word: colored fill behind
  if (data.sposobile === true) {
    pdf.setFillColor(...NAVY)
    pdf.rect(cx - 0.5, lineY - 3.4, pdf.getTextWidth(wordA) + 1, 4.4, 'F')
    pdf.setTextColor(255, 255, 255)
  } else {
    pdf.setTextColor(...MUTED)
  }
  pdf.text(wordA, cx, lineY)
  cx += pdf.getTextWidth(wordA)
  pdf.setTextColor(...TEXT)
  pdf.text(dash, cx, lineY)
  cx += pdf.getTextWidth(dash)
  if (data.sposobile === false) {
    pdf.setFillColor(220, 38, 38)  // red
    pdf.rect(cx - 0.5, lineY - 3.4, pdf.getTextWidth(wordB) + 1, 4.4, 'F')
    pdf.setTextColor(255, 255, 255)
  } else {
    pdf.setTextColor(...MUTED)
  }
  pdf.text(wordB, cx, lineY)
  cx += pdf.getTextWidth(wordB)
  pdf.setTextColor(...TEXT)
  pdf.text(suffix, cx, lineY)

  pdf.setFont('Roboto', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(...MUTED)
  pdf.text(line2, x2, lineY + 5)

  y += boxH + 4

  // ── Poznámka (if any) ──
  if (data.poznamka) {
    pdf.setFont('Roboto', 'bold')
    pdf.setFontSize(6.5)
    pdf.setTextColor(...NAVY)
    pdf.text('POZNÁMKA', ML, y)
    y += 3
    pdf.setFont('Roboto', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(...TEXT)
    const noteLines = pdf.splitTextToSize(data.poznamka, CW) as string[]
    pdf.text(noteLines, ML, y + 1)
    y += noteLines.length * 3.4 + 3
  }

  // ── Signature section ──
  // Push to bottom area
  const sigY = Math.max(y + 2, 255)
  pdf.setDrawColor(...BORDER)
  pdf.setLineWidth(0.25)
  pdf.line(ML, sigY - 3, PW - ML, sigY - 3)

  const sigMid = ML + CW / 2 + 2

  // Left: dátum + customer signature
  pdf.setFont('Roboto', 'bold')
  pdf.setFontSize(6.5)
  pdf.setTextColor(...NAVY)
  pdf.text('DÁTUM', ML, sigY)
  pdf.setFont('Roboto', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(...TEXT)
  pdf.text(fmtDate(data.datum), ML, sigY + 5)

  pdf.setFont('Roboto', 'bold')
  pdf.setFontSize(6.5)
  pdf.setTextColor(...NAVY)
  pdf.text('PODPIS PREVÁDZKOVATEĽA', ML, sigY + 11)
  if (data.signatureDataUrl) {
    const dims = await fitImage(data.signatureDataUrl, 70, 22)
    try { pdf.addImage(data.signatureDataUrl, imgFormat(data.signatureDataUrl), ML, sigY + 13, dims.w, dims.h) } catch (_e) {}
  }
  pdf.setDrawColor(...MUTED)
  pdf.setLineWidth(0.3)
  pdf.line(ML, sigY + 24, ML + 70, sigY + 24)

  // Right: technik podpis + pečiatka
  pdf.setFont('Roboto', 'bold')
  pdf.setFontSize(6.5)
  pdf.setTextColor(...NAVY)
  pdf.text('PODPIS A PEČIATKA TECHNIKA', sigMid, sigY)

  if (peciatka) {
    const sH = 34
    const sW = sH * peciatka.ratio
    try {
      pdf.addImage(peciatka.dataUrl, imgFormat(peciatka.dataUrl), sigMid, sigY - 4, sW, sH)
    } catch (_e) {
      pdf.setFont('Roboto', 'bold')
      pdf.setFontSize(9)
      pdf.setTextColor(...TEXT)
      pdf.text(data.technicianName || '—', sigMid, sigY + 6)
    }
  } else {
    pdf.setFont('Roboto', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(...TEXT)
    pdf.text(data.technicianName || '—', sigMid, sigY + 6)
  }

  pageFooter(pdf)

  // ── Photos page (only if photos exist) ──
  if (data.photoDataUrls?.length) {
    pdf.addPage()

    // Header band
    pdf.setFillColor(...ORANGE)
    pdf.rect(0, 0, PW, 2.2, 'F')

    if (logo) {
      const logoH = 16
      const logoW = logoH * logo.ratio
      try { pdf.addImage(logo.dataUrl, imgFormat(logo.dataUrl), PW - ML - logoW, 5, logoW, logoH) }
      catch (_e) { drawLogoRight(pdf, 6) }
    }
    pdf.setFont('Roboto', 'bold')
    pdf.setFontSize(20)
    pdf.setTextColor(...TEXT)
    pdf.text('FOTODOKUMENTÁCIA', ML, 16)
    pdf.setFont('Roboto', 'normal')
    pdf.setFontSize(7.5)
    pdf.setTextColor(...MUTED)
    pdf.text(`${data.customer.nazov} · ${fmtDate(data.datum)}`, ML, 21)
    pdf.setDrawColor(...NAVY)
    pdf.setLineWidth(0.6)
    pdf.line(ML, 25, PW - ML, 25)

    let py = 32
    const iw = 58, ih = 44, gap = 5
    let col = 0
    for (const url of data.photoDataUrls) {
      if (col === 0 && py + ih > 268) { pdf.addPage(); pageFooter(pdf); py = 20 }
      try {
        pdf.addImage(url, url.includes('/png') ? 'PNG' : 'JPEG', ML + col * (iw + gap), py, iw, ih)
        pdf.setDrawColor(...BORDER)
        pdf.setLineWidth(0.2)
        pdf.rect(ML + col * (iw + gap), py, iw, ih, 'S')
      } catch (_e) {}
      col++
      if (col >= 3) { col = 0; py += ih + gap }
    }

    pageFooter(pdf)
  }
}

// ─── PROTOKOL (single combined document with all info) ────────────────────────

export async function generateProtokolPDF(data: PdfData): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  await ensureRoboto(pdf)
  pdf.setFont('Roboto', 'normal')

  const [logo, peciatka] = await Promise.all([
    loadImageWithRatio('/revitherm-logo.png'),
    loadImageWithRatio('/protokol-peciatka.png'),
  ])

  await drawProtokolPage(pdf, data, logo, peciatka)

  return pdf.output('blob') as Blob
}

// ─── SERVISNY ZAZNAM - OPRAVA ─────────────────────────────────────────────────

export async function generateOpravaPDF(data: OpravaData): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  await ensureRoboto(pdf)
  pdf.setFont('Roboto', 'normal')

  const [logo, peciatka] = await Promise.all([
    loadImageWithRatio('/revitherm-logo.png'),
    loadImageWithRatio('/protokol-peciatka.png'),
  ])

  const adresa = [data.customer.ulica, data.customer.mesto].filter(Boolean).join(', ')

  pdf.setFont('Roboto', 'normal')
  pdf.setFontSize(22)
  pdf.setTextColor(190, 190, 190)
  pdf.text('SERVISNÝ', ML, 17)
  pdf.setFont('Roboto', 'bold')
  pdf.setFontSize(22)
  pdf.setTextColor(18, 18, 18)
  pdf.text('ZÁZNAM', ML, 25)
  pdf.setFont('Roboto', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(200, 80, 20)
  pdf.text('OPRAVA ZARIADENIA', ML, 31)
  let oLogoBottomY = 5
  if (logo) {
    const logoH = 18
    const logoW = logoH * logo.ratio
    try { pdf.addImage(logo.dataUrl, imgFormat(logo.dataUrl), PW - ML - logoW, 5, logoW, logoH) }
    catch (_e) { drawLogoRight(pdf, 6) }
    oLogoBottomY = 5 + logoH
  } else { drawLogoRight(pdf, 6); oLogoBottomY = 5 + 18 }

  const oContactBits: string[] = []
  if (data.companyEmail) oContactBits.push(data.companyEmail)
  if (data.companyPhone) oContactBits.push(data.companyPhone)
  if (oContactBits.length > 0) {
    pdf.setFont('Roboto', 'normal')
    pdf.setFontSize(7.5)
    pdf.setTextColor(120, 120, 120)
    pdf.text(oContactBits.join('  ·  '), PW - ML, oLogoBottomY + 3, { align: 'right' })
  }

  pdf.setDrawColor(18, 18, 18)
  pdf.setLineWidth(0.5)
  pdf.line(ML, 34, PW - ML, 34)

  let y = 41

  const c1 = ML, c2 = ML + CW / 2 + 2
  const cw = CW / 2 - 2
  const lw = 22

  let y1 = sec(pdf, 'Zákazník', c1, y, cw)
  y1 = kv(pdf, 'Meno', data.customer.nazov, c1, y1, lw, cw)
  y1 = kv(pdf, 'Adresa', adresa, c1, y1, lw, cw)
  y1 = kv(pdf, 'Tel.', data.customer.tel || '', c1, y1, lw, cw)
  y1 = kv(pdf, 'E-mail', data.customer.email || '', c1, y1, lw, cw)

  let y2 = sec(pdf, 'Zariadenie', c2, y, cw)
  y2 = kv(pdf, 'Zariadenie', data.zariadenie, c2, y2, lw, cw)
  if (data.vyrobca) y2 = kv(pdf, 'Výrobca', data.vyrobca, c2, y2, lw, cw)
  y2 = kv(pdf, 'Sériové č.', data.vyrobneCislo, c2, y2, lw, cw)

  y = Math.max(y1, y2) + 5

  y = sec(pdf, 'Oprava', ML, y, CW)
  const lw2 = 42
  y = kv(pdf, 'Dátum výjazdu', fmtDate(data.datumVyjazdu), ML, y, lw2, CW)
  if (data.nahlasenaPorucha) y = kv(pdf, 'Nahlásená porucha', data.nahlasenaPorucha, ML, y, lw2, CW)
  if (data.diagnostika) y = kv(pdf, 'Diagnostika', data.diagnostika, ML, y, lw2, CW)
  if (data.odstranenie) y = kv(pdf, 'Odstránenie', data.odstranenie, ML, y, lw2, CW)
  y += 3

  if (data.poznamka) {
    y = sec(pdf, 'Poznámka', ML, y, CW)
    const noteLines = pdf.splitTextToSize(d(data.poznamka), CW) as string[]
    pdf.setFont('Roboto', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(40, 40, 40)
    pdf.text(noteLines, ML, y)
    y += noteLines.length * 3.8 + 3
  }

  const validMaterial = data.material.filter(Boolean)
  if (validMaterial.length > 0) {
    if (y > 240) { pdf.addPage(); pageFooter(pdf); y = 20 }
    y = sec(pdf, 'Použitý materiál', ML, y, CW)
    for (const nazov of validMaterial) {
      if (y > 268) { pdf.addPage(); pageFooter(pdf); y = 20 }
      pdf.setFont('Roboto', 'normal')
      pdf.setFontSize(7)
      pdf.setTextColor(40, 40, 40)
      pdf.text('- ' + d(nazov), ML + 2, y)
      y += 4.5
    }
    y += 2
  }

  const validUkony = data.ukony.filter(Boolean)
  if (validUkony.length > 0) {
    if (y > 240) { pdf.addPage(); pageFooter(pdf); y = 20 }
    y = sec(pdf, 'Vykonané úkony', ML, y, CW)
    for (const nazov of validUkony) {
      if (y > 268) { pdf.addPage(); pageFooter(pdf); y = 20 }
      pdf.setFont('Roboto', 'normal')
      pdf.setFontSize(7)
      pdf.setTextColor(40, 40, 40)
      pdf.text('- ' + d(nazov), ML + 2, y)
      y += 4.5
    }
    y += 2
  }

  if (y + 32 > 275) { pdf.addPage(); pageFooter(pdf); y = 20 }
  y += 4
  pdf.setDrawColor(200, 200, 200)
  pdf.setLineWidth(0.2)
  pdf.line(ML, y, PW - ML, y)
  y += 5

  const sigMid = PW / 2 + 5
  pdf.setFont('Roboto', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(100, 100, 100)
  pdf.text('Dátum výjazdu', ML, y)
  pdf.text('Podpis a razítko servisného technika', sigMid, y)
  y += 3
  pdf.setFont('Roboto', 'bold')
  pdf.setFontSize(8)
  pdf.setTextColor(18, 18, 18)
  pdf.text(fmtDate(data.datumVyjazdu), ML, y + 5)
  if (peciatka) {
    const sH = 34
    const sW = sH * peciatka.ratio
    try {
      pdf.addImage(peciatka.dataUrl, imgFormat(peciatka.dataUrl), sigMid, y - 6, sW, sH)
    } catch (e) {
      console.error('[pdfGenerator] oprava peciatka addImage error:', e)
      pdf.text(data.technicianName || '—', sigMid, y + 5)
    }
  } else {
    pdf.text(data.technicianName || '—', sigMid, y + 5)
  }
  y += 22

  if (y + 15 > 275) { pdf.addPage(); pageFooter(pdf); y = 20 }
  pdf.setFont('Roboto', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(90, 90, 90)
  pdf.text('Podpis zákazníka – prebral protokol', ML, y)
  y += 2
  if (data.signatureDataUrl) {
    const dims = await fitImage(data.signatureDataUrl, 75, 22)
    try { pdf.addImage(data.signatureDataUrl, imgFormat(data.signatureDataUrl), ML, y, dims.w, dims.h) } catch (_e) {}
  }
  pdf.setDrawColor(110, 110, 110)
  pdf.setLineWidth(0.3)
  pdf.line(ML, y + 12, ML + 75, y + 12)

  pageFooter(pdf)

  // ── Photos page (only if photos exist) ──
  if (data.photoDataUrls?.length) {
    pdf.addPage()

    pdf.setFillColor(...ORANGE)
    pdf.rect(0, 0, PW, 2.2, 'F')

    if (logo) {
      const logoH = 16
      const logoW = logoH * logo.ratio
      try { pdf.addImage(logo.dataUrl, imgFormat(logo.dataUrl), PW - ML - logoW, 5, logoW, logoH) }
      catch (_e) { drawLogoRight(pdf, 6) }
    }
    pdf.setFont('Roboto', 'bold')
    pdf.setFontSize(20)
    pdf.setTextColor(...TEXT)
    pdf.text('FOTODOKUMENTÁCIA', ML, 16)
    pdf.setFont('Roboto', 'normal')
    pdf.setFontSize(7.5)
    pdf.setTextColor(...MUTED)
    pdf.text(`${data.customer.nazov} · ${fmtDate(data.datumVyjazdu)}`, ML, 21)
    pdf.setDrawColor(...NAVY)
    pdf.setLineWidth(0.6)
    pdf.line(ML, 25, PW - ML, 25)

    let py = 32
    const iw = 58, ih = 44, gap = 5
    let col = 0
    for (const url of data.photoDataUrls) {
      if (col === 0 && py + ih > 268) { pdf.addPage(); pageFooter(pdf); py = 20 }
      try {
        pdf.addImage(url, url.includes('/png') ? 'PNG' : 'JPEG', ML + col * (iw + gap), py, iw, ih)
        pdf.setDrawColor(...BORDER)
        pdf.setLineWidth(0.2)
        pdf.rect(ML + col * (iw + gap), py, iw, ih, 'S')
      } catch (_e) {}
      col++
      if (col >= 3) { col = 0; py += ih + gap }
    }

    pageFooter(pdf)
  }

  return pdf.output('blob') as Blob
}
