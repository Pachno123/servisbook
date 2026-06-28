'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

type Bounds = { minX: number; minY: number; maxX: number; maxY: number }

interface SignaturePadProps {
  value: string | null
  onChange: (dataUrl: string | null) => void
  label?: string
}

// Internal canvas resolution. Aspect-agnostic — bounds-cropping at export time
// yields a tight image whose ratio matches what was actually drawn.
const CW = 2400
const CH = 1200
const STROKE_COLOR = '#1a1a1a'
const STROKE_WIDTH = 4

export default function SignaturePad({ value, onChange, label = 'Podpis zákazníka' }: SignaturePadProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <p style={{ margin: 0, fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {label}
          </p>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Vymazať podpis
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            width: '100%', height: 120,
            border: value ? '1.5px solid #0f172a' : '2px dashed #cbd5e1',
            borderRadius: 12,
            background: '#fff',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '8px',
          }}
          aria-label={value ? 'Upraviť podpis' : 'Pridať podpis'}
        >
          {value ? (
            <img src={value} alt="Podpis" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          ) : (
            <span style={{ fontSize: 14, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22, lineHeight: 1 }}>✍️</span>
              Kliknite a podpíšte sa
            </span>
          )}
        </button>
      </div>

      {open && (
        <SignatureOverlay
          initialDataUrl={value}
          onCancel={() => setOpen(false)}
          onDone={(dataUrl) => { onChange(dataUrl); setOpen(false) }}
        />
      )}
    </>
  )
}

// ── Fullscreen overlay ──────────────────────────────────────────────────────

