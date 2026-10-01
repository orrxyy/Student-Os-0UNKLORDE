import React, { useState, useRef, useEffect } from 'react'

// ─── Icons ──────────────────────────────────────────────────────────────────

type IconName =
  | 'home' | 'book-open' | 'folder' | 'briefcase' | 'award'
  | 'file-text' | 'bar-chart-2' | 'clock' | 'check-square' | 'search'
  | 'plus' | 'chevron-right' | 'chevron-down' | 'chevron-left' | 'x'
  | 'edit-2' | 'trash-2' | 'upload' | 'inbox' | 'settings' | 'layers'
  | 'tag' | 'calendar' | 'user' | 'grid' | 'list' | 'star' | 'info'
  | 'alert-circle' | 'check' | 'minus' | 'plus-circle' | 'external-link'
  | 'paperclip' | 'download' | 'book' | 'cpu' | 'flask' | 'dumbbell' | 'cross' | 'calculator' | 'eye' | 'eye-off' | 'chevron-up'

const PATHS: Record<IconName, React.ReactNode> = {
  'home': <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />,
  'book-open': <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></>,
  'book': <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>,
  'folder': <><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></>,
  'briefcase': <><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></>,
  'award': <><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" /></>,
  'file-text': <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10,9 9,9 8,9" /></>,
  'bar-chart-2': <><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>,
  'clock': <><circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" /></>,
  'check-square': <><polyline points="9,11 12,14 22,4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>,
  'search': <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
  'plus': <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
  'plus-circle': <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></>,
  'chevron-right': <polyline points="9,18 15,12 9,6" />,
  'chevron-down': <polyline points="6,9 12,15 18,9" />,
  'chevron-up': <polyline points="18,15 12,9 6,15" />,
  'eye': <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>,
  'eye-off': <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>,
  'chevron-left': <polyline points="15,18 9,12 15,6" />,
  'x': <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
  'edit-2': <><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></>,
  'trash-2': <><polyline points="3,6 5,6 21,6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></>,
  'upload': <><polyline points="16,16 12,12 8,16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></>,
  'inbox': <><polyline points="22,12 16,12 14,15 10,15 8,12 2,12" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></>,
  'settings': <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
  'layers': <><polygon points="12,2 2,7 12,12 22,7 12,2" /><polyline points="2,17 12,22 22,17" /><polyline points="2,12 12,17 22,12" /></>,
  'tag': <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></>,
  'calendar': <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
  'user': <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  'grid': <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></>,
  'list': <><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></>,
  'star': <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12,2" />,
  'info': <><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></>,
  'alert-circle': <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>,
  'check': <polyline points="20,6 9,17 4,12" />,
  'minus': <line x1="5" y1="12" x2="19" y2="12" />,
  'external-link': <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15,3 21,3 21,9" /><line x1="10" y1="14" x2="21" y2="3" /></>,
  'paperclip': <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />,
  'download': <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7,10 12,15 17,10" /><line x1="12" y1="15" x2="12" y2="3" /></>,
  'cpu': <><rect x="9" y="9" width="6" height="6" /><path d="M15 9V5h-2M9 9V5h2M15 15v4h-2M9 15v4h2M15 9h4v2M15 15h4v-2M9 9H5v2M9 15H5v-2" /></>,
  'flask': <><path d="M9 3h6v10l3 6H6l3-6V3z" /><line x1="6" y1="14" x2="18" y2="14" /></>,
  'dumbbell': <><path d="M6.5 6.5h11M6.5 17.5h11M3 10.5v3M7.5 7.5v9M16.5 7.5v9M21 10.5v3" strokeWidth="2.5" /></>,
  'cross': <><path d="M12 2v20M2 12h20" /></>,
  'calculator': <><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="10" x2="8" y2="10" /><line x1="12" y1="10" x2="12" y2="10" /><line x1="16" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="8" y2="14" /><line x1="12" y1="14" x2="12" y2="14" /><line x1="16" y1="14" x2="16" y2="14" /><line x1="8" y1="18" x2="12" y2="18" /><line x1="16" y1="18" x2="16" y2="18" /></>,
}

export function Icon({ name, size = 16, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  )
}

