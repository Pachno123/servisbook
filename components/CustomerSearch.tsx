'use client'

import { useState, useRef, useEffect } from 'react'
import type { Customer } from '@/lib/database.types'

interface Props {
  customers: Customer[]
  selectedId: string
  onSelect: (id: string) => void
  accentColor?: string
}

export default function CustomerSearch({ customers, selectedId, onSelect, accentColor = '#2563eb' }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = customers.find((c) => String(c.id) === selectedId)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = query.trim()
    ? customers.filter(
        (c) =>
          c.nazov.toLowerCase().includes(query.toLowerCase()) ||
          (c.mesto || '').toLowerCase().includes(query.toLowerCase())
      )
    : customers

  const displayValue = selected && !open ? selected.nazov : query

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        type="text"
        value={displayValue}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={(e) => {
          e.target.style.borderColor = accentColor
          setOpen(true)
          setQuery('')
        }}
        onBlur={(e) => { e.target.style.borderColor = '#d1d5db' }}
        placeholder="Vyhľadaj zákazníka podľa mena..."
        style={{
          width: '100%',
          boxSizing: 'border-box',
          border: '1.5px solid #d1d5db',
          borderRadius: '10px',
          padding: '12px 16px',
          fontSize: '16px',
          color: '#111827',
          outline: 'none',
          transition: 'border-color 0.2s',
          background: '#fff',
        }}
      />
      {selected && !open && (
        <div style={{
          fontSize: '12px',
          color: '#6b7280',
          marginTop: '4px',
          paddingLeft: '4px',
        }}>
          {[selected.ulica, selected.mesto].filter(Boolean).join(', ')}
        </div>
      )}
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '10px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          zIndex: 100,
          maxHeight: '260px',
          overflowY: 'auto',
          marginTop: '4px',
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '12px 16px', color: '#9ca3af', fontSize: '14px' }}>
              Žiadni zákazníci
            </div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={() => { onSelect(String(c.id)); setOpen(false); setQuery('') }}
                style={{
                  width: '100%',
                  display: 'block',
                  textAlign: 'left',
                  padding: '10px 16px',
                  background: String(c.id) === selectedId ? '#eff6ff' : 'transparent',
                  border: 'none',
                  borderBottom: '1px solid #f3f4f6',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#111827',
                }}
              >
                <div style={{ fontWeight: 500 }}>{c.nazov}</div>
                {c.mesto && (
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '1px' }}>
                    {[c.ulica, c.mesto].filter(Boolean).join(', ')}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
