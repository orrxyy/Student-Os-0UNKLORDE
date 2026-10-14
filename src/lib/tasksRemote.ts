import type { Task } from '../types'

type TaskRow = {
  id: string
  course_id: string | null
  semester_id: string | null
  title: string
  description: string | null
  type: string | null
  assessment_id: string | null
  assignment_id: string | null
  difficulty: string | null
  due_date: string | null
  completed: boolean
  priority: string
  notes: string | null
  created_at: string
  completed_at: string | null
  academic_week: number | null
}

const optional = <T,>(value: T | null): T | undefined =>
  value === null ? undefined : value

async function client() {
  return (await import('./supabase')).supabase
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    courseId: optional(row.course_id),
    semesterId: optional(row.semester_id),
    title: row.title,
    description: optional(row.description),
    type: optional(row.type),
    assessmentId: optional(row.assessment_id),
    assignmentId: optional(row.assignment_id),
    difficulty: optional(row.difficulty) as Task['difficulty'],
    dueDate: optional(row.due_date),
    completed: row.completed,
    priority: row.priority as Task['priority'],
    notes: optional(row.notes),
    createdAt: row.created_at,
    completedAt: optional(row.completed_at),
    academicWeek:
      row.academic_week === null ? undefined : Number(row.academic_week),
  }
}

function taskToRow(task: Task) {
  return {
    id: task.id,
    course_id: task.courseId ?? null,
    semester_id: task.semesterId ?? null,
    title: task.title,
    description: task.description ?? null,
    type: task.type ?? null,
    assessment_id: task.assessmentId ?? null,
    assignment_id: task.assignmentId ?? null,
    difficulty: task.difficulty ?? null,
    due_date: task.dueDate ?? null,
    completed: task.completed,
    priority: task.priority,
    notes: task.notes ?? null,
    created_at: task.createdAt ?? new Date().toISOString(),
    completed_at: task.completedAt ?? null,
    academic_week: task.academicWeek ?? null,
  }
}

export async function fetchTasks(): Promise<Task[]> {
  const sb = await client()
  const { data, error } = await sb
    .from('tasks')
    .select('*')
    .order('created_at')

  if (error) throw error

  return ((data ?? []) as TaskRow[]).map(rowToTask)
}

export async function saveRemoteTask(task: Task): Promise<void> {
  const sb = await client()
  const { error } = await sb.from('tasks').upsert(taskToRow(task))

  if (error) throw error
}

export async function deleteRemoteTask(id: string): Promise<void> {
  const sb = await client()
  const { error } = await sb.from('tasks').delete().eq('id', id)

  if (error) throw error
}
