export type PersonalActivity = {
  id: string
  name: string
  focus: string
  mode: 'weekly' | 'temporary'
  target?: number
  startDate: string
  endDate?: string
  notes: string
  archived: boolean
}

export type PersonalLifeData = {
  activities: PersonalActivity[]
  checks: string[]
  weekNotes: Record<string, string>
}

type ActivityRow = {
  id: string
  name: string
  focus: string
  mode: 'weekly' | 'temporary'
  target: number | null
  start_date: string
  end_date: string | null
  notes: string
  archived: boolean
}

type CheckinRow = {
  activity_id: string
  checkin_date: string
}

type WeekNoteRow = {
  activity_id: string
  week_start: string
  content: string
}

async function client() {
  return (await import('./supabase')).supabase
}

export async function fetchPersonalLife(): Promise<PersonalLifeData> {
  const sb = await client()

  const [activitiesResult, checksResult, notesResult] = await Promise.all([
    sb.from('personal_activities').select('*').order('created_at'),
    sb.from('personal_activity_checkins').select('activity_id, checkin_date'),
    sb.from('personal_activity_week_notes').select('activity_id, week_start, content'),
  ])

  if (activitiesResult.error) throw activitiesResult.error
  if (checksResult.error) throw checksResult.error
  if (notesResult.error) throw notesResult.error

  const activities = ((activitiesResult.data ?? []) as ActivityRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    focus: row.focus,
    mode: row.mode,
    target: row.target === null ? undefined : Number(row.target),
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    notes: row.notes,
    archived: row.archived,
  }))

  const checks = ((checksResult.data ?? []) as CheckinRow[]).map(
    (row) => `${row.activity_id}:${row.checkin_date}`,
  )

  const weekNotes: Record<string, string> = {}
  for (const row of (notesResult.data ?? []) as WeekNoteRow[]) {
    weekNotes[`${row.activity_id}:${row.week_start}`] = row.content
  }

  return { activities, checks, weekNotes }
}

export async function savePersonalActivity(activity: PersonalActivity): Promise<void> {
  const sb = await client()
  const { error } = await sb.from('personal_activities').upsert({
    id: activity.id,
    name: activity.name,
    focus: activity.focus,
    mode: activity.mode,
    target: activity.target ?? null,
    start_date: activity.startDate,
    end_date: activity.endDate ?? null,
    notes: activity.notes,
    archived: activity.archived,
  })

  if (error) throw error
}

export async function deletePersonalActivity(id: string): Promise<void> {
  const sb = await client()
  const { error } = await sb.from('personal_activities').delete().eq('id', id)

  if (error) throw error
}

export async function setPersonalCheckin(
  activityId: string,
  date: string,
  checked: boolean,
): Promise<void> {
  const sb = await client()

  const result = checked
    ? await sb.from('personal_activity_checkins').upsert({
        activity_id: activityId,
        checkin_date: date,
      })
    : await sb
        .from('personal_activity_checkins')
        .delete()
        .eq('activity_id', activityId)
        .eq('checkin_date', date)

  if (result.error) throw result.error
}

export async function savePersonalWeekNote(
  activityId: string,
  weekStart: string,
  content: string,
): Promise<void> {
  const sb = await client()
  const { error } = await sb.from('personal_activity_week_notes').upsert({
    activity_id: activityId,
    week_start: weekStart,
    content,
  })

  if (error) throw error
}
