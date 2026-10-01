export interface AcademicMilestone {
  id: string
  title: string
  /** Human readable range shown on the milestone. */
  label: string
  kind: 'midterm' | 'final'
}

export interface AcademicWeek {
  id: string
  semesterId: string
  number: number
  /** YYYY-MM-DD (Asia/Jakarta), first day of the academic week. */
  start: string
  /** YYYY-MM-DD, last day. May span more than one calendar week (UTS / UAS). */
  end: string
  label?: string
  milestones?: AcademicMilestone[]
}

type Range = [start: string, end: string]

function buildSemester(semesterId: string, ranges: Range[], extra: Record<number, Partial<AcademicWeek>> = {}): AcademicWeek[] {
  return ranges.map(([start, end], i) => ({
    id: `${semesterId}_w${i + 1}`,
    semesterId,
    number: i + 1,
    start,
    end,
    ...extra[i + 1],
  }))
}

// Exactly 16 academic weeks per configured semester. Weeks 8 (UTS) and 16 (UAS) each span two calendar weeks.
// Add other semesters here once their official dates are known; unconfigured semesters show no timeline.
const Y1S1: Range[] = [
  ['2026-08-17', '2026-08-21'],
  ['2026-08-24', '2026-08-28'],
  ['2026-08-31', '2026-09-04'],
  ['2026-09-07', '2026-09-11'],
  ['2026-09-14', '2026-09-18'],
  ['2026-09-21', '2026-09-25'],
  ['2026-09-28', '2026-10-02'],
  ['2026-10-05', '2026-10-16'],
  ['2026-10-19', '2026-10-23'],
  ['2026-10-26', '2026-10-30'],
  ['2026-11-02', '2026-11-06'],
  ['2026-11-09', '2026-11-13'],
  ['2026-11-16', '2026-11-20'],
  ['2026-11-23', '2026-11-27'],
  ['2026-11-30', '2026-12-04'],
  ['2026-12-07', '2026-12-18'],
]

export const ACADEMIC_WEEKS: AcademicWeek[] = [
  ...buildSemester('sem_y1s1', Y1S1, {
    8: {
      label: 'UTS / Midterm Period',
      milestones: [{ id: 'uts_y1s1', title: 'UTS / Midterm', label: 'October 5–16, 2026', kind: 'midterm' }],
    },
    16: {
      label: 'UAS / Final Exam Period',
      milestones: [{ id: 'uas_y1s1', title: 'UAS / Final Exam', label: 'December 7–18, 2026', kind: 'final' }],
    },
  }),
]

export const weeksForSemester = (semesterId: string) =>
  ACADEMIC_WEEKS.filter((x) => x.semesterId === semesterId).sort((a, b) => a.number - b.number)

export const isSemesterConfigured = (semesterId: string) => weeksForSemester(semesterId).length > 0
