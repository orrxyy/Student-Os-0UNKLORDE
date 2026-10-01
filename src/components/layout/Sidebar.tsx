import { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router'
import { Icon } from '../ui'
import { useTheme } from '../../lib/theme'
import { useStore } from '../../lib/store'
import { getActiveCredits, getSemesterLabel } from '../../lib/selectors'
import { ArtworkImage } from '../ArtworkImage'
import type { Theme } from '../../lib/theme'

interface NavItem {
  to: string
  label: string
  icon: Parameters<typeof Icon>[0]['name']
  end?: boolean
}

interface NavGroup {
  label?: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    items: [{ to: '/', label: 'Dashboard', icon: 'home', end: true }],
  },
  {
    label: 'Academic',
    items: [
      { to: '/academics', label: 'Academics', icon: 'book-open' },
      { to: '/materials', label: 'Materials', icon: 'folder' },
    ],
  },
  {
    label: 'Portfolio',
    items: [
      { to: '/portfolio', label: 'Portfolio', icon: 'briefcase' },
      { to: '/certificates', label: 'Certificates', icon: 'award' },
      { to: '/cv', label: 'CV Inventory', icon: 'file-text' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/analytics', label: 'Analytics', icon: 'bar-chart-2' },
      { to: '/timeline', label: 'Timeline', icon: 'clock' },
    ],
  },
  {
    items: [{ to: '/tasks', label: 'Tasks', icon: 'check-square' }],
  },
]

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0 ${on ? 'bg-accent/70' : 'bg-white/15'}`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${on ? 'left-[18px]' : 'left-0.5'}`}
      />
    </button>
  )
}

