import type { MaterialType } from '../types'

export const MATERIAL_TYPE_OPTIONS: { value: MaterialType; label: string }[] = [
  { value: 'lecture', label: 'Lecture Slides' },
  { value: 'reading', label: 'Reading' },
  { value: 'video', label: 'Video' },
  { value: 'lab', label: 'Lab Sheet' },
  { value: 'other', label: 'Other' },
]

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  lecture: 'Lecture',
  reading: 'Reading',
  video: 'Video',
  lab: 'Lab',
  other: 'Other',
}
