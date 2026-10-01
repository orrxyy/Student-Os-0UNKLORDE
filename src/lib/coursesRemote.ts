import type { Course, GradeComponent, CourseStatus } from '../types'

type Row = Record<string, unknown>

async function client() {
  return (await import('./supabase')).supabase
}

const n = <T,>(v: T | null | undefined) => (v === undefined ? null : v)

export function courseToRow(c: Course): Row {
  return {
    id: c.id, semester_id: c.semesterId, code: c.code, name: c.name, sks: c.sks,
    lecturer: n(c.lecturer), room: n(c.room), schedule: n(c.schedule), description: n(c.description),
    notes: n(c.notes), status: c.status, course_letter_grade: n(c.courseLetterGrade),
    updated_at: new Date().toISOString(),
  }
}

export function componentToRow(g: GradeComponent, courseId: string): Row {
  return {
    id: g.id, course_id: courseId, name: g.name, weight: g.weight, max_score: g.maxScore, score: n(g.score),
    scores: g.scores ?? [], scoring_mode: g.scoringMode, aggregation: g.aggregation, is_bonus: g.isBonus,
    sort_order: g.order, notes: n(g.notes), scored_at: n(g.scoredAt), academic_week: n(g.academicWeek),
    updated_at: new Date().toISOString(),
  }
}

const u = <T,>(v: T | null): T | undefined => (v === null ? undefined : v)

export function rowToComponent(r: Row): GradeComponent {
  return {
    id: r.id as string, name: r.name as string, weight: Number(r.weight), maxScore: Number(r.max_score),
    score: r.score === null ? null : Number(r.score), scores: (r.scores as GradeComponent['scores']) ?? [],
    scoringMode: r.scoring_mode as GradeComponent['scoringMode'], aggregation: r.aggregation as GradeComponent['aggregation'],
    isBonus: !!r.is_bonus, order: Number(r.sort_order), notes: u(r.notes as string | null),
    scoredAt: u(r.scored_at as string | null), academicWeek: u(r.academic_week as number | null),
  }
}

/** Fields Supabase owns for a course. Placement (semester) and nested data stay local. */
export type RemoteCourse = Pick<Course, 'id' | 'code' | 'name' | 'sks' | 'lecturer' | 'room' | 'schedule' | 'description' | 'notes' | 'status' | 'courseLetterGrade' | 'gradeComponents'>

export async function pullCourses(): Promise<RemoteCourse[]> {
  const sb = await client()
  const [cs, gs] = await Promise.all([sb.from('courses').select('*'), sb.from('grade_components').select('*')])
  if (cs.error) throw cs.error
  if (gs.error) throw gs.error
  const byCourse = new Map<string, GradeComponent[]>()
  for (const g of gs.data as Row[]) {
    const list = byCourse.get(g.course_id as string) ?? []
    list.push(rowToComponent(g))
    byCourse.set(g.course_id as string, list)
  }
  return (cs.data as Row[]).map((r) => ({
    id: r.id as string, code: r.code as string, name: r.name as string, sks: Number(r.sks),
    lecturer: u(r.lecturer as string | null), room: u(r.room as string | null), schedule: u(r.schedule as string | null),
    description: u(r.description as string | null), notes: u(r.notes as string | null),
    status: r.status as CourseStatus, courseLetterGrade: u(r.course_letter_grade as string | null),
    gradeComponents: (byCourse.get(r.id as string) ?? []).sort((a, b) => a.order - b.order),
  }))
}

export async function pushCourse(c: Course): Promise<void> {
  const sb = await client()
  const up = await sb.from('courses').upsert(courseToRow(c))
  if (up.error) throw up.error
  const keep = c.gradeComponents.map((g) => g.id)
  const del = sb.from('grade_components').delete().eq('course_id', c.id)
  const d = keep.length ? await del.not('id', 'in', `(${keep.map((k) => `"${k}"`).join(',')})`) : await del
  if (d.error) throw d.error
  if (keep.length) {
    const g = await sb.from('grade_components').upsert(c.gradeComponents.map((x) => componentToRow(x, c.id)))
    if (g.error) throw g.error
  }
}

export async function deleteRemoteCourse(id: string): Promise<void> {
  const sb = await client()
  const r = await sb.from('courses').delete().eq('id', id)
  if (r.error) throw r.error
}

/** Stable fingerprint of what Supabase owns, used to detect changes. */
export function courseSig(c: Course): string {
  const { updated_at: _a, ...row } = courseToRow(c)
  return JSON.stringify([row, c.gradeComponents.map((g) => { const { updated_at: _b, ...r } = componentToRow(g, c.id); return r })])
}
