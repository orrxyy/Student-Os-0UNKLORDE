import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { AddAnythingModal } from '../AddAnythingModal'

interface ShellCtx {
  openAddAnything: (seed?: string) => void
  openMenu: () => void
}

const ShellContext = createContext<ShellCtx>({ openAddAnything: () => {}, openMenu: () => {} })
export const useShell = () => useContext(ShellContext)

export function AppShell() {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [add, setAdd] = useState<{ open: boolean; seed: string }>({ open: false, seed: '' })

  useEffect(() => setMenuOpen(false), [location.pathname])
  useEffect(() => {
    if (!menuOpen) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [menuOpen])

  const openAddAnything = useCallback((seed = '') => setAdd({ open: true, seed }), [])
  const openMenu = useCallback(() => setMenuOpen(true), [])
  const ctx = useMemo(() => ({ openAddAnything, openMenu }), [openAddAnything, openMenu])

  return (
    <ShellContext.Provider value={ctx}>
      <div className="flex h-dvh overflow-hidden bg-background">
        <Sidebar className="hidden md:flex" />

        {/* Mobile drawer */}
        <div className={`md:hidden fixed inset-0 z-40 ${menuOpen ? '' : 'pointer-events-none'}`} aria-hidden={!menuOpen}>
          <div
            className={`absolute inset-0 bg-foreground/50 backdrop-blur-sm transition-opacity duration-200 ${menuOpen ? 'opacity-100' : 'opacity-0'}`}
            onClick={() => setMenuOpen(false)}
          />
          <Sidebar
            className={`!flex absolute left-0 top-0 bottom-0 w-[260px] max-w-[85vw] shadow-2xl transition-transform duration-200 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}
            onClose={() => setMenuOpen(false)}
          />
        </div>

        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <TopBar />
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>
      <AddAnythingModal open={add.open} seed={add.seed} onClose={() => setAdd((a) => ({ ...a, open: false }))} />
    </ShellContext.Provider>
  )
}
