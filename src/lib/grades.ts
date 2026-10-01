import type { Course, GradeComponent, GradingScale, AggregationMethod } from '../types'

/** Compute the effective scalar score from a component (handles single and multi-score modes). */
export function effectiveScore(comp: GradeComponent): number | null {
  const mode = comp.scoringMode ?? 'single'
  if (mode === 'single') return comp.score
  const entries = comp.scores ?? []
  if (entries.length === 0) return null
  const vals = entries.map((s) => s.value)
  const agg: AggregationMethod = comp.aggregation ?? 'average'
  switch (agg) {
    case 'average':
      return vals.reduce((a, b) => a + b, 0) / vals.length
    case 'sum':
      return vals.reduce((a, b) => a + b, 0)
    case 'best':
      return Math.max(...vals)
    case 'weighted':
      return vals.reduce((a, b) => a + b, 0) / vals.length
    default:
      return vals.reduce((a, b) => a + b, 0) / vals.length
  }
}

export function contribution(comp: GradeComponent): number {
  const score = effectiveScore(comp)
  if (score === null) return 0
  return (score / comp.maxScore) * comp.weight
}

export function completedWeight(course: Course): number {
  return course.gradeComponents
    .filter((c) => !c.isBonus && effectiveScore(c) !== null)
    .reduce((acc, c) => acc + c.weight, 0)
}

export function remainingWeight(course: Course): number {
  return course.gradeComponents
    .filter((c) => !c.isBonus && effectiveScore(c) === null)
    .reduce((acc, c) => acc + c.weight, 0)
}

export function totalRegularWeight(course: Course): number {
  return course.gradeComponents
    .filter((c) => !c.isBonus)
    .reduce((acc, c) => acc + c.weight, 0)
}

/** Current score normalized over completed weight only. Incomplete = not zero. */
export function currentWeightedScore(course: Course): number | null {
  const completed = completedWeight(course)
  if (completed === 0) return null
  const totalContrib = course.gradeComponents
    .filter((c) => !c.isBonus && effectiveScore(c) !== null)
    .reduce((acc, c) => acc + contribution(c), 0)
  return (totalContrib / completed) * 100
}

export function bonusContribution(course: Course): number {
  return course.gradeComponents
    .filter((c) => c.isBonus && effectiveScore(c) !== null)
    .reduce((acc, c) => acc + contribution(c), 0)
}

/** Final score (only when ALL non-bonus components have scores). */
export function finalScore(course: Course): number | null {
  const regular = course.gradeComponents.filter((c) => !c.isBonus)
  if (regular.length === 0) return null
  if (!regular.every((c) => effectiveScore(c) !== null)) return null
  const totalContrib = regular.reduce((acc, c) => acc + contribution(c), 0)
  return totalContrib + bonusContribution(course)
}

/** Projected final using assumption score for incomplete components. */
export function projectedFinal(course: Course, assumption = 75): number {
  const regular = course.gradeComponents.filter((c) => !c.isBonus)
  const totalContrib = regular.reduce((acc, c) => {
    const score = effectiveScore(c)
    if (score !== null) return acc + contribution(c)
    return acc + (assumption / c.maxScore) * c.weight
  }, 0)
  return totalContrib + bonusContribution(course)
}

export function letterGrade(score: number, scale: GradingScale): string {
  const sorted = [...scale.grades].sort((a, b) => b.minScore - a.minScore)
  for (const g of sorted) {
    if (score >= g.minScore) return g.letter
  }
  return 'F'
}

export function gradePointForLetter(letter: string, scale: GradingScale): number {
  return scale.grades.find((g) => g.letter === letter)?.point ?? 0
}

export function scoreToGradePoint(score: number, scale: GradingScale): number {
  return gradePointForLetter(letterGrade(score, scale), scale)
}

/** Resolves the GPA point value for a single course — numeric finalScore takes precedence. */
function courseGradePoint(c: Course, scale: GradingScale): number | null {
  const score = finalScore(c)
  if (score !== null) return scoreToGradePoint(score, scale)
  if (c.courseLetterGrade) return gradePointForLetter(c.courseLetterGrade, scale)
  return null
}

export function semesterGPA(courses: Course[], scale: GradingScale): number | null {
  let totalPoints = 0
  let totalSKS = 0
  for (const c of courses) {
    const point = courseGradePoint(c, scale)
    if (point !== null) {
      totalPoints += point * c.sks
      totalSKS += c.sks
    }
  }
  return totalSKS > 0 ? totalPoints / totalSKS : null
}

export function cumulativeGPA(
  semesters: { courses: Course[] }[],
  scale: GradingScale,
): number | null {
  let totalPoints = 0
  let totalSKS = 0
  for (const sem of semesters) {
    for (const c of sem.courses) {
      const point = courseGradePoint(c, scale)
      if (point !== null) {
        totalPoints += point * c.sks
        totalSKS += c.sks
      }
    }
  }
  return totalSKS > 0 ? totalPoints / totalSKS : null
}

export function formatGPA(gpa: number | null): string {
  return gpa === null ? '—' : gpa.toFixed(2)
}

export function formatScore(score: number | null): string {
  return score === null ? '—' : score.toFixed(1)
}
