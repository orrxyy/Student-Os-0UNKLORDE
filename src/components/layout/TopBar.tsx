import { useNavigate, useLocation, Link } from 'react-router'
import { Icon } from '../ui'
import { useTheme } from '../../lib/theme'
import { useShell } from './AppShell'

const ROUTE_LABELS: Record<string, string> = {
  '/': 'Dashboard',
  '/academics': 'Academics',
  '/materials': 'Materials',
  '/portfolio': 'Portfolio',
  '/certificates': 'Certificates',
  '/cv': 'CV Inventory',
  '/analytics': 'Analytics',
  '/timeline': 'Timeline',
  '/tasks': 'Tasks',
  '/settings': 'Settings',
  '/inbox': 'AI Inbox',
}

interface Crumb {
  label: string
  to?: string
}

function useBreadcrumbs(): Crumb[] {
  const location = useLocation()
  const path = location.pathname
  if (ROUTE_LABELS[path]) return [{ label: ROUTE_LABELS[path] }]
  if (path.startsWith('/academics/')) {
    const parts = path.split('/').filter(Boolean)
    const year = parts[1]
    const sem = parts[2]
    if (year && sem) {
      return [
        { label: 'Academics', to: '/academics' },
        { label: `Year ${year} · Sem ${sem}` },
      ]
    }
  }
  if (path.startsWith('/course/')) {
    return [
      { label: 'Academics', to: '/academics' },
      { label: 'Course' },
    ]
  }
  if (path.startsWith('/portfolio/')) {
    return [{ label: 'Portfolio', to: '/portfolio' }, { label: 'Entry' }]
  }
  return [{ label: '' }]
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'
  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Switch to Shu / Light' : 'Switch to Silver Wolf / Dark'}
      className="flex items-center gap-1.5 px-2.5 h-10 md:h-auto md:py-1.5 rounded-md text-xs font-mono font-medium border border-border bg-card hover:bg-muted transition-all shrink-0"
    >
      <span>{isDark ? '🌙' : '☀️'}</span>
      <span className="text-muted-foreground hidden sm:inline">
        {isDark ? 'Silver Wolf' : 'Shu'}
      </span>
    </button>
  )
}

export function TopBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const crumbs = useBreadcrumbs()
  const { openAddAnything, openMenu } = useShell()
  const isDeep =
    location.pathname.startsWith('/course/') ||
    location.pathname.startsWith('/academics/')

  return (
    <header className="h-14 shrink-0 bg-card border-b border-border flex items-center gap-2 md:gap-3 px-3 md:px-5">
      <button
        onClick={openMenu}
        className="md:hidden w-10 h-10 -ml-1 rounded flex items-center justify-center text-foreground hover:bg-muted shrink-0"
        aria-label="Open menu"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>
      {/* Back button for deep routes */}
      {isDeep && (
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 md:w-7 md:h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all shrink-0"
          aria-label="Go back"
        >
          <Icon name="chevron-left" size={16} />
        </button>
      )}

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm min-w-0 overflow-hidden whitespace-nowrap">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <Icon name="chevron-right" size={11} className="text-muted-foreground/50" />}
            {crumb.to ? (
              <Link
                to={crumb.to}
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="font-display font-semibold text-foreground">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      <div className="flex-1" />

      {/* + Add Anything */}
      <button
        onClick={() => openAddAnything()}
        title="Add anything"
        className="flex items-center gap-1.5 px-3 h-10 md:h-auto md:px-2.5 md:py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all shrink-0"
      >
        <Icon name="plus" size={13} />
        <span className="hidden sm:inline">Add</span>
      </button>

      {/* Theme toggle */}
      <ThemeToggle />

      {/* Search */}
      <button
        className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md text-sm text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all min-w-[160px] group hidden lg:flex"
        aria-label="Search"
      >
        <Icon name="search" size={13} className="shrink-0" />
        <span className="text-xs flex-1 text-left">Search…</span>
        <span className="text-[10px] font-mono bg-card border border-border rounded px-1 py-0.5 text-muted-foreground">
          ⌘K
        </span>
      </button>

      {/* AI Inbox */}
      <Link
        to="/inbox"
        className="w-10 h-10 md:w-8 md:h-8 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all relative shrink-0"
        aria-label="AI Inbox"
      >
        <Icon name="inbox" size={16} />
      </Link>
    </header>
  )
}