export function Sidebar({ className = '', onClose }: { className?: string; onClose?: () => void }) {
  const location = useLocation()
  const { state } = useStore()
  const identity = `${getSemesterLabel(state, state.activeSemesterId).replace('Year ', 'Y').replace(' · Semester ', ' · S')} · ${getActiveCredits(state)} SKS`
  const {
    theme, setTheme,
    artworks, artworkIndex, currentArtwork,
    nextArtwork, prevArtwork,
    autoCarousel, setAutoCarousel,
    pauseCarousel, resumeCarousel,
    motionEnabled, setMotionEnabled,
  } = useTheme()

  const [ccOpen, setCcOpen] = useState(false)
  const [displayedArtwork, setDisplayedArtwork] = useState(currentArtwork)
  const [fading, setFading] = useState(false)
  const ccRef = useRef<HTMLDivElement>(null)

  // Crossfade when artwork changes
  useEffect(() => {
    if (currentArtwork === displayedArtwork) return
    setFading(true)
    const t = setTimeout(() => {
      setDisplayedArtwork(currentArtwork)
      setFading(false)
    }, 220)
    return () => clearTimeout(t)
  }, [currentArtwork])

  // Close control center on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ccRef.current && !ccRef.current.contains(e.target as Node)) {
        setCcOpen(false)
      }
    }
    if (ccOpen) document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [ccOpen])

  return (
    <aside className={`w-[240px] shrink-0 bg-secondary flex flex-col h-full overflow-hidden ${className}`}>
      {/* Brand */}
      <div className="px-5 pt-6 pb-4 relative">
        {onClose && (
          <button onClick={onClose} aria-label="Close menu" className="md:hidden absolute top-4 right-3 w-10 h-10 flex items-center justify-center text-secondary-foreground/60 hover:text-secondary-foreground">
            <Icon name="x" size={16} />
          </button>
        )}
        <p className="font-mono text-[9px] tracking-[0.25em] text-secondary-foreground/40 uppercase mb-0.5">
          0UNKLORDE
        </p>
        <p className="font-display text-[15px] font-semibold text-secondary-foreground tracking-tight">
          Student OS
        </p>
        <div className="mt-3.5 h-px bg-gradient-to-r from-accent/50 via-accent/20 to-transparent" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-5">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="px-2 mb-1.5 text-[9px] font-medium tracking-[0.2em] uppercase text-secondary-foreground/35">
                {group.label}
              </p>
            )}
            <ul className="space-y-px">
              {group.items.map((item) => {
                const isActive = item.end
                  ? location.pathname === item.to
                  : location.pathname.startsWith(item.to)
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={() =>
                        `flex items-center gap-2.5 px-2.5 py-[7px] max-md:py-2.5 rounded text-[13px] font-medium transition-all duration-150 relative ${
                          isActive
                            ? 'text-accent bg-white/8'
                            : 'text-secondary-foreground/55 hover:text-secondary-foreground/85 hover:bg-white/5'
                        }`
                      }
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-accent rounded-r-full" />
                      )}
                      <Icon name={item.icon} size={14} />
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Identity card — clickable artwork + OS Control Center */}
      <div className="px-3 pb-4 relative" ref={ccRef}>
        {/* OS Control Center popover */}
        {ccOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-secondary border border-white/12 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-4 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <p className="font-mono text-[9px] tracking-[0.22em] uppercase text-secondary-foreground/40">
                  OS CONTROL CENTER
                </p>
                <button
                  onClick={() => setCcOpen(false)}
                  className="text-secondary-foreground/40 hover:text-secondary-foreground transition-colors"
                >
                  <Icon name="x" size={12} />
                </button>
              </div>

              {/* Appearance */}
              <div>
                <p className="text-[9px] font-mono uppercase tracking-widest text-secondary-foreground/35 mb-2">
                  Appearance
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { val: 'light' as Theme, label: '☀ Shu' },
                      { val: 'dark' as Theme, label: '🌙 S. Wolf' },
                    ] as const
                  ).map(({ val, label }) => (
                    <button
                      key={val}
                      onClick={() => setTheme(val)}
                      className={`px-2.5 py-1.5 rounded text-[11px] font-medium transition-all border ${
                        theme === val
                          ? 'bg-accent/20 text-accent border-accent/35'
                          : 'text-secondary-foreground/55 hover:bg-white/5 border-white/10'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-white/8" />

              {/* Artwork */}
              <div>
                <p className="text-[9px] font-mono uppercase tracking-widest text-secondary-foreground/35 mb-2">
                  Artwork
                </p>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] text-secondary-foreground/60">Auto-carousel</span>
                  <Toggle on={autoCarousel} onToggle={() => setAutoCarousel(!autoCarousel)} />
                </div>
                <div className="flex items-center justify-between">
                  <button
                    onClick={prevArtwork}
                    className="w-7 h-7 flex items-center justify-center rounded text-secondary-foreground/50 hover:text-secondary-foreground hover:bg-white/8 transition-all"
                  >
                    <Icon name="chevron-left" size={14} />
                  </button>
                  <span className="text-[10px] font-mono text-secondary-foreground/40">
                    {artworkIndex + 1} / {artworks.length}
                  </span>
                  <button
                    onClick={nextArtwork}
                    className="w-7 h-7 flex items-center justify-center rounded text-secondary-foreground/50 hover:text-secondary-foreground hover:bg-white/8 transition-all"
                  >
                    <Icon name="chevron-right" size={14} />
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-white/8" />

              {/* Motion */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-secondary-foreground/60">Animations</span>
                <Toggle on={motionEnabled} onToggle={() => setMotionEnabled(!motionEnabled)} />
              </div>
            </div>
          </div>
        )}

        {/* Identity card */}
        <div className="rounded-lg overflow-hidden border border-white/10 bg-white/5">
          {/* Artwork area — click to open CC, hover to pause carousel */}
          <div
            className="relative h-28 overflow-hidden cursor-pointer group"
            onClick={() => setCcOpen((v) => !v)}
            onMouseEnter={pauseCarousel}
            onMouseLeave={resumeCarousel}
          >
            <ArtworkImage
              src={displayedArtwork}
              alt="Character artwork"
              className={`w-full h-full object-cover object-[center_20%] scale-110 transition-opacity duration-[220ms] ${fading ? 'opacity-0' : 'opacity-100'}`}
            />
            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-secondary/95 via-secondary/30 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-secondary/40 to-transparent pointer-events-none" />
            {/* Click hint */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <span className="bg-black/50 text-white/70 text-[8px] font-mono rounded px-1.5 py-0.5 tracking-wide">
                {ccOpen ? 'close' : 'controls'}
              </span>
            </div>
          </div>

          {/* Info strip */}
          <div className="px-3.5 pt-2 pb-3">
            <p className="text-[11px] font-display font-semibold text-secondary-foreground/90 leading-tight">
              0UNKLORDE
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
              <p className="text-[9px] font-mono text-secondary-foreground/45 uppercase tracking-widest">
                {identity}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
