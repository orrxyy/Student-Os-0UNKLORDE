import shuMagic from '../assets/ref5.png'
import shuField from '../assets/ref4.png'
import shuGlasses from '../assets/reference.png'
import swElegant from '../assets/ref2.png'
import swCyber from '../assets/ref3.png'
import swGaming from '../assets/ref6.png'

export type ArtTheme = 'light' | 'dark'

/** Artwork for one semester. Anything omitted falls back to DEFAULT_ARTWORK. */
export interface SemesterArtworkConfig {
  semesterId: string
  lightArtwork: string
  darkArtwork: string
  carouselArtwork?: { light?: string[]; dark?: string[] }
}

export const DEFAULT_ARTWORK: Omit<SemesterArtworkConfig, 'semesterId'> & {
  carouselArtwork: { light: string[]; dark: string[] }
} = {
  lightArtwork: shuField,
  darkArtwork: swGaming,
  carouselArtwork: {
    light: [shuMagic, shuField, shuGlasses],
    dark: [swElegant, swCyber, swGaming],
  },
}

/**
 * Per-semester overrides. Add an entry here to give a semester its own
 * hero + carousel; semesters without an entry use DEFAULT_ARTWORK.
 */
export const SEMESTER_ARTWORK: SemesterArtworkConfig[] = [
  {
    semesterId: 'sem_y1s1',
    lightArtwork: shuField,
    darkArtwork: swGaming,
    carouselArtwork: {
      light: [shuMagic, shuField, shuGlasses],
      dark: [swElegant, swCyber, swGaming],
    },
  },
  {
    semesterId: 'sem_y1s2',
    lightArtwork: shuMagic,
    darkArtwork: swElegant,
    carouselArtwork: {
      light: [shuMagic, shuGlasses, shuField],
      dark: [swElegant, swGaming, swCyber],
    },
  },
  {
    semesterId: 'sem_y2s1',
    lightArtwork: shuGlasses,
    darkArtwork: swCyber,
    carouselArtwork: {
      light: [shuGlasses, shuField, shuMagic],
      dark: [swCyber, swElegant, swGaming],
    },
  },
]

const HERO_FOCUS = new Map<string, string>([
  [shuField, 'object-[center_35%]'],
  [swGaming, 'object-[center_30%]'],
  [shuMagic, 'object-[center_30%]'],
  [shuGlasses, 'object-[center_30%]'],
  [swElegant, 'object-[center_25%]'],
  [swCyber, 'object-[center_50%]'],
])

export function heroFocusClass(src: string): string {
  return HERO_FOCUS.get(src) ?? 'object-center'
}

export function resolveSemesterArtwork(
  semesterId: string | undefined,
  theme: ArtTheme,
): { hero: string; carousel: string[] } {
  const cfg = SEMESTER_ARTWORK.find((c) => c.semesterId === semesterId)
  const heroKey = theme === 'dark' ? 'darkArtwork' : 'lightArtwork'
  const hero = cfg?.[heroKey] || DEFAULT_ARTWORK[heroKey]
  const custom = cfg?.carouselArtwork?.[theme]?.filter(Boolean)
  const carousel = custom && custom.length > 0 ? custom : DEFAULT_ARTWORK.carouselArtwork[theme]
  return { hero, carousel }
}
