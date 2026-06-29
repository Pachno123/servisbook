'use client'

import { Customer } from '@/lib/database.types'

interface CustomerCardProps {
  customer: Customer
  onClick: () => void
  lastReviziaDate?: string | null
  nextServiceDate?: Date | null
  nextReviziaDate?: string | null
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

const AVATAR_PALETTES = [
  { bg: '#dbeafe', text: '#1d4ed8' },
  { bg: '#dcfce7', text: '#15803d' },
  { bg: '#fef9c3', text: '#a16207' },
  { bg: '#fce7f3', text: '#9d174d' },
  { bg: '#ede9fe', text: '#6d28d9' },
  { bg: '#ffedd5', text: '#c2410c' },
]

function getAvatarColors(name: string) {
  return AVATAR_PALETTES[name.charCodeAt(0) % AVATAR_PALETTES.length]
}

type StatusLevel = 'ok' | 'soon90' | 'soon30' | 'overdue' | 'none'

function getStatus(nextReviziaDate: string | null | undefined): StatusLevel {
  if (!nextReviziaDate) return 'none'
  const days = daysUntil(nextReviziaDate)
  if (days < 0) return 'overdue'
  if (days <= 30) return 'soon30'
  if (days <= 90) return 'soon90'
  return 'ok'
}

const STATUS_CONFIG: Record<StatusLevel, { label: string; bg: string; color: string; dot: string } | null> = {
  ok:      { label: 'V poriadku', bg: '#f0fdf4', color: '#16a34a', dot: '#22c55e' },
  soon90:  { label: 'Čoskoro',    bg: '#eff6ff', color: '#2563eb', dot: '#3b82f6' },
  soon30:  { label: 'Do 30 dní',  bg: '#fff7ed', color: '#ea580c', dot: '#f97316' },
  overdue: { label: 'Po termíne', bg: '#fef2f2', color: '#dc2626', dot: '#ef4444' },
  none:    null,
}

function StatusBadge({ status, nextReviziaDate }: { status: StatusLevel; nextReviziaDate: string | null | undefined }) {
  const config = STATUS_CONFIG[status]
  if (!config || !nextReviziaDate) return null

  const days = daysUntil(nextReviziaDate)
  let sub = ''
  if (status === 'overdue') sub = `${Math.abs(days)} dní`
  else if (status === 'soon30' || status === 'soon90') sub = `${days} dní`

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      fontSize: '11.5px', fontWeight: 600,
      padding: '3px 8px', borderRadius: 20,
      background: config.bg, color: config.color,
      flexShrink: 0, whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: config.dot, flexShrink: 0,
        boxShadow: status === 'overdue' ? `0 0 0 2px ${config.dot}33` : 'none',
      }} />
      {config.label}{sub ? ` · ${sub}` : ''}
    </span>
  )
}

// Left accent stripe color based on status
const STATUS_STRIPE: Record<StatusLevel, string> = {
  ok:      '#22c55e',
  soon90:  '#3b82f6',
  soon30:  '#f97316',
  overdue: '#ef4444',
  none:    'transparent',
}

export default function CustomerCard({ customer, onClick, lastReviziaDate, nextServiceDate, nextReviziaDate }: CustomerCardProps) {
  const status = getStatus(nextReviziaDate)
  const { bg: avatarBg, text: avatarText } = getAvatarColors(customer.nazov)
  const stripeColor = STATUS_STRIPE[status]

  return (
    <button
      onClick={onClick}
      className="customer-card"
      style={{
        width: '100%', textAlign: 'left', background: '#ffffff',
        border: '1px solid #e8edf2', borderRadius: 14,
        padding: '0', cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(15,23,42,0.05)',
        display: 'flex', alignItems: 'stretch',
        overflow: 'hidden',
        transition: 'transform 120ms ease, box-shadow 160ms ease, border-color 160ms ease',
      }}
      onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.985)' }}
      onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = '' }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = ''
        ;(e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(15,23,42,0.05)'
        ;(e.currentTarget as HTMLElement).style.borderColor = '#e8edf2'
      }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(15,23,42,0.09)'
        ;(e.currentTarget as HTMLElement).style.borderColor = '#c8d3de'
      }}
      onTouchStart={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.985)' }}
      onTouchEnd={e => { (e.currentTarget as HTMLElement).style.transform = '' }}
    >
      {/* Left status stripe */}
      <div style={{
        width: 4, flexShrink: 0,
        background: stripeColor,
        borderRadius: '14px 0 0 14px',
        transition: 'background 0.2s',
      }} />

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 12px 13px 14px', minWidth: 0 }}>
        {/* Avatar */}
        <div style={{
          width: 42, height: 42, borderRadius: 11,
          background: avatarBg, color: avatarText,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', fontWeight: 700, flexShrink: 0,
          letterSpacing: '-0.01em',
        }}>
          {getInitials(customer.nazov)}
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name + status badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '3px', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '14.5px', fontWeight: 700, color: '#0f172a',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              letterSpacing: '-0.01em', lineHeight: 1.3,
            }}>
              {customer.nazov}
            </span>
            <StatusBadge status={status} nextReviziaDate={nextReviziaDate} />
          </div>

          {/* Address */}
          {(customer.ulica || customer.mesto) && (
            <span style={{
              display: 'block', fontSize: '12.5px', color: '#64748b',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              lineHeight: 1.4,
            }}>
              {customer.ulica ? `${customer.ulica}, ${customer.mesto}` : customer.mesto}
            </span>
          )}

          {/* Boiler */}
          {customer.kotol && (
            <span style={{
              display: 'block', fontSize: '11.5px', color: '#94a3b8',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              lineHeight: 1.4, marginTop: '1px',
            }}>
              {customer.kotol}
            </span>
          )}

          {/* Last revizia */}
          {lastReviziaDate && (
            <span style={{
              display: 'block', fontSize: '11px', color: '#b0bcc9',
              marginTop: '2px', lineHeight: 1.4,
            }}>
              Posledná revízia: {formatDate(new Date(lastReviziaDate))}
            </span>
          )}
        </div>

        {/* Chevron */}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="#c8d3de" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0 }}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </button>
  )
}
