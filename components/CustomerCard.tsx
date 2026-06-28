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

function daysSince(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const past = new Date(dateStr); past.setHours(0, 0, 0, 0)
  return Math.round((today.getTime() - past.getTime()) / 86_400_000)
}

function DaysSinceReviziaBadge({ lastReviziaDate }: { lastReviziaDate: string }) {
  const days = daysSince(lastReviziaDate)
  let bg = '#dcfce7', color = '#15803d'
  if (days > 180) { bg = '#fef2f2'; color = '#dc2626' }
  else if (days > 60) { bg = '#fff7ed'; color = '#ea580c' }
  return (
    <span style={{
      fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: 20,
      background: bg, color, flexShrink: 0, whiteSpace: 'nowrap',
    }}>
      {days === 0 ? 'Dnes' : `${days} dní od rev.`}
    </span>
  )
}

function ReviziaCountdownBadge({ nextReviziaDate }: { nextReviziaDate: string }) {
  const days = daysUntil(nextReviziaDate)
  let bg = '#eff6ff'
  let color = '#2563eb'
  if (days < 0) { bg = '#fef2f2'; color = '#dc2626' }
  else if (days < 10) { bg = '#fef2f2'; color = '#dc2626' }
  else if (days < 30) { bg = '#fff7ed'; color = '#ea580c' }

  let label: string
  if (days === 0) label = 'Dnes!'
  else if (days < 0) label = `${Math.abs(days)}d po term.`
  else label = `${days} dní`

  return (
    <span style={{
      fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: 20,
      background: bg, color, flexShrink: 0, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function getAvatarColor(name: string): string {
  const colors = ['#dbeafe', '#dbeafe', '#fef9c3', '#fce7f3', '#ede9fe', '#ffedd5']
  const textColors = ['#1d4ed8', '#1d4ed8', '#a16207', '#9d174d', '#6d28d9', '#c2410c']
  const idx = name.charCodeAt(0) % colors.length
  return colors[idx] + '|' + textColors[idx]
}

export default function CustomerCard({ customer, onClick, lastReviziaDate, nextServiceDate, nextReviziaDate }: CustomerCardProps) {
  const now = new Date()
  const isPastDue = nextServiceDate ? nextServiceDate < now : false
  const [avatarBg, avatarText] = getAvatarColor(customer.nazov).split('|')

  return (
    <button
      onClick={onClick}
      className="customer-card"
      style={{
        width: '100%', textAlign: 'left', background: '#ffffff',
        border: '1px solid #e2e8f0', borderRadius: 14,
        padding: '14px', cursor: 'pointer',
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
        display: 'flex', alignItems: 'center', gap: '12px',
        transition: 'transform 120ms ease, box-shadow 160ms ease, border-color 160ms ease',
      }}
      onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.985)' }}
      onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = '' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 2px rgba(15,23,42,0.04)'; (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(15,23,42,0.08)'; (e.currentTarget as HTMLElement).style.borderColor = '#cbd5e1' }}
      onTouchStart={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.985)' }}
      onTouchEnd={(e) => { (e.currentTarget as HTMLElement).style.transform = '' }}
    >
      {/* Avatar */}
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: avatarBg, color: avatarText,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '15px', fontWeight: 700, flexShrink: 0,
        letterSpacing: '-0.02em',
      }}>
        {getInitials(customer.nazov)}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>
            {customer.nazov}
          </h3>
          {lastReviziaDate && <DaysSinceReviziaBadge lastReviziaDate={lastReviziaDate} />}
          {nextReviziaDate && <ReviziaCountdownBadge nextReviziaDate={nextReviziaDate} />}
        </div>

        {/* Info rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {(customer.ulica || customer.mesto) && (
            <span style={{ fontSize: '13px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {customer.ulica ? `${customer.ulica}, ${customer.mesto}` : customer.mesto}
            </span>
          )}
          {customer.kotol && (
            <span style={{ fontSize: '12px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {customer.kotol}
            </span>
          )}
          {isPastDue && nextServiceDate && (
            <span style={{
              fontSize: '11px', fontWeight: 600, color: '#dc2626', marginTop: 2,
            }}>
              Po termíne: {formatDate(nextServiceDate)}
            </span>
          )}
          {lastReviziaDate && (
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              Posledná revízia: {formatDate(new Date(lastReviziaDate))}
            </span>
          )}
        </div>
      </div>

      {/* Chevron */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  )
}
