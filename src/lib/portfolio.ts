import type { PortfolioCategory, PortfolioEntry, PortfolioItem, PortfolioItemType } from '../types'

export const PORTFOLIO_TYPES: { value: PortfolioItemType; label: string }[] = [
  { value: 'project', label: 'Project' },
  { value: 'organization', label: 'Organization' },
  { value: 'volunteer', label: 'Volunteer' },
  { value: 'achievement', label: 'Achievement' },
  { value: 'competition', label: 'Competition' },
  { value: 'experience', label: 'Experience' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'other', label: 'Other' },
]

export const typeLabel = (t: PortfolioItemType) => PORTFOLIO_TYPES.find((x) => x.value === t)?.label ?? 'Other'
export const typeOrder = (t: PortfolioItemType) => PORTFOLIO_TYPES.findIndex((x) => x.value === t)

export function fmtMonth(day: string): string {
  return new Date(`${day.slice(0, 7)}-01T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

/** Returns '' when there are no dates; never invents one. */
export function dateRangeLabel(start?: string, end?: string): string {
  if (start && end) return start.slice(0, 7) === end.slice(0, 7) ? fmtMonth(start) : `${fmtMonth(start)} – ${fmtMonth(end)}`
  if (start) return `Started ${fmtMonth(start)}`
  if (end) return `Ended ${fmtMonth(end)}`
  return ''
}

const LEGACY_TYPE: Record<PortfolioCategory, PortfolioItemType> = {
  org: 'organization',
  project: 'project',
  achievement: 'achievement',
  certificate: 'achievement',
  competition: 'competition',
  volunteering: 'volunteer',
}

export function legacyCategoryToType(c: PortfolioCategory): PortfolioItemType {
  return LEGACY_TYPE[c] ?? 'other'
}

/** Legacy entries stored YYYY-MM; that month becomes startDate (day 01, displayed as month only). */
export function legacyEntryToItem(e: PortfolioEntry): PortfolioItem {
  const now = new Date().toISOString()
  return {
    id: e.id,
    title: e.title,
    type: legacyCategoryToType(e.category),
    organization: e.organization || undefined,
    role: e.role || undefined,
    description: e.description || undefined,
    startDate: /^\d{4}-\d{2}$/.test(e.date) ? `${e.date}-01` : /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? e.date : undefined,
    skills: e.skills?.length ? e.skills : undefined,
    createdAt: now,
    updatedAt: now,
  }
}