// ─── Button ──────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: IconName
  iconRight?: IconName
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]',
  secondary: 'bg-secondary text-secondary-foreground hover:opacity-90 active:scale-[0.98]',
  ghost: 'bg-transparent text-foreground hover:bg-muted active:scale-[0.98]',
  outline: 'bg-transparent border border-border text-foreground hover:bg-muted active:scale-[0.98]',
  destructive: 'bg-destructive text-destructive-foreground hover:opacity-90 active:scale-[0.98]',
}

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1 text-xs gap-1.5',
  md: 'px-3.5 py-1.5 text-sm gap-2',
  lg: 'px-5 py-2.5 text-sm gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-sans font-medium rounded transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
      {...props}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 13 : 15} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 13 : 15} />}
    </button>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  hoverable?: boolean
}

export function Card({ children, className = '', onClick, hoverable }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-card border border-border rounded-lg ${hoverable ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────

type BadgeVariant = 'default' | 'primary' | 'secondary' | 'accent' | 'muted' | 'success' | 'destructive' | 'outline'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-sage-light text-primary',
  secondary: 'bg-indigo-light text-secondary',
  accent: 'bg-gold-light text-accent',
  muted: 'bg-muted text-muted-foreground',
  success: 'bg-emerald-50 text-emerald-700',
  destructive: 'bg-red-50 text-red-700',
  outline: 'bg-transparent border border-border text-muted-foreground',
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-sm font-mono ${badgeVariants[variant]} ${className}`}>
      {children}
    </span>
  )
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

interface TabItem {
  key: string
  label: string
  icon?: IconName
}

interface TabsProps {
  tabs: TabItem[]
  active: string
  onChange: (key: string) => void
  className?: string
}

export function Tabs({ tabs, active, onChange, className = '' }: TabsProps) {
  return (
    <div className={`flex gap-0 border-b border-border overflow-x-auto whitespace-nowrap [scrollbar-width:none] ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px shrink-0 ${
            active === tab.key
              ? 'border-accent text-accent'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          }`}
        >
          {tab.icon && <Icon name={tab.icon} size={14} />}
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ─── Input ────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: IconName
}

export function Input({ label, error, icon, className = '', id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Icon name={icon} size={14} />
          </span>
        )}
        <input
          id={inputId}
          className={`w-full bg-card border border-border rounded px-3 py-2 text-sm font-sans placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors ${icon ? 'pl-9' : ''} ${error ? 'border-destructive' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// ─── Select ───────────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
}

export function Select({ label, options, className = '', ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </label>
      )}
      <select
        className={`bg-card border border-border rounded px-3 py-2 text-sm font-sans focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors ${className}`}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

// ─── StatTile ─────────────────────────────────────────────────────────────────

interface StatTileProps {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
  className?: string
}

export function StatTile({ label, value, sub, accent, className = '' }: StatTileProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{label}</p>
      <p className={`text-2xl font-display font-semibold ${accent ? 'text-accent' : 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

// ─── Progress ─────────────────────────────────────────────────────────────────

interface ProgressProps {
  value: number
  max?: number
  label?: string
  showPct?: boolean
  variant?: 'primary' | 'accent' | 'muted'
  className?: string
}

export function Progress({ value, max = 100, label, showPct, variant = 'primary', className = '' }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const colors = { primary: 'bg-primary', accent: 'bg-accent', muted: 'bg-muted-foreground' }
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {(label || showPct) && (
        <div className="flex justify-between items-center">
          {label && <span className="text-xs text-muted-foreground">{label}</span>}
          {showPct && <span className="text-xs font-mono text-muted-foreground">{pct.toFixed(0)}%</span>}
        </div>
      )}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colors[variant]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: IconName
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center gap-3 ${className}`}>
      {icon && (
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
          <Icon name={icon} size={22} />
        </div>
      )}
      <div>
        <p className="font-medium text-foreground">{title}</p>
        {description && <p className="text-sm text-muted-foreground mt-1 max-w-xs">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, actions, className = '' }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-card border border-border rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-md max-h-[92dvh] flex flex-col ${className}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="font-display text-base font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground transition-colors w-10 h-10 -mr-2 flex items-center justify-center">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto min-h-0 flex-1">{children}</div>
        {actions && (
          <div className="px-5 pb-5 pt-1 flex justify-end gap-2 shrink-0">{actions}</div>
        )}
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-muted rounded animate-pulse ${className}`} />
}

// ─── Divider ─────────────────────────────────────────────────────────────────

export function Divider({ label, className = '' }: { label?: string; className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="h-px flex-1 bg-border" />
      {label && <span className="text-xs text-muted-foreground uppercase tracking-widest">{label}</span>}
      {label && <div className="h-px flex-1 bg-border" />}
    </div>
  )
}
