'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'

function Logo() {
  return (
    <div style={{
      width: 38, height: 38, borderRadius: 11,
      background: 'linear-gradient(135deg, #1e3a5f 0%, #e85d04 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      boxShadow: '0 2px 8px rgba(30,58,95,0.18)',
    }}>
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
      </svg>
    </div>
  )
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
    fetch('/api/company')
      .then(r => r.ok ? r.json() : null)
      .then(c => { if (c?.name) setCompanyName(c.name) })
      .catch(() => {})
  }, [])

  const subtitle = companyName || 'Servis'

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <header style={{
        background: '#ffffff',
        position: 'sticky', top: 0, zIndex: 40,
        borderBottom: '1px solid #e2e8f0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0, flex: 1 }}>
            <Logo />
            <div style={{ minWidth: 0 }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', display: 'block', lineHeight: 1.15, letterSpacing: '-0.02em' }}>ServisBook</span>
              <span style={{ fontSize: '11px', color: '#94a3b8', letterSpacing: '0.02em', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>{subtitle}</span>
            </div>
          </div>
          <Link
            href="/dashboard/settings"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 40, height: 40, borderRadius: 12,
              background: '#f1f5f9',
              textDecoration: 'none',
              transition: 'transform 0.15s ease, background 0.15s ease',
              flexShrink: 0,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.06)'; (e.currentTarget as HTMLElement).style.background = '#e2e8f0' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLElement).style.background = '#f1f5f9' }}
            aria-label="Nastavenia"
          >
            <SettingsIcon />
          </Link>
        </div>
      </header>

      {/* Main */}
      <main style={{ flex: 1, paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
        {mounted ? (
          <div key={pathname} style={{ animation: 'fadeIn 0.3s ease' }}>
            {children}
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '64px 0' }}>
            <div style={{ width: 28, height: 28, border: '2.5px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
