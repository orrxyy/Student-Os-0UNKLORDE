import type { CertificateCategory } from '../types'

export const CERTIFICATE_CATEGORIES: { value: CertificateCategory; label: string }[] = [
  { value: 'academic', label: 'Academic' },
  { value: 'organization', label: 'Organization' },
  { value: 'competition', label: 'Competition' },
  { value: 'volunteer', label: 'Volunteer' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'seminar', label: 'Seminar' },
  { value: 'course', label: 'Course' },
  { value: 'certification', label: 'Certification' },
  { value: 'other', label: 'Other' },
]

export const categoryLabel = (c?: CertificateCategory) => CERTIFICATE_CATEGORIES.find((x) => x.value === c)?.label

export function fmtDay(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

export function todayKey(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now)
}

/** Only certificates with an expiry date get a status. */
export function expiryStatus(expiryDate: string | undefined, today = todayKey()): 'expired' | 'valid' | null {
  if (!expiryDate) return null
  return expiryDate < today ? 'expired' : 'valid'
}

export function isValidUrl(v: string): boolean {
  try {
    const u = new URL(v)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}
