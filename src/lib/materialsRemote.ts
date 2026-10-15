import type { Material } from '../types'

type MaterialRow = {
  id: string
  course_id: string
  semester_id: string | null
  week: number
  title: string | null
  topic: string
  type: string
  url: string | null
  notes: string | null
  created_at: string
  academic_week: number | null
}

const optional = <T,>(value: T | null): T | undefined =>
  value === null ? undefined : value

async function client() {
  return (await import('./supabase')).supabase
}

function rowToMaterial(row: MaterialRow): Material {
  return {
    id: row.id,
    courseId: row.course_id,
    semesterId: optional(row.semester_id),
    week: Number(row.week),
    title: optional(row.title),
    topic: row.topic,
    type: row.type as Material['type'],
    url: optional(row.url),
    notes: optional(row.notes),
    createdAt: row.created_at,
    academicWeek:
      row.academic_week === null ? undefined : Number(row.academic_week),
  }
}

function materialToRow(material: Material) {
  return {
    id: material.id,
    course_id: material.courseId,
    semester_id: material.semesterId ?? null,
    week: material.week,
    title: material.title ?? null,
    topic: material.topic,
    type: material.type,
    url: material.url ?? null,
    notes: material.notes ?? null,
    created_at: material.createdAt ?? new Date().toISOString(),
    academic_week: material.academicWeek ?? null,
  }
}

export async function fetchMaterials(): Promise<Material[]> {
  const sb = await client()
  const { data, error } = await sb
    .from('materials')
    .select('*')
    .order('created_at')

  if (error) throw error

  return ((data ?? []) as MaterialRow[]).map(rowToMaterial)
}

export async function saveRemoteMaterial(material: Material): Promise<void> {
  const sb = await client()
  const { error } = await sb
    .from('materials')
    .upsert(materialToRow(material))

  if (error) throw error
}

export async function deleteRemoteMaterial(id: string): Promise<void> {
  const sb = await client()
  const { error } = await sb.from('materials').delete().eq('id', id)

  if (error) throw error
}
