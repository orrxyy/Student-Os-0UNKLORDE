/**
 * Add Anything — deterministic, rule-based intent parser + committer.
 *
 * `parseAddAnything` turns one free-text line into an `Intent` (entity type,
 * course, semester, fields, relationships) without touching state.
 * `commitIntent` applies an intent through the existing store actions.
 *
 * The parser is exposed through the `Classifier` type so an AI-backed
 * classifier can later be dropped in with the same input/output contract.
 */

import type {
  AppState,
  Course,
  GradeComponent,
  MaterialType,
  PortfolioCategory,
  TaskPriority,
} from '../types'
import { useStore } from './store'
import { uid } from '../data/mock'

// ─── Public types ─────────────────────────────────────────────────────────────

export type EntityType =
  | 'course'
  | 'grade'
  | 'assessment'
  | 'task'
  | 'material'
  | 'note'
  | 'assignment'
  | 'certificate'
  | 'portfolio'
  | 'achievement'
  | 'organization'
  | 'project'
  | 'cv'
  | 'file'

export const ENTITY_LABELS: Record<EntityType, string> = {
  course: 'Course',
  grade: 'Grade',
  assessment: 'Assessment',
  task: 'Task',
  material: 'Material',
  note: 'Note',
  assignment: 'Assignment',
  certificate: 'Certificate',
  portfolio: 'Portfolio',
  achievement: 'Achievement',
  organization: 'Organization',
  project: 'Project',
  cv: 'CV item',
  file: 'File',
}

export interface Overrides {
  entity?: EntityType
  courseId?: string
  componentId?: string
}

export type Ambiguity =
  | { kind: 'entity'; question: string; suggested: EntityType; candidates: EntityType[] }
  | { kind: 'course'; question: string; suggested?: Course; candidates: Course[] }
  | { kind: 'component'; question: string; candidates: GradeComponent[] }

export type Payload =
  | { kind: 'course'; semesterId: string; code?: string; name?: string; sks?: number }
  | {
      kind: 'grade'
      courseId: string
      componentId?: string
      label: string
      score?: number
      letter?: string
    }
  | { kind: 'assessment'; courseId: string; name: string; weight: number }
  | { kind: 'task'; title: string; courseId?: string; semesterId: string; dueDate?: string; priority: TaskPriority }
  | { kind: 'material'; courseId: string; week: number; topic: string; type: MaterialType; url?: string }
  | { kind: 'note'; content: string; courseId?: string; semesterId: string; week?: number }
  | { kind: 'assignment'; courseId: string; title: string; dueDate?: string }
  | {
      kind: 'portfolio'
      title: string
      category: PortfolioCategory
      date: string
      cvReady: boolean
      organization?: string
    }

export interface Intent {
  entity: EntityType
  confidence: number
  course?: Course
  semesterId?: string
  semesterLabel?: string
  summary: string
  fields: { label: string; value: string }[]
  warnings: string[]
  /** Blocking problems — the intent cannot be committed until resolved. */
  issues: string[]
  /** Course creation only: required details the text did not contain. */
  missing: ('code' | 'name' | 'sks')[]
  ambiguity: Ambiguity | null
  payload: Payload
}

export type Classifier = (
  input: string,
  state: AppState,
  overrides?: Overrides,
) => Intent | null | Promise<Intent | null>

export function isReady(i: Intent): boolean {
  return i.issues.length === 0 && !i.ambiguity && i.missing.length === 0
}

// ─── Tokenising ───────────────────────────────────────────────────────────────

interface Tok {
  raw: string
  norm: string
}

