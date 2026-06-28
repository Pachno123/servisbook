'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser'
import { DecodeHintType, BarcodeFormat } from '@zxing/library'

interface BarcodeScannerProps {
  onResult: (text: string) => void
  onClose: () => void
}

const HINTS = (() => {
  const h = new Map()
  h.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.QR_CODE,
    BarcodeFormat.DATA_MATRIX,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.CODE_93,
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.ITF,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
  ])
  h.set(DecodeHintType.TRY_HARDER, true)
  return h
})()

export default function BarcodeScanner({ onResult, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string>('')
  const [status, setStatus] = useState<string>('Spúšťam kameru…')
  const [torchOn, setTorchOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [decoding, setDecoding] = useState(false)

  useEffect(() => {
    let cancelled = false
    const reader = new BrowserMultiFormatReader(HINTS, { delayBetweenScanAttempts: 80 })

    ;(async () => {
      try {
        // High-res back camera with continuous autofocus
        const videoConstraints = {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          advanced: [{ focusMode: 'continuous' }],
        } as unknown as MediaTrackConstraints
        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream

        // Check torch support
        const track = stream.getVideoTracks()[0]
        const caps = track.getCapabilities ? track.getCapabilities() : {}
        if (caps && (caps as { torch?: boolean }).torch) setTorchSupported(true)

        const video = videoRef.current!
        video.srcObject = stream
        await video.play().catch(() => {})

        setStatus('Namier na čiarový kód…')

        const controls = await reader.decodeFromVideoElement(video, (result, _err, ctrl) => {
          if (result) {
            const text = result.getText().trim()
            if (text) {
              ctrl.stop()
              onResult(text)
            }
          }
        })
        controlsRef.current = controls
      } catch (e) {
        if (cancelled) return
        const msg = (e as Error)?.message || 'Nepodarilo sa otvoriť kameru.'
        if (/permission|denied|notallowed/i.test(msg)) {
          setError('Povol prístup ku kamere v nastaveniach prehliadača.')
        } else {
          setError(msg)
        }
      }
    })()

    return () => {
      cancelled = true
      try { controlsRef.current?.stop() } catch (_e) {}
      try { streamRef.current?.getTracks().forEach(t => t.stop()) } catch (_e) {}
    }
  }, [onResult])

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] } as unknown as MediaTrackConstraints)
      setTorchOn(!torchOn)
    } catch (e) {
      console.warn('torch toggle failed', e)
    }
  }

  const onPhotoPicked = async (file: File | undefined) => {
    if (!file) return
    setDecoding(true)
    setError('')
    setStatus('Čítam fotku…')
    try {
      const url = URL.createObjectURL(file)
      const reader = new BrowserMultiFormatReader(HINTS)
      try {
        const result = await reader.decodeFromImageUrl(url)
        URL.revokeObjectURL(url)
        const text = result.getText().trim()
        if (text) {
          onResult(text)
          return
        }
        setError('Kód sa nepodarilo prečítať z fotky. Skús bližšie / ostrejšie.')
      } catch (_decErr) {
        URL.revokeObjectURL(url)
        setError('Kód sa nepodarilo prečítať z fotky. Skús bližšie / ostrejšie.')
      }
    } finally {
      setDecoding(false)
      setStatus('Namier na čiarový kód…')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000', zIndex: 1000,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(0,0,0,0.6)', color: '#fff',
      }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Naskenuj výrobné číslo</div>
        <button onClick={onClose} aria-label="Zavrieť" style={{
          width: 44, height: 44, borderRadius: 22, border: 'none',
          background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 22,
          cursor: 'pointer',
        }}>×</button>
      </div>

      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {/* Scan frame overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: '78%', maxWidth: 360, aspectRatio: '1.6 / 1',
            border: '3px solid rgba(255,255,255,0.85)', borderRadius: 14,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
          }} />
        </div>
        <div style={{
          position: 'absolute', bottom: 120, left: 0, right: 0,
          textAlign: 'center', color: '#fff', fontSize: 14, padding: '0 24px',
          textShadow: '0 1px 2px rgba(0,0,0,0.6)',
        }}>
          {decoding ? 'Čítam fotku…' : (error || status)}
        </div>
      </div>

      {/* Bottom action bar */}
      <div style={{
        padding: '16px 16px 28px', display: 'flex', gap: 10,
        background: 'rgba(0,0,0,0.75)',
      }}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={decoding}
          style={{
            flex: 1, padding: '14px 12px', border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 12, background: '#fff', color: '#0f172a',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19V5a2 2 0 0 0-2-2h-3.17a2 2 0 0 1-1.42-.59l-.82-.82A2 2 0 0 0 14.17 1H9.83a2 2 0 0 0-1.42.59l-.82.82A2 2 0 0 1 6.17 3H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          Vyfotiť a načítať
        </button>
        {torchSupported && (
          <button
            type="button"
            onClick={toggleTorch}
            aria-label="Baterka"
            style={{
              flex: '0 0 auto', width: 56, padding: '14px 0',
              border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12,
              background: torchOn ? '#fbbf24' : 'rgba(255,255,255,0.1)',
              color: torchOn ? '#0f172a' : '#fff',
              fontSize: 22, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={e => onPhotoPicked(e.target.files?.[0])}
        style={{ display: 'none' }}
      />
    </div>
  )
}
