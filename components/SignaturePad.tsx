'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

type Bounds = { minX: number; minY: number; maxX: number; maxY: number }

interface SignaturePadProps {
  value: string | null
  onChange: (dataUrl: string | null) => void
  label?: string
}

const STROKE_COLOR = '#1a1a1a'

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
          onCancel={() => setOpen(false)}
          onDone={(dataUrl) => { onChange(dataUrl); setOpen(false) }}
        />
      )}
    </>
  )
}

// ── Fullscreen overlay ──────────────────────────────────────────────────────
//
// The canvas backing store is sized to its rendered CSS box × devicePixelRatio.
// That keeps the drawing aspect ratio 1:1 with the screen — a stroke drawn as
// a square on-glass stays a square in the exported PNG. Previously we used a
// fixed 2400×1200 backing store, which stretched every vertical stroke into
// a much shorter one on a portrait phone.

function SignatureOverlay({
  onCancel,
  onDone,
}: {
  onCancel: () => void
  onDone: (dataUrl: string) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef<{ x: number; y: number } | null>(null)
  const boundsRef = useRef<Bounds | null>(null)
  const dprRef = useRef(1)
  const [empty, setEmpty] = useState(true)
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

  // Size the canvas backing store to its rendered box. Runs once — on rotate
  // the user has to redraw, but the ratio is always 1:1 with the screen.
  useEffect(() => {
    const canvas = canvasRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    dprRef.current = dpr
    const rect = wrapper.getBoundingClientRect()
    canvas.width = Math.round(rect.width * dpr)
    canvas.height = Math.round(rect.height * dpr)
  }, [isPortrait])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const strokeWidth = 3 * dprRef.current

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
      ctx.lineWidth = strokeWidth
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
  }, [isPortrait])

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

    // Crop to actual drawn bounds + small padding. Padding scales with stroke
    // so a small signature isn't drowned in whitespace when embedded in PDF.
    const pad = 12 * dprRef.current
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

  const btnClear = (
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
  )
  const btnDone = (
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
  )

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

      {/* Body: canvas + action buttons. In portrait the buttons sit below the
          canvas; in landscape they move to a narrow right column so the pad
          keeps the full screen height and the buttons stay reachable without
          overlapping the drawing surface. */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: isPortrait ? 'column' : 'row',
        minHeight: 0,
      }}>
        <div ref={wrapperRef} style={{ flex: 1, padding: 12, position: 'relative', minHeight: 0, minWidth: 0 }}>
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

        {isPortrait ? (
          <div style={{
            padding: '12px 16px 20px',
            display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10,
          }}>
            {btnClear}
            {btnDone}
          </div>
        ) : (
          <div style={{
            padding: '12px 16px 12px 0',
            display: 'flex', flexDirection: 'column', gap: 10,
            width: 160, flexShrink: 0, justifyContent: 'flex-end',
          }}>
            {btnClear}
            {btnDone}
          </div>
        )}
      </div>
    </div>
  )
}
