import type { Note } from '../types'

type NoteRow = {
  id: string
  title: string | null
  content: string
  course_id: string | null
  semester_id: string | null
  week: number | null
  related_task_id: string | null
  related_assessment_id: string | null
  created_at: string
}

const optional = <T,>(value: T | null): T | undefined =>
  value === null ? undefined : value

async function client() {
  return (await import('./supabase')).supabase
}

function rowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: optional(row.title),
    content: row.content,
    courseId: optional(row.course_id),
    semesterId: optional(row.semester_id),
    week: row.week === null ? undefined : Number(row.week),
    relatedTaskId: optional(row.related_task_id),
    relatedAssessmentId: optional(row.related_assessment_id),
    createdAt: row.created_at,
  }
}

function noteToRow(note: Note) {
  return {
    id: note.id,
    title: note.title ?? null,
    content: note.content,
    course_id: note.courseId ?? null,
    semester_id: note.semesterId ?? null,
    week: note.week ?? null,
    related_task_id: note.relatedTaskId ?? null,
    related_assessment_id: note.relatedAssessmentId ?? null,
    created_at: note.createdAt,
  }
}

export async function fetchNotes(): Promise<Note[]> {
  const sb = await client()
  const { data, error } = await sb
    .from('notes')
    .select('*')
    .order('created_at')

  if (error) throw error

  return ((data ?? []) as NoteRow[]).map(rowToNote)
}

export async function saveRemoteNote(note: Note): Promise<void> {
  const sb = await client()
  const { error } = await sb.from('notes').upsert(noteToRow(note))

  if (error) throw error
}

export async function deleteRemoteNote(id: string): Promise<void> {
  const sb = await client()
  const { error } = await sb.from('notes').delete().eq('id', id)

  if (error) throw error
}
