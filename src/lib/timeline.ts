import type { AppState, Course } from '../types'
import { weeksForSemester, type AcademicWeek, type AcademicMilestone } from '../data/academicWeeks'

export type ActivityType = 'grade' | 'assignment' | 'task' | 'submission' | 'material' | 'note' | 'exam'

export interface ActivityEvent {
  id: string
  semesterId: string
  /** ISO timestamp (or YYYY-MM-DD for milestones). */
  timestamp: string
  type: ActivityType
  title: string
  description?: string
  courseId?: string
  entityType?: string
  entityId?: string
  /** Score-entry id for multi-score grades. */
  subId?: string
  /** Explicit academic week; overrides date-based placement. */
  week?: number
  /** Where the original entity lives. */
  href?: string
}

const TZ = 'Asia/Jakarta'

/** YYYY-MM-DD in Jakarta time. */
export function dayKey(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ })
}

/** Activity derived from stored entities; nothing is persisted or duplicated. */
export function getSemesterActivity(state: AppState, semesterId: string): ActivityEvent[] {
  const sem = state.academicYears.flatMap((y) => y.semesters).find((s) => s.id === semesterId)
  if (!sem) return []
  const out: ActivityEvent[] = []
  const push = (e: Omit<ActivityEvent, 'semesterId'>) => out.push({ ...e, semesterId })
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, ''))

  for (const c of sem.courses) {
    const cid = c.id
    const base = `/course/${cid}`
    for (const comp of c.gradeComponents) {
      if ((comp.scoringMode ?? 'single') === 'single') {
        if (comp.score !== null && comp.scoredAt)
          push({ id: `grade:${comp.id}`, timestamp: comp.scoredAt, type: 'grade', title: `${comp.name} scored ${fmt(comp.score)}`, courseId: cid, entityType: 'assessment', entityId: comp.id, week: comp.academicWeek, href: `${base}?tab=grades` })
      } else {
        for (const e of comp.scores ?? [])
          if (e.createdAt)
            push({ id: `grade:${comp.id}:${e.id}`, timestamp: e.createdAt, type: 'grade', title: `${e.label || comp.name} scored ${fmt(e.value)}`, description: e.label ? comp.name : undefined, courseId: cid, entityType: 'assessment', entityId: comp.id, subId: e.id, week: e.academicWeek, href: `${base}?tab=grades` })
      }
    }
    for (const a of c.assignments ?? []) {
      const href = `${base}?tab=assignments`
      if (a.createdAt) push({ id: `assignment:${a.id}`, timestamp: a.createdAt, type: 'assignment', title: `Assignment added — ${a.title}`, courseId: cid, entityType: 'assignment', entityId: a.id, week: a.academicWeek, href })
      if ((a.status === 'completed' || a.status === 'graded') && a.completedAt)
        push({ id: `assignment-done:${a.id}`, timestamp: a.completedAt, type: 'assignment', title: `Assignment completed — ${a.title}`, courseId: cid, entityType: 'assignment', entityId: a.id, week: a.academicWeek, href })
    }
    for (const t of c.tasks) {
      // Assignment-linked tasks are already represented by their assignment.
      if (t.assignmentId) continue
      const href = `/tasks?task=${t.id}`
      if (t.createdAt) push({ id: `task:${t.id}`, timestamp: t.createdAt, type: 'task', title: `Task added — ${t.title}`, courseId: cid, entityType: 'task', entityId: t.id, week: t.academicWeek, href })
      if (t.completed && t.completedAt) push({ id: `task-done:${t.id}`, timestamp: t.completedAt, type: 'task', title: `Task completed — ${t.title}`, courseId: cid, entityType: 'task', entityId: t.id, week: t.academicWeek, href })
    }
    for (const m of c.materials)
      if (m.createdAt) push({ id: `material:${m.id}`, timestamp: m.createdAt, type: 'material', title: `Material added — ${m.title || m.topic}`, courseId: cid, entityType: 'material', entityId: m.id, week: m.academicWeek, href: `${base}?tab=materials` })
  }

  for (const t of state.globalTasks) {
    if (t.semesterId !== semesterId || t.assignmentId) continue
    if (t.createdAt) push({ id: `task:${t.id}`, timestamp: t.createdAt, type: 'task', title: `Task added — ${t.title}`, entityType: 'task', entityId: t.id, week: t.academicWeek, href: `/tasks?task=${t.id}` })
    if (t.completed && t.completedAt) push({ id: `task-done:${t.id}`, timestamp: t.completedAt, type: 'task', title: `Task completed — ${t.title}`, entityType: 'task', entityId: t.id, week: t.academicWeek, href: `/tasks?task=${t.id}` })
  }

  const courseIds = new Set(sem.courses.map((c) => c.id))
  const asgTitle = new Map<string, string>()
  const asgWeek = new Map<string, number | undefined>()
  sem.courses.forEach((c) => (c.assignments ?? []).forEach((a) => { asgTitle.set(a.id, a.title); asgWeek.set(a.id, a.academicWeek) }))
  for (const s of state.submissions) {
    if (s.status !== 'submitted' || !s.submittedAt || !courseIds.has(s.courseId)) continue
    push({ id: `submission:${s.id}`, timestamp: s.submittedAt, type: 'submission', title: `Assignment submitted — ${asgTitle.get(s.assignmentId) ?? 'Assignment'}`, courseId: s.courseId, entityType: 'submission', entityId: s.id, subId: s.assignmentId, week: asgWeek.get(s.assignmentId), href: `/course/${s.courseId}?tab=assignments` })
  }

  for (const n of state.notes) {
    if (n.semesterId !== semesterId) continue
    const label = n.title?.trim() || n.content.trim().split('\n')[0].slice(0, 48)
    push({ id: `note:${n.id}`, timestamp: n.createdAt, type: 'note', title: `Note added — ${label}`, courseId: n.courseId, entityType: 'note', entityId: n.id, week: n.week, href: n.courseId ? `/course/${n.courseId}?tab=notes` : undefined })
  }

  return out.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

