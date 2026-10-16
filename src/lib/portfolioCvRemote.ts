import type { CvEntry, CvProfile, PortfolioItem } from '../types'
import { supabase } from './supabase'

type PortfolioRow = {
  id: string
  user_id: string
  title: string
  type: PortfolioItem['type']
  organization: string | null
  role: string | null
  description: string | null
  start_date: string | null
  end_date: string | null
  semester_id: string | null
  course_id: string | null
  location: string | null
  url: string | null
  skills: string[] | null
  highlights: string[] | null
  certificate_ids: string[] | null
  featured: boolean
  created_at: string
  updated_at: string
}

async function getUserId() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('You must be signed in.')
  return data.user.id
}

function fromPortfolioRow(row: PortfolioRow): PortfolioItem {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    organization: row.organization ?? undefined,
    role: row.role ?? undefined,
    description: row.description ?? undefined,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    semesterId: row.semester_id ?? undefined,
    courseId: row.course_id ?? undefined,
    location: row.location ?? undefined,
    url: row.url ?? undefined,
    skills: row.skills ?? [],
    highlights: row.highlights ?? [],
    certificateIds: row.certificate_ids ?? [],
    featured: row.featured,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function fetchPortfolioItems(): Promise<PortfolioItem[]> {
  const { data, error } = await supabase
    .from('portfolio_items')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => fromPortfolioRow(row as PortfolioRow))
}

export async function savePortfolioItem(item: PortfolioItem): Promise<void> {
  const userId = await getUserId()

  const row: PortfolioRow = {
    id: item.id,
    user_id: userId,
    title: item.title,
    type: item.type,
    organization: item.organization ?? null,
    role: item.role ?? null,
    description: item.description ?? null,
    start_date: item.startDate ?? null,
    end_date: item.endDate ?? null,
    semester_id: item.semesterId ?? null,
    course_id: item.courseId ?? null,
    location: item.location ?? null,
    url: item.url ?? null,
    skills: item.skills ?? [],
    highlights: item.highlights ?? [],
    certificate_ids: item.certificateIds ?? [],
    featured: item.featured ?? false,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  }

  const { error } = await supabase
    .from('portfolio_items')
    .upsert(row, { onConflict: 'id' })

  if (error) throw error
}

export async function deletePortfolioItemRemote(id: string): Promise<void> {
  const { error } = await supabase
    .from('portfolio_items')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function fetchCvProfile(): Promise<CvProfile | null> {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('cv_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    fullName: data.full_name,
    headline: data.headline,
    email: data.email,
    phone: data.phone,
    location: data.location,
    linkedin: data.linkedin,
    github: data.github,
    website: data.website,
    institution: data.institution,
    degree: data.degree,
  }
}

export async function saveCvProfile(profile: CvProfile): Promise<void> {
  const userId = await getUserId()
  const { error } = await supabase.from('cv_profiles').upsert({
    user_id: userId,
    full_name: profile.fullName,
    headline: profile.headline,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    linkedin: profile.linkedin,
    github: profile.github,
    website: profile.website,
    institution: profile.institution,
    degree: profile.degree,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  if (error) throw error
}

export async function fetchCvEntries(): Promise<CvEntry[]> {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('cv_entries')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order')

  if (error) throw error
  return (data ?? []).map((row) => ({
    type: row.type as CvEntry['type'],
    sourceId: row.source_id,
    visible: row.visible,
    order: row.sort_order,
  }))
}

export async function saveCvEntries(entries: CvEntry[]): Promise<void> {
  const userId = await getUserId()
  const { data: existing, error: readError } = await supabase
    .from('cv_entries')
    .select('type, source_id')
    .eq('user_id', userId)

  if (readError) throw readError

  if (entries.length) {
    const { error } = await supabase.from('cv_entries').upsert(
      entries.map((entry) => ({
        user_id: userId,
        type: entry.type,
        source_id: entry.sourceId,
        visible: entry.visible,
        sort_order: entry.order,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'user_id,type,source_id' },
    )
    if (error) throw error
  }

  const keep = new Set(entries.map((entry) => `${entry.type}:${entry.sourceId}`))
  for (const row of existing ?? []) {
    if (keep.has(`${row.type}:${row.source_id}`)) continue
    const { error } = await supabase
      .from('cv_entries')
      .delete()
      .eq('user_id', userId)
      .eq('type', row.type)
      .eq('source_id', row.source_id)
    if (error) throw error
  }
}

export async function fetchCvSkills(): Promise<string[]> {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('cv_skills')
    .select('skill')
    .eq('user_id', userId)
    .order('sort_order')

  if (error) throw error
  return (data ?? []).map((row) => row.skill)
}

export async function saveCvSkills(skills: string[]): Promise<void> {
  const userId = await getUserId()
  const { data: existing, error: readError } = await supabase
    .from('cv_skills')
    .select('skill')
    .eq('user_id', userId)

  if (readError) throw readError

  const uniqueSkills = [...new Set(skills.map((skill) => skill.trim()).filter(Boolean))]

  if (uniqueSkills.length) {
    const { error } = await supabase.from('cv_skills').upsert(
      uniqueSkills.map((skill, sort_order) => ({
        user_id: userId,
        skill,
        sort_order,
      })),
      { onConflict: 'user_id,skill' },
    )
    if (error) throw error
  }

  const keep = new Set(uniqueSkills)
  for (const row of existing ?? []) {
    if (keep.has(row.skill)) continue
    const { error } = await supabase
      .from('cv_skills')
      .delete()
      .eq('user_id', userId)
      .eq('skill', row.skill)
    if (error) throw error
  }
}