function tokenize(input: string): Tok[] {
  return input
    .replace(/=/g, ' = ')
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => ({
      raw,
      norm: raw.toLowerCase().replace(/^["'(]+/, '').replace(/[,;!?"')]+$/, ''),
    }))
    .filter((t) => t.norm.length > 0)
}

function join(toks: Tok[], skip: Set<number>): string {
  return toks
    .filter((_, i) => !skip.has(i))
    .map((t) => t.raw)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function cap(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}

function parseNumber(norm: string): { value: number; max?: number } | null {
  const m = /^(\d+(?:[.,]\d+)?)(?:\/(\d+(?:[.,]\d+)?))?$/.exec(norm)
  if (!m) return null
  return { value: parseFloat(m[1].replace(',', '.')), max: m[2] ? parseFloat(m[2].replace(',', '.')) : undefined }
}

// ─── Course resolution ────────────────────────────────────────────────────────

const STOP = new Set(['dan', 'and', 'the', 'of', 'to', 'for', 'dengan', 'yang', 'di', 'ke'])

// Small EN→ID concept map so "physics" finds "Fisika"; everything else is matched structurally.
const SYNONYMS: Record<string, string> = {
  physics: 'fisika',
  calculus: 'kalkulus',
  algorithm: 'algoritma',
  algorithms: 'algoritma',
  programming: 'pemrograman',
  theology: 'teologi',
  christian: 'kristen',
  thinking: 'pemikiran',
  thought: 'pemikiran',
  learning: 'pembelajaran',
  world: 'dunia',
  introduction: 'pengantar',
  intro: 'pengantar',
  physical: 'jasmani',
  education: 'pendidikan',
  survey: 'survei',
}

function stem(w: string): string {
  const k = w.toLowerCase().replace(/[^a-z0-9]/g, '')
  return SYNONYMS[k] ?? k
}

function nameStems(course: Course): string[] {
  return course.name
    .split(/\s+/)
    .map(stem)
    .filter((w) => w.length >= 3 && !STOP.has(w))
}

function lev(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return dp[a.length][b.length]
}

interface CourseMatch {
  course: Course
  score: number
  consumed: number[]
}

export interface CourseResolution {
  ranked: CourseMatch[]
  top?: CourseMatch
  /** 0..1 — how safe it is to use `top` without asking. */
  confidence: number
}

function scoreCourse(course: Course, toks: Tok[], activeSemesterId: string): CourseMatch {
  const code = course.code.toLowerCase()
  const dept = code.slice(0, 4)
  const stems = nameStems(course)
  const nameHits = new Set<string>()
  const nameIdx: number[] = []
  let codeScore = 0
  const codeIdx: number[] = []

  toks.forEach((t, i) => {
    const n = t.norm.replace(/[^a-z0-9]/g, '')
    if (n.length < 3) return
    if (n === code) {
      codeScore = Math.max(codeScore, 1)
      codeIdx.push(i)
    } else if (n.length >= 8 && code.startsWith(n) && /\d/.test(n)) {
      codeScore = Math.max(codeScore, 0.95)
      codeIdx.push(i)
    } else if (n === dept) {
      codeScore = Math.max(codeScore, 0.9)
      codeIdx.push(i)
    } else if (n.length >= 4 && n.length <= 5 && /^[a-z]+$/.test(n) && lev(n, dept) === 1) {
      codeScore = Math.max(codeScore, 0.6)
      codeIdx.push(i)
    }

    const s = stem(n)
    const hit = stems.find(
      (w) => w === s || (s.length >= 5 && w.startsWith(s)) || (s.length >= 5 && w.length >= 5 && lev(s, w) === 1),
    )
    if (hit) {
      nameHits.add(hit)
      nameIdx.push(i)
      if (hit !== s && !hit.startsWith(s)) codeScore = codeScore // typo hit handled via nameScore cap below
    }
  })

  let nameScore = 0
  if (nameHits.size > 0) {
    nameScore = Math.min(0.95, 0.5 + 0.2 * nameHits.size) + 0.1 * (nameHits.size / Math.max(1, stems.length))
    nameScore = Math.min(0.98, nameScore)
    // Typo-only hits (no exact stem equality) stay below the auto-accept threshold.
    const exact = toks.some((t) => stems.includes(stem(t.norm)))
    if (!exact) nameScore = Math.min(nameScore, 0.6)
  }

  const base = Math.max(codeScore, nameScore)
  const bonus = base > 0 && course.semesterId === activeSemesterId ? 0.03 : 0
  const consumed = codeScore >= nameScore ? codeIdx : nameIdx
  return { course, score: base > 0 ? Math.min(1, base + bonus) : 0, consumed: [...new Set(consumed)] }
}

export function resolveCourse(toks: Tok[], courses: Course[], activeSemesterId: string): CourseResolution {
  const ranked = courses
    .map((c) => scoreCourse(c, toks, activeSemesterId))
    .filter((m) => m.score >= 0.5)
    .sort((a, b) => b.score - a.score)
  const [top, second] = ranked
  if (!top) return { ranked, confidence: 0 }
  let confidence = top.score
  if (top.score >= 0.99) confidence = 1
  else if (second && top.score - second.score < 0.15) confidence = Math.min(confidence, 0.5)
  else if (!second) confidence = Math.max(confidence, top.score >= 0.6 ? Math.min(top.score, 0.85) : top.score)
  return { ranked, top, confidence }
}

// ─── Dates ────────────────────────────────────────────────────────────────────

const WEEKDAYS: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
  minggu: 0, senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, "jum'at": 5, sabtu: 6,
}
const MONTHS: Record<string, number> = {
  jan: 1, january: 1, januari: 1, feb: 2, february: 2, februari: 2, mar: 3, march: 3, maret: 3,
  apr: 4, april: 4, may: 5, mei: 5, jun: 6, june: 6, juni: 6, jul: 7, july: 7, juli: 7,
  aug: 8, august: 8, agu: 8, agustus: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10,
  okt: 10, oktober: 10, nov: 11, november: 11, dec: 12, december: 12, des: 12, desember: 12,
}
const DATE_FILLER = new Set(['by', 'on', 'due', 'before', 'until', 'sebelum', 'pada', 'deadline', 'this', 'next'])

function todayWIB(): Date {
  const [y, m, d] = new Date()
    .toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
    .split('-')
    .map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000)
}

