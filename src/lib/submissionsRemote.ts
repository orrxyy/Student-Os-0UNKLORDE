import type { Submission } from '../types'

type SubmissionRow = {
  id: string
  assignment_id: string
  course_id: string
  semester_id: string | null
  status: string
  submitted_at: string | null
  note: string | null
  created_at: string
  updated_at: string
}

const optional = <T,>(value: T | null): T | undefined =>
  value === null ? undefined : value

async function client() {
  return (await import('./supabase')).supabase
}

function rowToSubmission(row: SubmissionRow): Submission {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    courseId: row.course_id,
    semesterId: optional(row.semester_id),
    status: row.status as Submission['status'],
    submittedAt: optional(row.submitted_at),
    note: optional(row.note),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function submissionToRow(submission: Submission) {
  return {
    id: submission.id,
    assignment_id: submission.assignmentId,
    course_id: submission.courseId,
    semester_id: submission.semesterId ?? null,
    status: submission.status,
    submitted_at: submission.submittedAt ?? null,
    note: submission.note ?? null,
    created_at: submission.createdAt,
    updated_at: submission.updatedAt,
  }
}

export async function fetchSubmissions(): Promise<Submission[]> {
  const sb = await client()
  const { data, error } = await sb
    .from('submissions')
    .select('*')
    .order('created_at')

  if (error) throw error

  return ((data ?? []) as SubmissionRow[]).map(rowToSubmission)
}

export async function saveRemoteSubmission(
  submission: Submission,
): Promise<void> {
  const sb = await client()
  const { error } = await sb
    .from('submissions')
    .upsert(submissionToRow(submission), { onConflict: 'assignment_id' })

  if (error) throw error
}
