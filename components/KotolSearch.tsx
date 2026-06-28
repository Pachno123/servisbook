'use client'

import { useState, useEffect } from 'react'

interface KotolSearchProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  accentColor?: string
  inputStyle?: React.CSSProperties
}

export default function KotolSearch({
  value,
  onChange,
  placeholder = 'Hľadaj kotol...',
  accentColor = '#2563eb',
  inputStyle,
}: KotolSearchProps) {
  const [kotle, setKotle] = useState<string[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetch('/api/kotle')
      .then(r => r.json())
      .then((data: { nazov: string }[]) => setKotle(data.map(k => k.nazov)))
      .catch(() => {})
  }, [])

  const filtered = value.length > 0
    ? kotle.filter(k => k.toLowerCase().includes(value.toLowerCase()))
    : kotle

  const base: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    border: '1.5px solid #e5e7eb', borderRadius: '10px',
    padding: '12px 14px', fontSize: '16px', color: '#111827',
    background: '#fff', outline: 'none',
    ...inputStyle,
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={e => { e.currentTarget.style.borderColor = accentColor; setOpen(true) }}
        onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; setTimeout(() => setOpen(false), 150) }}
        placeholder={placeholder}
        style={base}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 100,
          maxHeight: '220px', overflowY: 'auto',
        }}>
          {filtered.map((name, idx) => (
            <div
              key={idx}
              onMouseDown={() => { onChange(name); setOpen(false) }}
              style={{
                padding: '11px 14px', fontSize: '15px', cursor: 'pointer',
                borderBottom: idx < filtered.length - 1 ? '1px solid #f3f4f6' : 'none',
                color: '#111827',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f0f7ff')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
