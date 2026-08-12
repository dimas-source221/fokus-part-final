'use client'

import { useState, useEffect, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function GlassCard({
  children,
  className,
  style,
  glow = false,
  onClick,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
  glow?: boolean
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl border border-white/[0.08] bg-white/[0.035] backdrop-blur-xl',
        glow && 'shadow-[0_0_40px_rgba(6,182,212,0.07),inset_0_1px_0_rgba(255,255,255,0.05)]',
        onClick && 'cursor-pointer',
        className,
      )}
      style={style}
    >
      {children}
    </div>
  )
}

export type FokusBadgeColor = 'cyan' | 'amber' | 'green' | 'rose' | 'violet' | 'sky'

const BADGE_MAP: Record<FokusBadgeColor, { bg: string; text: string; border: string }> = {
  cyan: { bg: 'rgba(34,211,238,0.12)', text: '#67e8f9', border: 'rgba(34,211,238,0.25)' },
  amber: { bg: 'rgba(251,191,36,0.12)', text: '#fcd34d', border: 'rgba(251,191,36,0.25)' },
  green: { bg: 'rgba(52,211,153,0.12)', text: '#6ee7b7', border: 'rgba(52,211,153,0.25)' },
  rose: { bg: 'rgba(248,113,113,0.12)', text: '#fca5a5', border: 'rgba(248,113,113,0.25)' },
  violet: { bg: 'rgba(167,139,250,0.12)', text: '#c4b5fd', border: 'rgba(167,139,250,0.25)' },
  sky: { bg: 'rgba(56,189,248,0.12)', text: '#7dd3fc', border: 'rgba(56,189,248,0.25)' },
}

export function FokusBadge({ label, color }: { label: string; color: FokusBadgeColor }) {
  const c = BADGE_MAP[color]
  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      {label}
    </span>
  )
}

export function FokusBtn({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  const base =
    'inline-flex items-center gap-1.5 rounded-xl font-semibold transition-all duration-150 border-none outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
  const sizes = {
    sm: 'px-3 py-1 text-xs',
    md: 'px-[18px] py-2 text-[13px]',
  }
  const variants = {
    primary:
      'bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:opacity-90',
    ghost:
      'bg-white/[0.04] text-white/55 border border-white/[0.09] hover:bg-white/[0.07] hover:text-white/75',
    danger:
      'bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/15',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(base, sizes[size], variants[variant], className)}
    >
      {children}
    </button>
  )
}

export function FokusInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  readOnly,
  className,
}: {
  value: string | number
  onChange?: (v: string) => void
  placeholder?: string
  type?: string
  readOnly?: boolean
  className?: string
}) {
  return (
    <input
      type={type}
      readOnly={readOnly}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className={cn(
        'w-full rounded-xl border border-white/[0.09] bg-white/[0.04] px-3.5 py-2.5 text-[13px] outline-none transition-colors',
        readOnly ? 'cursor-not-allowed text-white/35' : 'text-white focus:border-cyan-400/40',
        className,
      )}
    />
  )
}

export function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

export const COURSE_COLORS = ['#22d3ee', '#818cf8', '#34d399', '#f59e0b', '#f472b6']
