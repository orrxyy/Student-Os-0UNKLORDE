import { createElement, createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'

import { resolveSemesterArtwork } from '../data/artwork'
import type { ArtTheme } from '../data/artwork'
import { useStore } from './store'

export type Theme = ArtTheme

interface ThemeContextType {
  theme: Theme
  setTheme: (t: Theme) => void
  /** Hero banner artwork for the active semester + theme. */
  heroArtwork: string
  artworks: string[]
  artworkIndex: number
  currentArtwork: string
  nextArtwork: () => void
  prevArtwork: () => void
  autoCarousel: boolean
  setAutoCarousel: (v: boolean) => void
  pauseCarousel: () => void
  resumeCarousel: () => void
  motionEnabled: boolean
  setMotionEnabled: (v: boolean) => void
}

const ThemeCtx = createContext<ThemeContextType | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('sos-theme') as Theme) ?? 'light'
  })
  const { state } = useStore()
  const semesterId = state.activeSemesterId
  const [artworkIndex, setArtworkIndex] = useState(0)
  const [autoCarousel, setAutoCarouselState] = useState(true)
  const [paused, setPaused] = useState(false)
  const [motionEnabled, setMotionEnabledState] = useState(true)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('sos-theme', theme)
  }, [theme])

  const { hero: heroArtwork, carousel: artworks } = useMemo(
    () => resolveSemesterArtwork(semesterId, theme),
    [semesterId, theme],
  )

  useEffect(() => {
    setArtworkIndex(0)
  }, [theme, semesterId])

  const currentArtwork = artworks[artworkIndex % artworks.length]
  const count = artworks.length

  const nextArtwork = useCallback(() => {
    setArtworkIndex((i) => (i + 1) % count)
  }, [count])

  const prevArtwork = useCallback(() => {
    setArtworkIndex((i) => (i - 1 + count) % count)
  }, [count])

  useEffect(() => {
    if (!autoCarousel || paused) return
    const id = setInterval(nextArtwork, 5000)
    return () => clearInterval(id)
  }, [autoCarousel, paused, nextArtwork])

  function setTheme(t: Theme) {
    document.documentElement.classList.add('theme-switching')
    setThemeState(t)
    setTimeout(() => document.documentElement.classList.remove('theme-switching'), 280)
  }
  function setAutoCarousel(v: boolean) { setAutoCarouselState(v) }
  function setMotionEnabled(v: boolean) { setMotionEnabledState(v) }
  const pauseCarousel = useCallback(() => setPaused(true), [])
  const resumeCarousel = useCallback(() => setPaused(false), [])

  const value: ThemeContextType = {
    theme, setTheme,
    heroArtwork, artworks, artworkIndex, currentArtwork,
    nextArtwork, prevArtwork,
    autoCarousel, setAutoCarousel,
    pauseCarousel, resumeCarousel,
    motionEnabled, setMotionEnabled,
  }

  return createElement(ThemeCtx.Provider, { value, children })
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeCtx)
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider')
  return ctx
}