function parseDate(toks: Tok[]): { date: string; idx: number[] } | null {
  const today = todayWIB()
  for (let i = 0; i < toks.length; i++) {
    const n = toks[i].norm
    const next = toks[i + 1]?.norm
    let date: Date | null = null
    let idx = [i]

    if (n === 'today' || n === 'tonight' || (n === 'hari' && next === 'ini')) {
      date = today
      if (n === 'hari') idx = [i, i + 1]
    } else if (n === 'tomorrow' || n === 'besok') date = addDays(today, 1)
    else if (n === 'lusa') date = addDays(today, 2)
    else if ((n === 'next' && next === 'week') || (n === 'minggu' && next === 'depan')) {
      date = addDays(today, 7)
      idx = [i, i + 1]
    } else if (n === 'in' && /^\d+$/.test(next ?? '') && /^(day|days|hari)$/.test(toks[i + 2]?.norm ?? '')) {
      date = addDays(today, parseInt(next!))
      idx = [i, i + 1, i + 2]
    } else if (n in WEEKDAYS && !(n === 'minggu' && (next === 'depan' || /^\d+$/.test(next ?? '')))) {
      const delta = ((WEEKDAYS[n] - today.getUTCDay() + 7) % 7) || 7
      date = addDays(today, delta)
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(n)) date = new Date(n + 'T00:00:00Z')
    else {
      const sl = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/.exec(n)
      if (sl && !n.includes('.') && parseNumber(n)?.max === undefined === false) {
        // d/m[/y] — Indonesian order
      }
      if (sl) {
        const d = +sl[1], m = +sl[2]
        let y = sl[3] ? +sl[3] : today.getUTCFullYear()
        if (y < 100) y += 2000
        if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
          date = new Date(Date.UTC(y, m - 1, d))
          if (!sl[3] && date < today) date = new Date(Date.UTC(y + 1, m - 1, d))
        }
      } else if (/^\d{1,2}$/.test(n) && next && next in MONTHS) {
        const y = /^\d{4}$/.test(toks[i + 2]?.norm ?? '') ? +toks[i + 2].norm : today.getUTCFullYear()
        date = new Date(Date.UTC(y, MONTHS[next] - 1, +n))
        idx = [i, i + 1]
        if (y !== today.getUTCFullYear()) idx.push(i + 2)
        else if (date < today) date = new Date(Date.UTC(y + 1, MONTHS[next] - 1, +n))
      } else if (n in MONTHS && /^\d{1,2}$/.test(next ?? '') && +next! <= 31) {
        const y = today.getUTCFullYear()
        date = new Date(Date.UTC(y, MONTHS[n] - 1, +next!))
        idx = [i, i + 1]
        if (date < today) date = new Date(Date.UTC(y + 1, MONTHS[n] - 1, +next!))
      }
    }

    if (date && !isNaN(date.getTime())) {
      const before = toks[Math.min(...idx) - 1]?.norm
      if (before && DATE_FILLER.has(before)) idx = [Math.min(...idx) - 1, ...idx]
      return { date: fmt(date), idx }
    }
  }
  return null
}

function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

// ─── Keyword tables ───────────────────────────────────────────────────────────

interface Kind {
  re: RegExp
  label: string
  comp: RegExp
}

const KINDS: Kind[] = [
  { re: /^(quiz|quizzes|kuis)$/, label: 'Quiz', comp: /quiz|kuis/i },
  { re: /^(midterm|uts|mid)$/, label: 'Midterm', comp: /midterm|uts/i },
  { re: /^(final|finals|uas)$/, label: 'Final', comp: /final|uas/i },
  { re: /^(assignment|assignments|tugas|homework|hw)$/, label: 'Assignment', comp: /assign|tugas|homework/i },
  { re: /^(lab|praktikum|practicum)$/, label: 'Lab', comp: /lab|praktikum/i },
  { re: /^(project|proyek)$/, label: 'Project', comp: /project|proyek/i },
  { re: /^(exam|ujian|test)$/, label: 'Exam', comp: /exam|ujian|test/i },
  { re: /^(participation|attendance|presentation|bonus)$/, label: '', comp: /./ },
]

const LEAD: Record<string, EntityType> = {
  course: 'course', matkul: 'course', mk: 'course',
  material: 'material', materi: 'material', slides: 'material', slide: 'material',
  lecture: 'material', reading: 'material', handout: 'material', modul: 'material',
  note: 'note', notes: 'note', catatan: 'note',
  task: 'task', todo: 'task', 'to-do': 'task', reminder: 'task', remind: 'task',
  assignment: 'assignment', homework: 'assignment', hw: 'assignment', tugas: 'assignment',
  assessment: 'assessment', component: 'assessment', komponen: 'assessment',
  certificate: 'certificate', sertifikat: 'certificate', certification: 'certificate',
  achievement: 'achievement', prestasi: 'achievement', award: 'achievement',
  organization: 'organization', organisasi: 'organization', org: 'organization', committee: 'organization',
  project: 'project', proyek: 'project',
  cv: 'cv', resume: 'cv', file: 'file', upload: 'file', portfolio: 'portfolio',
}

const ANYWHERE: [RegExp, EntityType][] = [
  [/^(certificate|sertifikat|certification|certified)$/, 'certificate'],
  [/^(achievement|prestasi|award|winner|juara|medal|won)$/, 'achievement'],
  [/^(organization|organisasi|committee|panitia|ukm|member|joined)$/, 'organization'],
  [/^(cv|resume)$/, 'cv'],
  [/^portfolio$/, 'portfolio'],
]

const TASK_VERBS = new Set([
  'finish', 'complete', 'submit', 'do', 'study', 'prepare', 'read', 'write', 'review', 'buy', 'send',
  'call', 'email', 'finalize', 'revise', 'practice', 'remember', 'kerjakan', 'selesaikan', 'kumpulkan',
  'belajar', 'baca', 'tulis', 'siapkan', 'buat', 'deadline', 'due', 'work', 'fix', 'plan',
])

const FILE_RE = /\.(pdf|docx?|pptx?|xlsx?|zip|png|jpe?g|csv|txt)$/i

// ─── Intent construction ──────────────────────────────────────────────────────

function allCoursesOf(state: AppState): Course[] {
  return state.academicYears.flatMap((y) => y.semesters.flatMap((s) => s.courses))
}

function semesterLabelOf(state: AppState, semesterId: string): string {
  for (const y of state.academicYears)
    for (const s of y.semesters) if (s.id === semesterId) return `Year ${y.number} · Semester ${s.number}`
  return ''
}

function findSemesterId(state: AppState, year: number, sem: number): string | undefined {
  return state.academicYears.find((y) => y.number === year)?.semesters[sem - 1]?.id
}

