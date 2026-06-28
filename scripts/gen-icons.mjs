/**
 * Generates PWA icons (192x192 and 512x512) as PNG files.
 * Uses only Node.js built-ins (zlib). No external dependencies.
 * Design: navy circle (#1e3a5f) with white "S" lettermark.
 * Run: node scripts/gen-icons.mjs
 */

import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

// ── PNG encoder ────────────────────────────────────────────────────────────────

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0)
  }
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const d = Buffer.isBuffer(data) ? data : Buffer.from(data)
  const len = Buffer.alloc(4); len.writeUInt32BE(d.length)
  const crcBuf = Buffer.concat([t, d])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(crcBuf))
  return Buffer.concat([len, t, d, crc])
}

function encodePNG(pixels, width, height) {
  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 2   // color type: RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  // Raw scanlines (filter byte 0 before each row)
  const raw = Buffer.alloc(height * (1 + width * 3))
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0 // filter None
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4
      const dst = y * (1 + width * 3) + 1 + x * 3
      raw[dst]     = pixels[src]
      raw[dst + 1] = pixels[src + 1]
      raw[dst + 2] = pixels[src + 2]
    }
  }

  const idat = deflateSync(raw, { level: 9 })

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Drawing helpers ────────────────────────────────────────────────────────────

function setPixel(pixels, width, x, y, r, g, b) {
  if (x < 0 || y < 0 || x >= width || y >= width) return
  const i = (y * width + x) * 4
  pixels[i] = r; pixels[i + 1] = g; pixels[i + 2] = b; pixels[i + 3] = 255
}

function fillCircle(pixels, size, cx, cy, radius, r, g, b) {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy
      if (dx * dx + dy * dy <= radius * radius) {
        setPixel(pixels, size, x, y, r, g, b)
      }
    }
  }
}

function fillRect(pixels, size, x1, y1, w, h, r, g, b) {
  for (let y = y1; y < y1 + h; y++) {
    for (let x = x1; x < x1 + w; x++) {
      setPixel(pixels, size, x, y, r, g, b)
    }
  }
}

// Rounded rect helper
function fillRoundRect(pixels, size, x1, y1, w, h, rad, r, g, b) {
  for (let y = y1; y < y1 + h; y++) {
    for (let x = x1; x < x1 + w; x++) {
      // Check corner rounding
      let inCorner = false
      const cx1 = x1 + rad, cy1 = y1 + rad
      const cx2 = x1 + w - 1 - rad, cy2 = y1 + h - 1 - rad
      if (x < cx1 && y < cy1) inCorner = (x - cx1) ** 2 + (y - cy1) ** 2 > rad * rad
      else if (x > cx2 && y < cy1) inCorner = (x - cx2) ** 2 + (y - cy1) ** 2 > rad * rad
      else if (x < cx1 && y > cy2) inCorner = (x - cx1) ** 2 + (y - cy2) ** 2 > rad * rad
      else if (x > cx2 && y > cy2) inCorner = (x - cx2) ** 2 + (y - cy2) ** 2 > rad * rad
      if (!inCorner) setPixel(pixels, size, x, y, r, g, b)
    }
  }
}

// Draw letter "S" scaled to fit in a box at (ox, oy) with size `s`
function drawS(pixels, imgSize, ox, oy, s, r, g, b) {
  const t = Math.max(1, Math.round(s * 0.13)) // stroke thickness

  // Top bar
  fillRect(pixels, imgSize, ox + t, oy, s - 2 * t, t, r, g, b)
  // Top-left vertical
  fillRect(pixels, imgSize, ox, oy, t, Math.floor(s / 2) - t, r, g, b)
  // Middle bar
  fillRect(pixels, imgSize, ox + t, Math.floor(s / 2) - Math.floor(t / 2) + oy, s - 2 * t, t, r, g, b)
  // Bottom-right vertical
  fillRect(pixels, imgSize, ox + s - t, Math.floor(s / 2) + Math.floor(t / 2) + oy, t, Math.ceil(s / 2) - t, r, g, b)
  // Bottom bar
  fillRect(pixels, imgSize, ox + t, oy + s - t, s - 2 * t, t, r, g, b)
  // Top-right corner cap
  fillRect(pixels, imgSize, ox + s - t, oy, t, t, r, g, b)
  // Bottom-left corner cap
  fillRect(pixels, imgSize, ox, oy + s - t, t, t, r, g, b)
}

// ── Generate icon ──────────────────────────────────────────────────────────────

function generateIcon(size) {
  const pixels = new Uint8Array(size * size * 4) // RGBA, init transparent → white bg

  // White background
  pixels.fill(255)
  for (let i = 3; i < pixels.length; i += 4) pixels[i] = 255

  const margin = Math.round(size * 0.08)
  const radius = size / 2 - margin

  // Shadow / outer glow (dark ring)
  fillCircle(pixels, size, size / 2, size / 2, radius + Math.round(size * 0.015), 0x0f, 0x22, 0x44)

  // Navy circle: #1e3a5f
  fillCircle(pixels, size, size / 2, size / 2, radius, 0x1e, 0x3a, 0x5f)

  // Inner lighter ring
  fillCircle(pixels, size, size / 2, size / 2, radius - Math.round(size * 0.025), 0x22, 0x44, 0x6e)

  // Draw "S" — white, centered
  const sSize = Math.round(radius * 1.0)
  const ox = Math.round(size / 2 - sSize / 2)
  const oy = Math.round(size / 2 - sSize / 2)
  drawS(pixels, size, ox, oy, sSize, 255, 255, 255)

  return encodePNG(pixels, size, size)
}

// ── Write files ────────────────────────────────────────────────────────────────

writeFileSync('public/icons/icon-192.png', generateIcon(192))
console.log('✓ public/icons/icon-192.png')

writeFileSync('public/icons/icon-512.png', generateIcon(512))
console.log('✓ public/icons/icon-512.png')

console.log('Done!')
