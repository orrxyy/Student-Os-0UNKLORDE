type SemesterRow = {
  id: string
  year_id: string
  number: number
}

export type RemoteSemester = {
  id: string
  yearId: string
  number: number
}

function rowToSemester(row: SemesterRow): RemoteSemester {
  return {
    id: row.id,
    yearId: row.year_id,
    number: row.number,
  }
}

async function client() {
  return (await import('./supabase')).supabase
}

export async function fetchSemesters(): Promise<RemoteSemester[]> {
  const sb = await client()
  const { data, error } = await sb
    .from('semesters')
    .select('id, year_id, number')
    .order('year_id')
    .order('number')

  if (error) throw error

  return ((data ?? []) as SemesterRow[]).map(rowToSemester)
}