export interface TimelineWeek {
  week: AcademicWeek
  isCurrent: boolean
  events: ActivityEvent[]
  milestones: AcademicMilestone[]
  /** Real activity only (excludes milestones). */
  activityCount: number
}

export function getTimelineWeeks(state: AppState, semesterId: string, now = new Date()): TimelineWeek[] | null {
  const weeks = weeksForSemester(semesterId)
  if (weeks.length === 0) return null
  const today = dayKey(now.toISOString())
  const activity = getSemesterActivity(state, semesterId)
  // Week i covers [start_i, start_{i+1}); the last week covers through its end date.
  const bucket = (day: string): number => {
    for (let i = weeks.length - 1; i >= 0; i--) if (day >= weeks[i].start) return i
    return -1
  }
  const buckets: ActivityEvent[][] = weeks.map(() => [])
  for (const e of activity) {
    const forced = e.week ? weeks.findIndex((w) => w.number === e.week) : -1
    const i = forced >= 0 ? forced : bucket(dayKey(e.timestamp))
    if (i >= 0) buckets[i].push(e)
  }
  const currentIdx = today > weeks[weeks.length - 1].end ? -1 : bucket(today)
  return weeks.map((week, i) => {
    const milestones = week.milestones ?? []
    const events = [
      ...buckets[i],
      ...milestones.map<ActivityEvent>((m) => ({ id: `exam:${m.id}`, semesterId, timestamp: week.start, type: 'exam', title: m.title, description: m.label })),
    ].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    return { week, isCurrent: i === currentIdx, events, milestones, activityCount: buckets[i].length }
  })
}

export function getRecentActivity(state: AppState, semesterId: string, limit = 4): ActivityEvent[] {
  return getSemesterActivity(state, semesterId).slice(0, limit)
}

export function courseOf(state: AppState, courseId?: string): Course | undefined {
  if (!courseId) return undefined
  for (const y of state.academicYears) for (const s of y.semesters) for (const c of s.courses) if (c.id === courseId) return c
}
