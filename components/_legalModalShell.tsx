'use client'

import { useEffect, ReactNode } from 'react'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
}

export default function LegalModalShell({ title, onClose, children }: Props) {
  // Esc to close + lock body scroll while open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          backgroundColor: 'white', borderRadius: '12px',
          maxWidth: '600px', width: '100%',
          maxHeight: '90vh', overflowY: 'auto',
          padding: '24px', position: 'relative',
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        {/* Close X */}
        <button
          onClick={onClose}
          aria-label="Zavrieť"
          style={{
            position: 'absolute', top: '12px', right: '12px',
            background: '#f1f5f9', border: 'none', borderRadius: 8,
            width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#475569', cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: 0,
          }}
        >
          ×
        </button>

        <h1 style={{ margin: '0 36px 6px 0', fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
          {title}
        </h1>

        {children}

        <button
          onClick={onClose}
          style={{
            width: '100%', marginTop: 18,
            padding: '12px', borderRadius: 8,
            border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a',
            fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Zavrieť
        </button>
      </div>
    </div>
  )
}

export const h2: React.CSSProperties = { fontSize: '20px', fontWeight: 'bold', marginTop: '20px', marginBottom: '8px', color: '#0f172a' }
export const p: React.CSSProperties = { fontSize: '14px', lineHeight: 1.6, color: '#374151', margin: '0 0 10px' }
export const ul: React.CSSProperties = { paddingLeft: '20px', listStyleType: 'disc', fontSize: '14px', lineHeight: 1.6, color: '#374151', margin: '0 0 10px' }
