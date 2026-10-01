import type { Course, GradeComponent } from '../types'

const isDone = (s: string) => s === 'completed' || s === 'graded'

function stampComponents(oldC: GradeComponent[], next: GradeComponent[], now: string): GradeComponent[] {
  let changed = false
  const out = next.map((c) => {
    const old = oldC.find((o) => o.id === c.id)
    let r = c
    if ((c.scoringMode ?? 'single') === 'single') {
      if (c.score === null) {
        if (c.scoredAt) r = { ...r, scoredAt: undefined }
      } else if (!old || old.score !== c.score) {
        r = { ...r, scoredAt: now }
      }
    } else {
      const oldScores = old?.scores ?? []
      const scores = (c.scores ?? []).map((e) => {
        const prev = oldScores.find((o) => o.id === e.id)
        return !e.createdAt && (!prev || prev.value !== e.value) ? { ...e, createdAt: now } : e
      })
      if (scores.some((e, i) => e !== c.scores[i])) r = { ...r, scores }
    }
    if (r !== c) changed = true
    return r
  })
  return changed ? out : next
}

/** Adds Timeline timestamps for real state changes between two versions of a course. */
export function stampCourse(old: Course, next: Course): Course {
  const now = new Date().toISOString()
  let out = next

  if (next.tasks !== old.tasks) {
    const tasks = next.tasks.map((t) => {
      const o = old.tasks.find((x) => x.id === t.id)
      if (!o) return t.createdAt ? t : { ...t, createdAt: now }
      if (t.completed && !o.completed) return { ...t, completedAt: now }
      if (!t.completed && o.completed && t.completedAt) return { ...t, completedAt: undefined }
      return t
    })
    if (tasks.some((t, i) => t !== next.tasks[i])) out = { ...out, tasks }
  }

  if (next.materials !== old.materials) {
    const materials = next.materials.map((m) =>
      !m.createdAt && !old.materials.some((o) => o.id === m.id) ? { ...m, createdAt: now } : m,
    )
    if (materials.some((m, i) => m !== next.materials[i])) out = { ...out, materials }
  }

  if (next.assignments !== old.assignments) {
    const oldA = old.assignments ?? []
    const assignments = (next.assignments ?? []).map((a) => {
      const o = oldA.find((x) => x.id === a.id)
      if (o && isDone(a.status) && !isDone(o.status)) return { ...a, completedAt: now }
      if (o && !isDone(a.status) && isDone(o.status) && a.completedAt) return { ...a, completedAt: undefined }
      return a
    })
    if (assignments.some((a, i) => a !== next.assignments[i])) out = { ...out, assignments }
  }

  if (next.gradeComponents !== old.gradeComponents) {
    const gradeComponents = stampComponents(old.gradeComponents, next.gradeComponents, now)
    if (gradeComponents !== next.gradeComponents) out = { ...out, gradeComponents }
  }
  return out
}