function SignatureOverlay({
  initialDataUrl,
  onCancel,
  onDone,
}: {
  initialDataUrl: string | null
  onCancel: () => void
  onDone: (dataUrl: string) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef<{ x: number; y: number } | null>(null)
  const boundsRef = useRef<Bounds | null>(null)
  const [empty, setEmpty] = useState(true)
  // Track viewport orientation so we can hint the user to rotate. Once the PWA
  // manifest "orientation: any" rolls out, the overlay re-layouts naturally
  // when the phone is rotated to landscape; until then (iOS until the user
  // re-adds to home screen) we just show a hint.
  const [isPortrait, setIsPortrait] = useState(
    typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false,
  )
  useEffect(() => {
    const onResize = () => setIsPortrait(window.innerHeight > window.innerWidth)
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])

  // Initialise canvas resolution + redraw previous signature (if any).
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = CW
    canvas.height = CH
    if (initialDataUrl) {
      const img = new Image()
      img.onload = () => {
        const ctx = canvas.getContext('2d')!
        // Center previous signature in the canvas at its natural ratio.
        const scale = Math.min(CW / img.naturalWidth, CH / img.naturalHeight) * 0.9
        const dw = img.naturalWidth * scale
        const dh = img.naturalHeight * scale
        const dx = (CW - dw) / 2
        const dy = (CH - dh) / 2
        ctx.drawImage(img, dx, dy, dw, dh)
        boundsRef.current = { minX: dx, minY: dy, maxX: dx + dw, maxY: dy + dh }
        setEmpty(false)
      }
      img.src = initialDataUrl
    }
  }, [initialDataUrl])

  // Native touch handlers — passive: false so preventDefault() blocks page scroll.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const getPosFromXY = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height),
      }
    }
    const updateBounds = (p: { x: number; y: number }) => {
      const b = boundsRef.current
      if (!b) boundsRef.current = { minX: p.x, minY: p.y, maxX: p.x, maxY: p.y }
      else {
        if (p.x < b.minX) b.minX = p.x
        if (p.y < b.minY) b.minY = p.y
        if (p.x > b.maxX) b.maxX = p.x
        if (p.y > b.maxY) b.maxY = p.y
      }
    }
    const drawLine = (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const ctx = canvas.getContext('2d')!
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.strokeStyle = STROKE_COLOR
      ctx.lineWidth = STROKE_WIDTH
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke()
    }

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      const t = e.touches[0]
      lastPosRef.current = getPosFromXY(t.clientX, t.clientY)
      updateBounds(lastPosRef.current)
      isDrawingRef.current = true
    }
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      if (!isDrawingRef.current || !lastPosRef.current) return
      const t = e.touches[0]
      const pos = getPosFromXY(t.clientX, t.clientY)
      drawLine(lastPosRef.current, pos)
      updateBounds(pos)
      lastPosRef.current = pos
      setEmpty(false)
    }
    const onTouchEnd = () => { isDrawingRef.current = false; lastPosRef.current = null }

    const onMouseDown = (e: MouseEvent) => {
      lastPosRef.current = getPosFromXY(e.clientX, e.clientY)
      updateBounds(lastPosRef.current)
      isDrawingRef.current = true
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!isDrawingRef.current || !lastPosRef.current) return
      const pos = getPosFromXY(e.clientX, e.clientY)
      drawLine(lastPosRef.current, pos)
      updateBounds(pos)
      lastPosRef.current = pos
      setEmpty(false)
    }
    const onMouseUp = () => { isDrawingRef.current = false; lastPosRef.current = null }

    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd)
    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('mouseleave', onMouseUp)
    return () => {
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('mouseleave', onMouseUp)
    }
  }, [])

  const clear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    boundsRef.current = null
    setEmpty(true)
  }

  const done = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (empty || !boundsRef.current) { onCancel(); return }

    // Crop to actual drawn bounds + padding so the PDF embeds with correct aspect.
    const pad = 60
    const b = boundsRef.current
    const x = Math.max(0, Math.floor(b.minX - pad))
    const y = Math.max(0, Math.floor(b.minY - pad))
    const w = Math.min(canvas.width - x, Math.ceil(b.maxX - b.minX + 2 * pad))
    const h = Math.min(canvas.height - y, Math.ceil(b.maxY - b.minY + 2 * pad))

    const out = document.createElement('canvas')
    out.width = w
    out.height = h
    const octx = out.getContext('2d')!
    octx.drawImage(canvas, x, y, w, h, 0, 0, w, h)
    onDone(out.toDataURL('image/png'))
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#0f172a',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>Podpis zákazníka</span>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Zrušiť"
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 8, display: 'flex' }}
        >
          <X size={22} />
        </button>
      </div>

      {isPortrait && (
        <div style={{
          padding: '8px 16px', textAlign: 'center',
          color: '#fbbf24', fontSize: 13, fontWeight: 500,
          background: 'rgba(251,191,36,0.08)',
        }}>
          📱 Otočte telefón naležato pre väčšiu plochu
        </div>
      )}

      <div style={{ flex: 1, padding: 12, position: 'relative' }}>
        <canvas
          ref={canvasRef}
          style={{
            width: '100%', height: '100%', display: 'block',
            background: '#fff', borderRadius: 12, touchAction: 'none', cursor: 'crosshair',
          }}
        />
        {empty && (
          <div style={{
            position: 'absolute', inset: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none', color: '#cbd5e1', fontSize: 16,
          }}>
            Podpíšte sa prstom alebo myšou
          </div>
        )}
      </div>

      <div style={{
        padding: '12px 16px 20px',
        display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10,
      }}>
        <button
          type="button"
          onClick={clear}
          style={{
            background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 12,
            padding: '14px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Vymazať
        </button>
        <button
          type="button"
          onClick={done}
          disabled={empty}
          style={{
            background: empty ? '#475569' : '#2563eb', color: '#fff', border: 'none', borderRadius: 12,
            padding: '14px', fontSize: 15, fontWeight: 600,
            cursor: empty ? 'not-allowed' : 'pointer', opacity: empty ? 0.6 : 1,
          }}
        >
          Hotovo
        </button>
      </div>
    </div>
  )
}
