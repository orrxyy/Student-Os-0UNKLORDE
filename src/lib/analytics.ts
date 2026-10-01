import type { AppState, Course, GradingScale } from '../types'
import {
  completedWeight,
  currentWeightedScore,
  effectiveScore,
  finalScore,
  gradePointForLetter,
  letterGrade,
  totalRegularWeight,
  bonusContribution,
  contribution,
} from './grades'
import { getActiveCourses, getAllSemesters } from './selectors'

/** Final letter + grade point for a course, only when it truly has a final grade. */
export function courseFinalGrade(
  c: Course,
  scale: GradingScale,
): { letter: string; point: number; score: number | null } | null {
  const score = finalScore(c)
  if (score !== null) {
    const letter = letterGrade(score, scale)
    return { letter, point: gradePointForLetter(letter, scale), score }
  }
  if (c.courseLetterGrade) {
    return { letter: c.courseLetterGrade, point: gradePointForLetter(c.courseLetterGrade, scale), score: null }
  }
  return null
}

function weightedGPA(courses: Course[], scale: GradingScale) {
  let pts = 0
  let sks = 0
  let n = 0
  for (const c of courses) {
    const g = courseFinalGrade(c, scale)
    if (!g) continue
    pts += g.point * c.sks
    sks += c.sks
    n++
  }
  return { gpa: sks > 0 ? pts / sks : null, gradedSKS: sks, gradedCourses: n }
}

export interface SemesterSummary {
  gpa: number | null
  totalSKS: number
  gradedSKS: number
  courseCount: number
  coursesCounted: number
  provisional: boolean
}

/** Active-semester, active-status courses only. */
export function getSemesterSummary(state: AppState): SemesterSummary {
  const courses = getActiveCourses(state)
  const { gpa, gradedSKS, gradedCourses } = weightedGPA(courses, state.gradingScale)
  return {
    gpa,
    totalSKS: courses.reduce((a, c) => a + c.sks, 0),
    gradedSKS,
    courseCount: courses.length,
    coursesCounted: gradedCourses,
    provisional: gpa !== null && gradedCourses < courses.length,
  }
}

export interface CumulativeSummary {
  gpa: number | null
  gradedSKS: number
  gradedCourses: number
}

/** SKS-weighted over every graded course in every semester (not a mean of semester GPAs). */
export function getCumulativeSummary(state: AppState): CumulativeSummary {
  const all = getAllSemesters(state).flatMap((s) => s.courses.filter((c) => c.status !== 'planned'))
  return weightedGPA(all, state.gradingScale)
}

export function getGradeDistribution(state: AppState): { letter: string; count: number }[] {
  const counts = new Map<string, number>(state.gradingScale.grades.map((g) => [g.letter, 0]))
  for (const c of getActiveCourses(state)) {
    const g = courseFinalGrade(c, state.gradingScale)
    if (g) counts.set(g.letter, (counts.get(g.letter) ?? 0) + 1)
  }
  return [...counts].map(([letter, count]) => ({ letter, count }))
}

export interface AssessmentProgressItem {
  id: string
  name: string
  weight: number
  score: number | null
  isBonus: boolean
}

export interface CoursePerformance {
  course: Course
  currentScore: number | null
  completedPct: number
  remainingPct: number
  currentLetter: string | null
  projectedFinal: number | null
  projectedLetter: string | null
  isFinal: boolean
  hasGrade: boolean
  assessments: AssessmentProgressItem[]
  gradedCount: number
  totalCount: number
}

export function getCoursePerformance(course: Course, scale: GradingScale): CoursePerformance {
  const total = totalRegularWeight(course)
  const done = completedWeight(course)
  const completedPct = total > 0 ? (done / total) * 100 : 0
  const current = currentWeightedScore(course)
  const final = finalScore(course)
  const fg = courseFinalGrade(course, scale)
  const regular = course.gradeComponents.filter((c) => !c.isBonus)
  // Projection assumes remaining work scores at the current average.
  const projected = final ?? (current !== null ? current : null)
  const shown = final ?? current
  return {
    course,
    currentScore: current,
    completedPct,
    remainingPct: total > 0 ? 100 - completedPct : 0,
    currentLetter: fg?.letter ?? (shown !== null ? letterGrade(shown, scale) : null),
    projectedFinal: projected,
    projectedLetter: projected !== null ? letterGrade(projected, scale) : null,
    isFinal: final !== null || !!course.courseLetterGrade,
    hasGrade: fg !== null,
    assessments: [...course.gradeComponents]
      .sort((a, b) => a.order - b.order)
      .map((c) => ({
        id: c.id,
        name: c.name,
        weight: c.weight,
        score: effectiveScore(c),
        isBonus: c.isBonus,
      })),
    gradedCount: regular.filter((c) => effectiveScore(c) !== null).length,
    totalCount: regular.length,
  }
}

export type TargetStatus = 'reached' | 'possible' | 'impossible' | 'no-data'

export interface TargetResult {
  status: TargetStatus
  targetMin: number
  currentScore: number | null
  completedWeight: number
  remainingWeight: number
  /** Average % needed across remaining assessments. */
  requiredAverage: number | null
  secured: number
}

/** Pure computation. Never touches the store. */
export function simulateTarget(course: Course, targetLetter: string, scale: GradingScale): TargetResult | null {
  const entry = scale.grades.find((g) => g.letter === targetLetter)
  if (!entry) return null
  const regular = course.gradeComponents.filter((c) => !c.isBonus)
  const secured =
    regular.reduce((a, c) => a + (effectiveScore(c) !== null ? contribution(c) : 0), 0) +
    bonusContribution(course)
  const remaining = regular.filter((c) => effectiveScore(c) === null).reduce((a, c) => a + c.weight, 0)
  const base = {
    targetMin: entry.minScore,
    currentScore: currentWeightedScore(course),
    completedWeight: completedWeight(course),
    remainingWeight: remaining,
    secured,
  }
  if (regular.length === 0) return { ...base, status: 'no-data', requiredAverage: null }
  if (secured >= entry.minScore) return { ...base, status: 'reached', requiredAverage: 0 }
  if (remaining <= 0) return { ...base, status: 'impossible', requiredAverage: null }
  const req = ((entry.minScore - secured) / remaining) * 100
  return { ...base, status: req > 100 ? 'impossible' : 'possible', requiredAverage: req }
}