function baseIntent(entity: EntityType, confidence: number, payload: Payload): Intent {
  return {
    entity, confidence, summary: '', fields: [], warnings: [], issues: [], missing: [],
    ambiguity: null, payload,
  }
}

function courseLabel(c: Course): string {
  return `${c.code} — ${c.name}`
}

/** Rule-based classifier. Swap for an AI-backed `Classifier` later. */
export function parseIntent(input: string, state: AppState, ov: Overrides = {}): Intent | null {
  const toks = tokenize(input)
  if (toks.length === 0) return null
  const courses = allCoursesOf(state)
  const lead = LEAD[toks[0].norm]

  // ── Course resolution (skipped when creating a course) ──
  let res: CourseResolution = { ranked: [], confidence: 0 }
  let forced: Course | undefined
  if (ov.courseId) {
    forced = courses.find((c) => c.id === ov.courseId)
  }
  const creatingCourse = (ov.entity ?? lead) === 'course'
  if (!forced && !creatingCourse) res = resolveCourse(toks, courses, state.activeSemesterId)
  const course = forced ?? (res.confidence >= 0.45 ? res.top?.course : undefined)
  const courseConf = forced ? 1 : res.confidence
  const consumed = new Set<number>(forced ? [] : res.top?.consumed ?? [])
  if (lead && toks[0].norm in LEAD) consumed.add(0)

  // ── Grade signals ──
  const kindIdx = toks.findIndex((t, i) => !consumed.has(i) && i > -1 && KINDS.some((k) => k.re.test(t.norm)))
  const kind = kindIdx >= 0 ? KINDS.find((k) => k.re.test(toks[kindIdx].norm)) : undefined
  const nums = toks
    .map((t, i) => ({ i, n: consumed.has(i) ? null : parseNumber(t.norm) }))
    .filter((x) => x.n) as { i: number; n: { value: number; max?: number } }[]
  const eqIdx = toks.findIndex((t) => t.norm === '=')

  let ordinal: number | undefined
  let scoreTok: { i: number; n: { value: number; max?: number } } | undefined
  if (nums.length >= 2 && kindIdx >= 0 && nums[0].i === kindIdx + 1) {
    ordinal = nums[0].n.value
    scoreTok = nums[nums.length - 1]
  } else if (nums.length === 1) {
    const only = nums[0]
    const looksOrdinal =
      kindIdx >= 0 && only.i === kindIdx + 1 && eqIdx < 0 && Number.isInteger(only.n.value) && only.n.value <= 10 && only.i === toks.length - 1 === false
    if (looksOrdinal) ordinal = only.n.value
    else scoreTok = only
  } else if (nums.length >= 2) {
    scoreTok = nums[nums.length - 1]
  }
  if (kindIdx >= 0 && nums.length === 1 && ordinal !== undefined) scoreTok = undefined

  // Letter grade: "IDIS = B+", "IDIS B+"
  let letterIdx = -1
  for (let i = toks.length - 1; i >= 0; i--) {
    if (consumed.has(i)) continue
    const raw = toks[i].raw.replace(/[,;!?]+$/, '')
    if (!/^[A-Fa-f][+-]?$/.test(raw)) continue
    const afterEq = toks[i - 1]?.norm === '='
    const upper = raw === raw.toUpperCase()
    if (afterEq || (upper && (raw.length === 2 || (i === toks.length - 1 && course)))) letterIdx = i
    break
  }
  const letterRaw = letterIdx >= 0 ? toks[letterIdx].raw.replace(/[,;!?]+$/, '').toUpperCase() : undefined
  const letter = letterRaw && state.gradingScale.grades.some((g) => g.letter === letterRaw) ? letterRaw : undefined

  const date = parseDate(toks.filter((_, i) => !consumed.has(i)).length === toks.length ? toks : toks)
  const hasTaskVerb = toks.some((t, i) => !consumed.has(i) && TASK_VERBS.has(t.norm))
  const url = toks.find((t) => /^https?:\/\//i.test(t.norm))
  const fileTok = toks.find((t) => FILE_RE.test(t.norm))

  // ── Entity detection ──
  let entity: EntityType
  let entityConf: number
  const gradeSignal = !!kind && (scoreTok !== undefined || letter !== undefined) && eqIdx !== -2
  if (ov.entity) {
    entity = ov.entity
    entityConf = 1
  } else if (letter && !kind && course && !hasTaskVerb && (eqIdx >= 0 || nums.length === 0)) {
    entity = 'grade'
    entityConf = 0.95
  } else if (gradeSignal && lead !== 'material' && lead !== 'note' && lead !== 'task') {
    entity = 'grade'
    entityConf = 0.95
  } else if (lead) {
    entity = lead
    entityConf = 0.95
    if ((lead === 'assignment' || lead === 'project') && lead === 'project' && !course) entity = 'project'
    if (lead === 'project' && course) entity = 'assignment'
  } else if (url || fileTok) {
    entity = 'file'
    entityConf = 0.85
  } else {
    const any = toks.find((t, i) => !consumed.has(i) && ANYWHERE.some(([re]) => re.test(t.norm)))
    const hit = any ? ANYWHERE.find(([re]) => re.test(any.norm))![1] : undefined
    if (hit) {
      entity = hit
      entityConf = 0.85
    } else if (kind && kindIdx >= 0 && course && !hasTaskVerb) {
      entity = 'assignment'
      entityConf = 0.6
    } else if (hasTaskVerb) {
      entity = 'task'
      entityConf = 0.85
    } else if (date) {
      entity = 'task'
      entityConf = 0.7
    } else {
      entity = 'task'
      entityConf = 0.4
    }
  }

  const needsCourse: EntityType[] = ['grade', 'assessment', 'material', 'assignment', 'file']
  const semId = course?.semesterId ?? state.activeSemesterId

  let intent: Intent

  // ── Per-entity builders ──
  switch (entity) {
    case 'course': {
      const skip = new Set<number>([0])
      let year: number | undefined
      let sem: number | undefined
      let code: string | undefined
      let sks: number | undefined
      toks.forEach((t, i) => {
        const n = t.norm
        let m: RegExpExecArray | null
        if ((m = /^y(?:ear)?(\d)s(?:em(?:ester)?)?(\d)$/.exec(n))) {
          year = +m[1]; sem = +m[2]; skip.add(i)
        } else if (/^(year|tahun|y)$/.test(n) && /^\d$/.test(toks[i + 1]?.norm ?? '')) {
          year = +toks[i + 1].norm; skip.add(i); skip.add(i + 1)
        } else if (/^(semester|sem|smt|s)$/.test(n) && /^\d$/.test(toks[i + 1]?.norm ?? '')) {
          sem = +toks[i + 1].norm; skip.add(i); skip.add(i + 1)
        } else if ((m = /^(?:semester|sem|smt)(\d)$/.exec(n))) {
          sem = +m[1]; skip.add(i)
        } else if (/^[a-z]{4}\d{4}[a-z]?$/i.test(n) && !code) {
          code = t.raw.toUpperCase(); skip.add(i)
        } else if ((m = /^(\d+)sks$/.exec(n))) {
          sks = +m[1]; skip.add(i)
        } else if (n === 'sks' && /^\d+$/.test(toks[i + 1]?.norm ?? '')) {
          sks = +toks[i + 1].norm; skip.add(i); skip.add(i + 1)
        } else if (/^\d+$/.test(n) && toks[i + 1]?.norm === 'sks') {
          sks = +n; skip.add(i); skip.add(i + 1)
        }
      })
      const activeYear = state.academicYears.find((y) => y.semesters.some((s) => s.id === state.activeSemesterId))
      const targetYear = year ?? activeYear?.number ?? 1
      const activeSem = activeYear?.semesters.find((s) => s.id === state.activeSemesterId)?.number ?? 1
      const targetSem = sem ?? activeSem
      const sid = findSemesterId(state, targetYear, targetSem)
      const name = join(toks, skip).replace(/\bsks\b/gi, '').trim() || undefined
      const p: Payload = { kind: 'course', semesterId: sid ?? state.activeSemesterId, code, name, sks }
      intent = baseIntent('course', entityConf, p)
      intent.semesterId = sid
      intent.semesterLabel = sid ? semesterLabelOf(state, sid) : undefined
      if (!sid) intent.issues.push('Semester not found — use Year 1–4 and Semester 1 or 2.')
      if (!sem) intent.warnings.push(`No semester given — using ${semesterLabelOf(state, sid ?? state.activeSemesterId)}.`)
      if (!code) intent.missing.push('code')
      if (!name) intent.missing.push('name')
      if (!sks) intent.missing.push('sks')
      if (code && sid) {
        const dup = state.academicYears.flatMap((y) => y.semesters).find((s) => s.id === sid)?.courses.some((c) => c.code.toUpperCase() === code!.toUpperCase())
        if (dup) intent.issues.push(`${code} already exists in ${semesterLabelOf(state, sid)}.`)
      }
      intent.summary = `New course in ${intent.semesterLabel ?? 'selected semester'}`
      intent.fields = [
        { label: 'Semester', value: intent.semesterLabel ?? '—' },
        ...(code ? [{ label: 'Code', value: code }] : []),
        ...(name ? [{ label: 'Name', value: name }] : []),
        ...(sks ? [{ label: 'Credits', value: `${sks} SKS` }] : []),
      ]
      return intent
    }

    case 'grade': {
      intent = baseIntent('grade', entityConf, { kind: 'grade', courseId: course?.id ?? '', label: '' })
      const p = intent.payload as Extract<Payload, { kind: 'grade' }>
      if (!course) break
      if (letter && !scoreTok) {
        if (kind) {
          intent.issues.push('Letter grades apply to the whole course. Remove the assessment name or enter a numeric score.')
        }
        p.letter = letter
        p.label = `Letter grade ${letter}`
        intent.summary = `${course.code} = ${letter}`
        intent.fields = [
          { label: 'Letter grade', value: letter },
          { label: 'Numeric score', value: 'unchanged (none invented)' },
        ]
        if (course.courseLetterGrade && course.courseLetterGrade !== letter)
          intent.warnings.push(`Replaces current letter grade ${course.courseLetterGrade}.`)
        break
      }
      if (!scoreTok) {
        intent.issues.push('No score found — try "Quiz 2 IDIS 87".')
        break
      }
      let value = scoreTok.n.value
      const comps = course.gradeComponents
      let comp: GradeComponent | undefined
      if (ov.componentId) comp = comps.find((c) => c.id === ov.componentId)
      let matches: GradeComponent[] = []
      if (!comp && kind) {
        matches = comps.filter((c) => kind.comp.test(c.name))
        if (kind.label === '') {
          const word = toks[kindIdx].norm
          matches = comps.filter((c) => c.name.toLowerCase().includes(word))
        }
        if (matches.length === 1) comp = matches[0]
      }
      if (!comp && !kind) {
        const words = toks.filter((_, i) => !consumed.has(i)).map((t) => t.norm)
        matches = comps.filter((c) => c.name.toLowerCase().split(/\W+/).some((w) => w.length >= 3 && words.includes(w)))
        if (matches.length === 1) comp = matches[0]
      }
      if (!comp) {
        intent.ambiguity = {
          kind: 'component',
          question: `Which grade component of ${course.code} does this belong to?`,
          candidates: matches.length > 1 ? matches : comps,
        }
        p.label = kind ? `${kind.label}${ordinal ? ' ' + ordinal : ''}`.trim() : 'Score'
        p.score = value
        break
      }
      if (scoreTok.n.max && scoreTok.n.max !== comp.maxScore) {
        value = (scoreTok.n.value / scoreTok.n.max) * comp.maxScore
        intent.warnings.push(`Converted ${scoreTok.n.value}/${scoreTok.n.max} to ${value.toFixed(2)}/${comp.maxScore}.`)
      }
      if (value < 0 || value > comp.maxScore) intent.issues.push(`Score must be between 0 and ${comp.maxScore} for ${comp.name}.`)
      const base = kind?.label || comp.name.replace(/zes$/, 'z').replace(/s$/, '')
      const mode = comp.scoringMode ?? 'single'
      const label = mode === 'multiple' ? `${base} ${ordinal ?? comp.scores.length + 1}` : comp.name
      p.componentId = comp.id
      p.label = label
      p.score = value
      if (mode === 'multiple') {
        const prev = comp.scores.find((s) => s.label.toLowerCase() === label.toLowerCase())
        if (prev) intent.warnings.push(`Replaces existing ${label} (${prev.value}).`)
      } else if (comp.score !== null) {
        intent.warnings.push(`Replaces existing ${comp.name} score (${comp.score}).`)
      }
      intent.summary = `${label} = ${+value.toFixed(2)}`
      intent.fields = [
        { label: 'Component', value: `${comp.name} (${comp.weight}%)` },
        { label: 'Entry', value: label },
        { label: 'Numeric score', value: `${+value.toFixed(2)} / ${comp.maxScore}` },
      ]
      break
    }

    case 'assessment': {
      const skip = new Set(consumed)
      let weight = 0
      let hasWeight = false
      toks.forEach((t, i) => {
        const m = /^(\d+(?:[.,]\d+)?)%$/.exec(t.norm)
        if (m) { weight = parseFloat(m[1].replace(',', '.')); hasWeight = true; skip.add(i) }
      })
      const name = cap(join(toks, skip))
      intent = baseIntent('assessment', entityConf, { kind: 'assessment', courseId: course?.id ?? '', name, weight })
      if (!name) intent.issues.push('Give the assessment a name, e.g. "assessment Project 15% IDIS".')
      if (!hasWeight) intent.warnings.push('No weight given — created at 0%. Adjust it in the course Grades tab.')
      intent.summary = `New assessment "${name || '…'}"`
      intent.fields = [{ label: 'Name', value: name || '—' }, { label: 'Weight', value: `${weight}%` }]
      break
    }

    case 'task': {
      const skip = new Set<number>(consumed)
      if (date) date.idx.forEach((i) => skip.add(i))
      // Courses on tasks are optional, so only keep the link when it is confident.
      const link = ov.courseId || courseConf >= 0.75 ? course : undefined
      const priority: TaskPriority = toks.some((t) => /^(urgent|asap|important|penting)$/.test(t.norm)) ? 'high' : 'medium'
      const keepCourseWords = new Set<number>()
      const title = cap(join(toks, new Set([...[...skip].filter((i) => !res.top?.consumed.includes(i) || i === 0)])))
      void keepCourseWords
      intent = baseIntent('task', entityConf, {
        kind: 'task', title, courseId: link?.id, semesterId: link?.semesterId ?? state.activeSemesterId,
        dueDate: date?.date, priority,
      })
      if (!title) intent.issues.push('Describe the task.')
      intent.summary = title
      intent.fields = [
        { label: 'Title', value: title || '—' },
        { label: 'Due', value: date ? formatDateLabel(date.date) : 'no date' },
        { label: 'Priority', value: priority },
      ]
      intent.course = link
      break
    }

    case 'material':
    case 'file': {
      const skip = new Set<number>(consumed)
      let week: number | undefined
      toks.forEach((t, i) => {
        const m = /^(?:week|minggu|pertemuan|w)(\d+)$/.exec(t.norm)
        if (m) { week = +m[1]; skip.add(i) }
        else if (/^(week|minggu|pertemuan|wk)$/.test(t.norm) && /^\d+$/.test(toks[i + 1]?.norm ?? '')) {
          week = +toks[i + 1].norm; skip.add(i); skip.add(i + 1)
        }
      })
      if (url) skip.add(toks.indexOf(url))
      const lower = input.toLowerCase()
      const type: MaterialType = entity === 'file' ? 'other'
        : /video|youtube|youtu\.be/.test(lower) ? 'video'
        : /reading|paper|chapter|book|bacaan/.test(lower) ? 'reading'
        : /\blab\b|praktikum/.test(lower) ? 'lab'
        : 'lecture'
      let topic = join(toks, skip)
      const existingWeeks = (course?.materials ?? []).map((m) => m.week)
      const usedWeek = week ?? (existingWeeks.length ? Math.max(...existingWeeks) + 1 : 1)
      if (!topic) topic = fileTok ? fileTok.raw : `Week ${usedWeek} materials`
      topic = cap(topic)
      intent = baseIntent(entity, entityConf, {
        kind: 'material', courseId: course?.id ?? '', week: usedWeek, topic, type, url: url?.raw,
      })
      if (week === undefined) intent.warnings.push(`No week given — using Week ${usedWeek}.`)
      intent.summary = `${topic} · Week ${usedWeek}`
      intent.fields = [
        { label: 'Topic', value: topic },
        { label: 'Week', value: String(usedWeek) },
        { label: 'Type', value: type },
        ...(url ? [{ label: 'Link', value: url.raw }] : []),
      ]
      if (entity === 'file') intent.warnings.push('Files are stored as course materials (links only — nothing is uploaded).')
      break
    }

    case 'note': {
      const skip = new Set<number>([0])
      if (res.top && consumed.size) res.top.consumed.filter((i) => i <= 2).forEach((i) => skip.add(i))
      if (toks[1]?.norm === ':' ) skip.add(1)
      const content = join(toks, skip).replace(/^[:\-–]\s*/, '')
      const link = ov.courseId || courseConf >= 0.75 ? course : undefined
      intent = baseIntent('note', entityConf, {
        kind: 'note', content: content || '', courseId: link?.id, semesterId: link?.semesterId ?? state.activeSemesterId,
      })
      if (!content) intent.issues.push('Write the note text, e.g. "note idis: bring bible to class".')
      intent.summary = content.length > 60 ? content.slice(0, 57) + '…' : content
      intent.fields = [{ label: 'Note', value: content || '—' }]
      intent.course = link
      break
    }

    case 'assignment': {
      const skip = new Set<number>(consumed)
      if (date) date.idx.forEach((i) => skip.add(i))
      let title = cap(join(toks, skip))
      if (!title) title = 'Assignment'
      intent = baseIntent('assignment', entityConf, {
        kind: 'assignment', courseId: course?.id ?? '', title, dueDate: date?.date,
      })
      intent.summary = title
      intent.fields = [
        { label: 'Title', value: title },
        { label: 'Due', value: date ? formatDateLabel(date.date) : 'no date' },
      ]
      break
    }

    default: {
      // certificate | portfolio | achievement | organization | project | cv
      const skip = new Set<number>(consumed)
      if (lead) skip.add(0)
      const d = date
      if (d) d.idx.forEach((i) => skip.add(i))
      let organization: string | undefined
      const atIdx = toks.findIndex((t) => /^(at|di|@)$/.test(t.norm))
      if (atIdx > 0 && atIdx < toks.length - 1) {
        organization = cap(join(toks.slice(atIdx + 1).map((t) => t), new Set()))
        for (let i = atIdx; i < toks.length; i++) skip.add(i)
      }
      const title = cap(join(toks, skip))
      const lower = input.toLowerCase()
      const category: PortfolioCategory =
        entity === 'certificate' ? 'certificate'
        : entity === 'organization' ? 'org'
        : entity === 'project' ? 'project'
        : /competition|lomba|hackathon|olympiad|olimpiade/.test(lower) ? 'competition'
        : /volunteer|relawan|sukarelawan/.test(lower) ? 'volunteering'
        : 'achievement'
      const date7 = (d?.date ?? fmt(todayWIB())).slice(0, 7)
      intent = baseIntent(entity, entityConf, {
        kind: 'portfolio', title, category, date: date7, cvReady: entity === 'cv', organization,
      })
      if (!title) intent.issues.push(`Describe the ${ENTITY_LABELS[entity].toLowerCase()}.`)
      intent.summary = title
      intent.fields = [
        { label: 'Title', value: title || '—' },
        { label: 'Category', value: category },
        ...(organization ? [{ label: 'Organization', value: organization }] : []),
        { label: 'Date', value: date7 },
        ...(entity === 'cv' ? [{ label: 'CV', value: 'marked CV-ready' }] : []),
      ]
      intent.semesterId = undefined
      return finish(intent, entityConf, state)
    }
  }

  intent.course = course ?? intent.course
  const targetSemester = course?.semesterId ?? (intent.payload.kind === 'task' || intent.payload.kind === 'note' ? intent.payload.semesterId : undefined)
  if (course) {
    intent.semesterId = course.semesterId
    intent.semesterLabel = semesterLabelOf(state, course.semesterId)
  } else if (targetSemester) {
    intent.semesterId = targetSemester
    intent.semesterLabel = semesterLabelOf(state, targetSemester)
  }

  // ── Ambiguity ──
  if (!intent.ambiguity) {
    if (!ov.entity && entityConf < 0.6) {
      const candidates: EntityType[] = ['task', 'note', 'material', 'grade', 'assignment', 'achievement', 'project', 'certificate', 'organization', 'cv', 'course', 'assessment', 'portfolio', 'file']
      intent.ambiguity = {
        kind: 'entity',
        question: `Add this as ${entity === 'task' ? 'a task' : 'a ' + ENTITY_LABELS[entity].toLowerCase()}?`,
        suggested: entity,
        candidates,
      }
    } else if (needsCourse.includes(entity) && (!course || courseConf < 0.75)) {
      const suggested = course
      const ranked = res.ranked.map((m) => m.course)
      intent.ambiguity = {
        kind: 'course',
        question: suggested ? `Did you mean ${courseLabel(suggested)}?` : 'Which course is this for?',
        suggested,
        candidates: ranked.length ? ranked : courses,
      }
    } else if (!needsCourse.includes(entity) && (entity === 'task' || entity === 'note') && !ov.courseId && course && courseConf < 0.75 && courseConf >= 0.45) {
      intent.ambiguity = {
        kind: 'course',
        question: `Link this to ${courseLabel(course)}?`,
        suggested: course,
        candidates: res.ranked.map((m) => m.course),
      }
    }
  }
  return finish(intent, entityConf, state)
}

export const parseAddAnything: Classifier = parseIntent

function finish(intent: Intent, entityConf: number, state: AppState): Intent {
  void state
  intent.confidence = entityConf
  return intent
}

// ─── Committing ───────────────────────────────────────────────────────────────

export type Actions = Pick<
  ReturnType<typeof useStore>,
  | 'addCourse'
  | 'updateCourseComponents'
  | 'updateCourseField'
  | 'addTask'
  | 'addMaterial'
  | 'addNote'
  | 'addPortfolio'
  | 'getCourse'
>

export interface CommitResult {
  ok: boolean
  message: string
  semesterId?: string
  href?: string
}

export function commitIntent(
  intent: Intent,
  actions: Actions,
  draft?: { code?: string; name?: string; sks?: number },
): CommitResult {
  const p = intent.payload
  const courseCode = intent.course?.code ?? ''

  switch (p.kind) {
    case 'course': {
      const code = (draft?.code ?? p.code)?.trim().toUpperCase()
      const name = (draft?.name ?? p.name)?.trim()
      const sks = draft?.sks ?? p.sks
      if (!code || !name || !sks) return { ok: false, message: 'Course code, name and SKS are required.' }
      if (sks < 1 || sks > 8) return { ok: false, message: 'SKS must be between 1 and 8.' }
      const created = actions.addCourse(p.semesterId, { code, name, sks })
      return {
        ok: true,
        message: `Added ${code} — ${name} to ${intent.semesterLabel}.`,
        semesterId: p.semesterId,
        href: `/course/${created.id}`,
      }
    }

    case 'grade': {
      const course = actions.getCourse(p.courseId)
      if (!course) return { ok: false, message: 'Course not found.' }
      if (p.letter) {
        actions.updateCourseField(course.id, { courseLetterGrade: p.letter })
        return { ok: true, message: `Saved letter grade ${p.letter} for ${course.code}.`, semesterId: course.semesterId, href: `/course/${course.id}` }
      }
      if (!p.componentId || p.score === undefined) return { ok: false, message: 'Choose a grade component first.' }
      const updated = course.gradeComponents.map((c) => {
        if (c.id !== p.componentId) return c
        if ((c.scoringMode ?? 'single') === 'single') return { ...c, score: p.score! }
        const exists = c.scores.some((s) => s.label.toLowerCase() === p.label.toLowerCase())
        return {
          ...c,
          scores: exists
            ? c.scores.map((s) => (s.label.toLowerCase() === p.label.toLowerCase() ? { ...s, value: p.score! } : s))
            : [...c.scores, { id: `score_${uid()}`, label: p.label, value: p.score! }],
        }
      })
      actions.updateCourseComponents(course.id, updated)
      return { ok: true, message: `Saved ${p.label} = ${+p.score.toFixed(2)} for ${course.code}.`, semesterId: course.semesterId, href: `/course/${course.id}` }
    }

    case 'assessment': {
      const course = actions.getCourse(p.courseId)
      if (!course) return { ok: false, message: 'Course not found.' }
      const comp: GradeComponent = {
        id: uid(), name: p.name, weight: p.weight, maxScore: 100, score: null, scores: [],
        scoringMode: 'multiple', aggregation: 'average', isBonus: false, order: course.gradeComponents.length,
      }
      actions.updateCourseComponents(course.id, [...course.gradeComponents, comp])
      return { ok: true, message: `Added assessment "${p.name}" (${p.weight}%) to ${course.code}.`, semesterId: course.semesterId, href: `/course/${course.id}` }
    }

    case 'task':
      actions.addTask({ title: p.title, courseId: p.courseId, semesterId: p.semesterId, dueDate: p.dueDate, priority: p.priority, completed: false })
      return { ok: true, message: `Added task "${p.title}"${courseCode ? ` to ${courseCode}` : ''}.`, semesterId: p.semesterId, href: '/tasks' }

    case 'material':
      actions.addMaterial(p.courseId, { week: p.week, topic: p.topic, type: p.type, url: p.url })
      return { ok: true, message: `Added material "${p.topic}" (Week ${p.week}) to ${courseCode}.`, semesterId: intent.semesterId, href: `/course/${p.courseId}` }

    case 'note':
      actions.addNote({ content: p.content, courseId: p.courseId, semesterId: p.semesterId, week: p.week })
      return { ok: true, message: `Saved note${courseCode ? ` in ${courseCode}` : ''}.`, semesterId: p.semesterId, href: p.courseId ? `/course/${p.courseId}` : undefined }

    case 'assignment': {
      const course = actions.getCourse(p.courseId)
      if (!course) return { ok: false, message: 'Course not found.' }
      actions.updateCourseField(course.id, {
        assignments: [
          ...course.assignments,
          { id: uid(), courseId: course.id, semesterId: course.semesterId, title: p.title, dueDate: p.dueDate, status: 'pending', maxScore: 100, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        ],
      })
      return { ok: true, message: `Added assignment "${p.title}" to ${course.code}.`, semesterId: course.semesterId, href: `/course/${course.id}` }
    }

    case 'portfolio':
      actions.addPortfolio({
        title: p.title, category: p.category, date: p.date, description: '', skills: [],
        cvReady: p.cvReady, organization: p.organization,
      })
      return { ok: true, message: `Added ${ENTITY_LABELS[intent.entity].toLowerCase()} "${p.title}" to your portfolio.`, href: '/portfolio' }
  }
}
