import type { Assignment } from '../types'

type AssignmentRow = {
  id: string
  course_id: string
  semester_id: string | null
  title: string
  description: string | null
  due_date: string | null
  status: string
  priority: string | null
  type: string | null
  assessment_id: string | null
  score: number | null
  max_score: number
  notes: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
  academic_week: number | null
}

const optional = <T,>(value: T | null): T | undefined =>
  value === null ? undefined : value

async function client() {
  return (await import('./supabase')).supabase
}

function rowToAssignment(row: AssignmentRow): Assignment {
  return {
    id: row.id,
    courseId: row.course_id,
    semesterId: optional(row.semester_id),
    title: row.title,
    description: optional(row.description),
    dueDate: optional(row.due_date),
    status: row.status as Assignment['status'],
    priority: optional(row.priority) as Assignment['priority'],
    type: optional(row.type),
    assessmentId: optional(row.assessment_id),
    score: row.score === null ? undefined : Number(row.score),
    maxScore: Number(row.max_score),
    notes: optional(row.notes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: optional(row.completed_at),
    academicWeek:
      row.academic_week === null ? undefined : Number(row.academic_week),
  }
}

function assignmentToRow(assignment: Assignment) {
  return {
    id: assignment.id,
    course_id: assignment.courseId,
    semester_id: assignment.semesterId ?? null,
    title: assignment.title,
    description: assignment.description ?? null,
    due_date: assignment.dueDate ?? null,
    status: assignment.status,
    priority: assignment.priority ?? null,
    type: assignment.type ?? null,
    assessment_id: assignment.assessmentId ?? null,
    score: assignment.score ?? null,
    max_score: assignment.maxScore,
    notes: assignment.notes ?? null,
    created_at: assignment.createdAt ?? new Date().toISOString(),
    updated_at: assignment.updatedAt ?? new Date().toISOString(),
    completed_at: assignment.completedAt ?? null,
    academic_week: assignment.academicWeek ?? null,
  }
}

export async function fetchAssignments(): Promise<Assignment[]> {
  const sb = await client()
  const { data, error } = await sb
    .from('assignments')
    .select('*')
    .order('created_at')

  if (error) throw error

  return ((data ?? []) as AssignmentRow[]).map(rowToAssignment)
}

export async function saveRemoteAssignment(
  assignment: Assignment,
): Promise<void> {
  const sb = await client()
  const { error } = await sb
    .from('assignments')
    .upsert(assignmentToRow(assignment))

  if (error) throw error
}

export async function deleteRemoteAssignment(id: string): Promise<void> {
  const sb = await client()
  const { error } = await sb.from('assignments').delete().eq('id', id)

  if (error) throw error
}
