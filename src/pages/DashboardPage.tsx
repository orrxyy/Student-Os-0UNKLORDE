import { Link } from 'react-router'
import { useState, useEffect } from 'react'
import { useStore } from '../lib/store'
import {
  currentWeightedScore,
  finalScore,
  effectiveScore,
  letterGrade,
  formatGPA,
} from '../lib/grades'
import {
  getActiveCourses,
  getActiveCredits,
  getActiveSemester,
  getActiveMaterials,
  getActiveTasks,
  getActiveNotes,
  getActiveAssessmentStats,
  getSemesterLabel,
  getActiveAssignments,
  getAttachments,
  getAssignmentSubmission,
} from '../lib/selectors'
import { getSemesterSummary, getCumulativeSummary, getCoursePerformance } from '../lib/analytics'
import { RecentActivityCard } from '../components/ActivityRow'
import { getSemesterCertificates } from '../lib/selectors'
import { STATUS_LABEL, STATUS_BADGE, isOverdue, fmtDate } from '../components/AssignmentsTab'
import { Card, StatTile, Badge, EmptyState, Icon, Progress, Modal, Button } from '../components/ui'
import { DifficultyBadge } from '../components/TaskDifficulty'
import { useTheme } from '../lib/theme'
import { heroFocusClass } from '../data/artwork'
import { ArtworkImage } from '../components/ArtworkImage'
import { SemesterSwitcher } from '../components/SemesterSwitcher'
import { useShell } from '../components/layout/AppShell'
import type { DayOfWeek, ClassSchedule, Course, Task } from '../types'

function useWIBClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

const COURSE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  MATH: { bg: 'bg-indigo-50 dark:bg-indigo-950/50', text: 'text-indigo-700 dark:text-indigo-300', dot: 'bg-indigo-400' },
  PHYS: { bg: 'bg-teal-50 dark:bg-teal-950/50', text: 'text-teal-700 dark:text-teal-300', dot: 'bg-teal-500' },
  IBDA: { bg: 'bg-sage-light', text: 'text-primary', dot: 'bg-primary' },
  IDIS: { bg: 'bg-purple-50 dark:bg-purple-950/50', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-400' },
  PHED: { bg: 'bg-emerald-50 dark:bg-emerald-950/50', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  THEO: { bg: 'bg-amber-50 dark:bg-amber-950/50', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
}

function getCourseColor(code: string) {
  const prefix = code.replace(/[0-9]/g, '').slice(0, 4)
  return COURSE_COLORS[prefix] ?? { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground' }
}

const LETTER_STYLE: Record<string, string> = {
  A: 'text-emerald-700',
  'A-': 'text-emerald-600',
  'B+': 'text-primary',
  B: 'text-primary',
  'B-': 'text-primary',
  'C+': 'text-accent',
  C: 'text-accent',
  'C-': 'text-amber-600',
  D: 'text-orange-600',
  F: 'text-destructive',
}

// ─── Task utilities ──────────────────────────────────────────────────────────

type DashboardTask = Task & { courseCode?: string; courseName?: string }

function parseDueDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDueDate(dateStr: string): string {
  return parseDueDate(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function TaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: DashboardTask
  onToggle: () => void
  onDelete: () => void
}) {
  const now = new Date()
  const isOverdue = !task.completed && !!task.dueDate && parseDueDate(task.dueDate) < now

  return (
    <div
      className={`flex items-start gap-2.5 py-2.5 border-b border-border last:border-0 group ${task.completed ? 'opacity-55' : ''}`}
    >
      {/* Checkbox */}
      <button type="button" onClick={onToggle} className="mt-0.5 shrink-0 p-1.5 -m-1.5" aria-label="Toggle task">
        <div
          className={`w-3.5 h-3.5 rounded border-[1.5px] flex items-center justify-center transition-colors ${
            task.completed
              ? 'bg-primary border-primary'
              : 'border-muted-foreground/50 hover:border-primary'
          }`}
        >
          {task.completed && <Icon name="check" size={9} className="text-primary-foreground" />}
        </div>
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-xs font-medium leading-snug truncate ${
            task.completed ? 'line-through text-muted-foreground' : 'text-foreground'
          }`}
        >
          {task.title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <DifficultyBadge task={task} />
          {task.courseCode && (
            <span className="text-[10px] font-mono text-muted-foreground">{task.courseCode}</span>
          )}
          {task.dueDate && (
            <>
              {task.courseCode && <span className="text-muted-foreground/30 text-[10px]">·</span>}
              <span className={`text-[10px] font-mono ${isOverdue ? 'text-orange-500' : 'text-muted-foreground'}`}>
                {isOverdue ? '↑ Overdue' : `Due ${formatDueDate(task.dueDate)}`}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Delete (revealed on hover) */}
      <button
        type="button"
        onClick={onDelete}
        className="md:opacity-0 md:group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-2 -m-1.5 shrink-0"
      >
        <Icon name="trash-2" size={13} />
      </button>
    </div>
  )
}

function AssignmentsDue() {
  const { state } = useStore()
  const courses = new Map(getActiveCourses(state).map((c) => [c.id, c]))
  const list = getActiveAssignments(state)
    .filter((a) => a.dueDate && a.status !== 'completed' && a.status !== 'graded')
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
  const shown = list.slice(0, 5)

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Assignments Due
          {list.length > 0 && <span className="normal-case font-sans font-normal text-muted-foreground/70"> · {list.length}</span>}
        </h3>
      </div>
      {shown.length === 0 ? (
        <p className="py-3 text-center text-xs text-muted-foreground">Nothing due. Add assignments from a course.</p>
      ) : (
        <div className="divide-y divide-border">
          {shown.map((a) => {
            const files = getAttachments(state, 'assignment', a.id).length
            const over = isOverdue(a)
            return (
              <Link key={a.id} to={`/course/${a.courseId}?tab=assignments`} className="block py-2.5 first:pt-0 last:pb-0 min-w-0 hover:opacity-80">
                <p className="text-sm font-medium break-words">{a.title}</p>
                <p className="text-[11px] font-mono text-muted-foreground mt-0.5 truncate">
                  {courses.get(a.courseId)?.code} · {over ? <span className="text-destructive font-semibold">OVERDUE · {fmtDate(a.dueDate)}</span> : fmtDate(a.dueDate)}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <Badge variant={STATUS_BADGE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                  {a.priority && <Badge variant="outline">{a.priority}</Badge>}
                  <span className="text-[10px] font-mono uppercase text-muted-foreground">{getAssignmentSubmission(state, a)?.status === 'submitted' ? 'Submitted' : 'Not Submitted'}</span>
                  {files > 0 && <span className="text-[11px] text-muted-foreground inline-flex items-center gap-0.5"><Icon name="paperclip" size={11} />{files}</span>}
                  {a.taskId && <span className="text-[10px] font-mono uppercase text-accent">Task linked</span>}
                </div>
              </Link>
            )
          })}
          {list.length > shown.length && <p className="text-[10px] font-mono text-muted-foreground pt-2 text-center">+{list.length - shown.length} more</p>}
        </div>
      )}
    </Card>
  )
}

function DashboardTasks() {
  const { state, toggleTask, deleteTask } = useStore()
  const [deleteTarget, setDeleteTarget] = useState<DashboardTask | null>(null)

  const activeCourses = getActiveCourses(state)
  const all: DashboardTask[] = []

  for (const course of activeCourses) {
    for (const task of course.tasks) {
      all.push({ ...task, courseCode: course.code, courseName: course.name })
    }
  }
  for (const task of state.globalTasks) {
    if (task.semesterId !== state.activeSemesterId) continue
    all.push({ ...task })
  }

  const incomplete = all
    .filter((t) => !t.completed)
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return a.dueDate.localeCompare(b.dueDate)
    })
  const done = all.filter((t) => t.completed)
  const sorted = [...incomplete, ...done]

  const openCount = incomplete.length
  const display = sorted.slice(0, 8)
  const hasMore = sorted.length > 8

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Tasks
            {openCount > 0 && (
              <span className="normal-case font-sans font-normal text-muted-foreground/70">
                {' '}· {openCount} open
              </span>
            )}
          </h3>
          <Link to="/tasks" className="text-xs text-accent hover:underline">
            View all
          </Link>
        </div>

        {sorted.length === 0 ? (
          <div className="py-3 text-center">
            <p className="text-xs font-medium text-muted-foreground">No tasks yet</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">Add a task from + Add Anything.</p>
          </div>
        ) : (
          <div>
            {display.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={() => toggleTask(task.id)}
                onDelete={() => setDeleteTarget(task)}
              />
            ))}
            {hasMore && (
              <p className="text-[10px] font-mono text-muted-foreground pt-2 text-center">
                +{sorted.length - 8} more —{' '}
                <Link to="/tasks" className="text-accent hover:underline">view all</Link>
              </p>
            )}
          </div>
        )}
      </Card>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Task"
        actions={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget) deleteTask(deleteTarget.id)
                setDeleteTarget(null)
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Delete{' '}
          <span className="font-semibold text-foreground">{deleteTarget?.title}</span>?
          This cannot be undone.
        </p>
      </Modal>
    </>
  )
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

const WEEKDAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const DAY_SHORT: Record<string, string> = {
  Monday: 'MON', Tuesday: 'TUE', Wednesday: 'WED', Thursday: 'THU', Friday: 'FRI',
}

function WeekSchedule({ courses, tag }: { courses: Course[]; tag: string }) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }) as DayOfWeek

  const byDay: Record<string, Array<{ course: Course; slot: ClassSchedule }>> = {
    Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [],
  }
  courses.forEach((course) => {
    ;(course.classSchedule ?? []).forEach((slot) => {
      if (slot.day in byDay) {
        byDay[slot.day].push({ course, slot })
      }
    })
  })
  WEEKDAYS.forEach((d) => {
    byDay[d].sort((a, b) => a.slot.start.localeCompare(b.slot.start))
  })

  const hasAnyClasses = WEEKDAYS.some((d) => byDay[d].length > 0)

  return (
    <Card className="p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          This Week
        </h3>
        <span className="text-[10px] font-mono text-muted-foreground/60">
          {tag}
        </span>
      </div>

      {!hasAnyClasses ? (
        <EmptyState icon="calendar" title="No classes scheduled" description="Class times appear here once a course has a schedule." className="py-4" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {WEEKDAYS.map((day) => {
            const slots = byDay[day]
            const isToday = day === today
            return (
              <div
                key={day}
                className={`rounded-lg p-2 transition-colors ${slots.length === 0 && !isToday ? 'max-sm:hidden' : ''} ${isToday ? 'bg-sage-light ring-1 ring-primary/20' : ''}`}
              >
                <div
                  className={`text-[9px] font-mono font-bold uppercase tracking-widest mb-2.5 ${
                    isToday ? 'text-primary' : 'text-muted-foreground/50'
                  }`}
                >
                  {DAY_SHORT[day]}
                </div>
                <div className="space-y-1.5 max-sm:grid max-sm:grid-cols-2 max-sm:gap-1.5 max-sm:space-y-0">
                  {slots.length === 0 ? (
                    <div className="h-4 flex items-center">
                      <span className="text-[9px] font-mono text-muted-foreground/25">—</span>
                    </div>
                  ) : (
                    slots.map(({ course, slot }) => {
                      const color = getCourseColor(course.code)
                      return (
                        <Link
                          key={`${course.id}-${slot.day}-${slot.start}`}
                          to={`/course/${course.id}`}
                        >
                          <div className="rounded p-1.5 max-sm:py-2 hover:bg-muted/60 transition-colors cursor-pointer group">
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color.dot}`} />
                              <span className={`text-[10px] sm:text-[9px] font-mono font-semibold leading-none ${color.text} group-hover:underline`}>
                                {course.code}
                              </span>
                            </div>
                            <div className="text-[10px] sm:text-[8px] font-mono text-muted-foreground pl-2.5 leading-none">
                              {slot.start}–{slot.end}
                            </div>
                            {(slot.room || course.room) && (
                              <div className="text-[10px] sm:text-[8px] font-mono text-muted-foreground/70 pl-2.5 mt-0.5 leading-tight">
                                {slot.room || course.room}
                              </div>
                            )}
                            {slot.isLab && (
                              <div className="text-[7px] font-mono text-muted-foreground/60 pl-2.5 mt-0.5">Lab</div>
                            )}
                          </div>
                        </Link>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

function PortfolioCard() {
  const { state } = useStore()
  const total = state.portfolioItems.length
  const featured = state.portfolioItems.filter((p) => p.featured).length
  return (
    <Card className="px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">Portfolio</h3>
        <Link to="/portfolio" className="text-xs text-accent hover:underline min-h-8 inline-flex items-center">{total ? 'View Portfolio →' : 'Add Item →'}</Link>
      </div>
      {total === 0 ? (
        <p className="text-sm text-muted-foreground mt-1">No portfolio items yet</p>
      ) : (
        <p className="font-display text-xl font-semibold mt-0.5">
          {total} <span className="text-[10px] font-sans font-normal text-muted-foreground">{total === 1 ? 'item' : 'items'} · {featured} featured</span>
        </p>
      )}
    </Card>
  )
}

function CertificatesCard() {
  const { state } = useStore()
  const total = state.certificates.length
  const inSem = getSemesterCertificates(state, state.activeSemesterId).length
  return (
    <Card className="px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">Certificates</h2>
        <Link to="/certificates" className="text-xs text-accent hover:underline min-h-8 inline-flex items-center">{total ? 'View All →' : 'Add Certificate →'}</Link>
      </div>
      {total === 0 ? (
        <p className="text-sm text-muted-foreground mt-1">No certificates yet</p>
      ) : (
        <p className="font-display text-xl font-semibold mt-0.5">
          {total} <span className="text-[10px] font-sans font-normal text-muted-foreground">total · {inSem} this semester</span>
        </p>
      )}
    </Card>
  )
}

export function DashboardPage() {
  const { state } = useStore()
  const { theme, heroArtwork } = useTheme()
  const { openAddAnything } = useShell()
  const now = useWIBClock()

  // Derive active-semester data through centralized selectors (Phase 2A)
  const courses = getActiveCourses(state)
  const totalSKS = getActiveCredits(state)
  const semSummary = getSemesterSummary(state)
  const semGPA = semSummary.gpa
  const cumGPA = getCumulativeSummary(state).gpa
  const perfs = courses.map((c) => getCoursePerformance(c, state.gradingScale))
  const dueCount = getActiveAssignments(state).filter((a) => !['submitted', 'completed', 'graded'].includes(a.status)).length
  const activeSem = getActiveSemester(state)
  const semLabel = getSemesterLabel(state, state.activeSemesterId)
  const activeYear = state.academicYears.find((y) => y.semesters.some((s) => s.id === state.activeSemesterId))
  const yearNo = activeYear?.number ?? 1
  const semNo = activeSem?.number ?? 1
  const semTag = `Y${yearNo} · S${semNo}`
  const semOrdinal = (yearNo - 1) * 2 + semNo
  const assess = getActiveAssessmentStats(state)
  const gradingPct = assess.total > 0 ? Math.round((assess.graded / assess.total) * 100) : 0
  const openTaskCount = getActiveTasks(state).filter((t) => !t.completed).length
  const materialCount = getActiveMaterials(state).length
  const noteCount = getActiveNotes(state).length
  const isEmpty = courses.length === 0

  const hours = now.getHours()
  const greeting =
    hours < 5 ? 'Still up?' : hours < 12 ? 'Good morning' : hours < 18 ? 'Good afternoon' : 'Good evening'

  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Jakarta',
  })

  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta',
  })

  type HeroImg = { src: string; pos: string; alt: string }
  const targetHero: HeroImg = {
    src: heroArtwork,
    pos: heroFocusClass(heroArtwork),
    alt: theme === 'dark' ? 'Silver Wolf artwork' : 'Shu artwork',
  }

  const [bottomHero, setBottomHero] = useState<HeroImg>(targetHero)
  const [topHero, setTopHero] = useState<HeroImg>(targetHero)
  const [heroFading, setHeroFading] = useState(false)

  useEffect(() => {
    if (targetHero.src === topHero.src) return
    setBottomHero(targetHero)
    setHeroFading(true)
    const t = setTimeout(() => {
      setTopHero(targetHero)
      setHeroFading(false)
    }, 480)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroArtwork])

  return (
    <div className="flex flex-col min-h-full">
      {/* ── Hero Banner ───────────────────────────────────────────── */}
      <div className="relative h-40 md:h-52 overflow-hidden shrink-0">
        {/* Bottom layer: incoming image */}
        <ArtworkImage
          src={bottomHero.src}
          alt={bottomHero.alt}
          className={`absolute inset-0 w-full h-full object-cover ${bottomHero.pos} brightness-[0.88]`}
        />
        {/* Top layer: outgoing image, crossfades to transparent */}
        <ArtworkImage
          src={topHero.src}
          alt={topHero.alt}
          className={`absolute inset-0 w-full h-full object-cover ${topHero.pos} brightness-[0.88] transition-opacity duration-[480ms] ease-in-out ${heroFading ? 'opacity-0' : 'opacity-100'}`}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/80 via-secondary/45 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background/60 to-transparent" />

        <div className="absolute inset-0 flex items-end px-4 md:px-8 pb-4 md:pb-7">
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-[0.28em] uppercase text-accent/90 mb-1.5">
              {semLabel}
            </p>
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-semibold text-white leading-tight drop-shadow-sm">
              {greeting}, 0UNKLORDE.
            </h1>
            <p className="text-[10px] md:text-xs text-white/60 mt-1 md:mt-1.5 font-mono">
              {dateStr} · {timeStr} WIB
            </p>
          </div>
        </div>

        <div className="absolute top-3 right-3 md:top-5 md:right-6 flex items-center gap-2">
          <span className="max-sm:hidden px-2.5 py-1 bg-white/15 backdrop-blur-sm border border-white/25 text-white text-xs font-medium rounded shadow-sm">
            {semTag}
          </span>
          <span className="px-2.5 py-1 bg-accent/90 text-white text-xs font-mono font-semibold rounded shadow-sm">
            {totalSKS} SKS
          </span>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="p-4 md:p-6 max-w-6xl mx-auto w-full space-y-4 md:space-y-6 flex-1">

        <Card className="p-3 md:p-4">
          <SemesterSwitcher />
        </Card>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden shadow-sm">
          {[
            { label: 'Courses', value: String(courses.length), sub: isEmpty ? 'none added yet' : 'this semester' },
            { label: 'Total SKS', value: String(totalSKS), sub: 'credit hours' },
            {
              label: 'Sem GPA',
              value: formatGPA(semGPA),
              sub: semGPA === null ? 'no grades yet' : semSummary.provisional ? 'provisional' : 'final',
              accent: semGPA !== null,
            },
            { label: 'Cum GPA', value: formatGPA(cumGPA), sub: 'cumulative', accent: cumGPA !== null },
          ].map((s) => (
            <div key={s.label} className="bg-card px-4 md:px-5 py-3 md:py-4">
              <StatTile label={s.label} value={s.value} sub={s.sub} accent={s.accent} />
            </div>
          ))}
        </div>

        {isEmpty ? (
          <Card className="p-4">
            <EmptyState
              icon="book-open"
              title="No courses added yet"
              description={`${semLabel} is empty. Add a course to start tracking schedule, grades and materials.`}
              action={
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button variant="primary" className="min-h-11 px-5" onClick={() => openAddAnything(`course year ${yearNo} semester ${semNo} `)}>
                    <Icon name="plus" size={14} className="mr-1.5" /> Add course
                  </Button>
                  <Link to={`/academics/${yearNo}/${semNo}`} className="inline-flex items-center justify-center min-h-11 px-4 text-sm text-accent hover:underline">
                    Open semester page
                  </Link>
                </div>
              }
              className="py-10"
            />
          </Card>
        ) : (
          <>
            {/* Activity */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
              {[
                { label: 'Assessments', value: `${assess.graded}/${assess.total}`, sub: 'graded' },
                { label: 'Materials', value: String(materialCount), sub: 'uploaded', to: '/materials' },
                { label: 'Notes', value: String(noteCount), sub: 'saved' },
                { label: 'Open tasks', value: String(openTaskCount), sub: 'to do' },
              ].map((a: { label: string; value: string; sub: string; to?: string }) => (
                <Card key={a.label} className="px-4 py-3 relative">
                  {a.to && <Link to={a.to} aria-label={`View all ${a.label}`} className="absolute inset-0 rounded-[inherit]" />}
                  <p className="font-mono text-[9px] tracking-[0.18em] uppercase text-muted-foreground">{a.label}</p>
                  <p className="font-display text-xl font-semibold mt-0.5">
                    {a.value} <span className="text-[10px] font-sans font-normal text-muted-foreground">{a.sub}</span>
                  </p>
                </Card>
              ))}
            </div>
            <WeekSchedule courses={courses} tag={semTag} />
          </>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* ── Course grid ──────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Semester Courses
              </h2>
              <Link
                to={`/academics/${yearNo}/${semNo}`}
                className="text-xs text-accent hover:underline flex items-center gap-1"
              >
                View semester <Icon name="chevron-right" size={12} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {courses.map((course) => {
                const current = currentWeightedScore(course)
                const final = finalScore(course)
                const displayScore = final ?? current
                const letter =
                  displayScore !== null ? letterGrade(displayScore, state.gradingScale) : null
                const done = course.gradeComponents.filter(
                  (c) => !c.isBonus && effectiveScore(c) !== null,
                ).length
                const total = course.gradeComponents.filter((c) => !c.isBonus).length
                const color = getCourseColor(course.code)

                return (
                  <Link key={course.id} to={`/course/${course.id}`}>
                    <Card hoverable className="p-4 group">
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${color.bg} ${color.text}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${color.dot} shrink-0`} />
                          {course.code}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {course.sks} SKS
                        </span>
                      </div>

                      <p className="text-sm font-medium leading-snug mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                        {course.name}
                      </p>

                      {displayScore !== null ? (
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-2xl font-display font-bold text-foreground">
                            {displayScore.toFixed(1)}
                          </span>
                          {letter && (
                            <span className={`text-base font-display font-bold ${LETTER_STYLE[letter] ?? 'text-muted-foreground'}`}>
                              {letter}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic mb-2">No grades entered</p>
                      )}

                      <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground mb-1">
                        <span>{done}/{total} components</span>
                        {done > 0 && <span>{Math.round((done / total) * 100)}%</span>}
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
                        />
                      </div>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* ── Right panel ─────────────────────────────────── */}
          <div className="space-y-4">
            <PortfolioCard />

            {/* Academic Progress */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Academic Progress
                </h3>
                <Link to="/analytics" className="text-xs text-accent hover:underline">
                  Analytics
                </Link>
              </div>
              {!isEmpty && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mb-4 pb-4 border-b border-border">
                  {[
                    { l: 'Sem GPA', v: formatGPA(semGPA), s: semGPA !== null && semSummary.provisional ? 'provisional' : undefined },
                    { l: 'Cum GPA', v: formatGPA(cumGPA) },
                    { l: 'Graded', v: `${assess.graded}/${assess.total}`, s: `${gradingPct}% complete` },
                    { l: 'Open tasks', v: String(openTaskCount), s: `${dueCount} assignment${dueCount === 1 ? '' : 's'} due` },
                  ].map((m) => (
                    <div key={m.l}>
                      <p className="font-mono text-[9px] tracking-[0.18em] uppercase text-muted-foreground">{m.l}</p>
                      <p className="font-display text-lg font-semibold leading-tight">{m.v}</p>
                      {m.s && <p className="text-[10px] text-muted-foreground">{m.s}</p>}
                    </div>
                  ))}
                  <div className="col-span-2 space-y-1.5">
                    {perfs.map((p) => (
                      <Link key={p.course.id} to={`/course/${p.course.id}`} className="flex items-center gap-2 group">
                        <span className="w-[4.6rem] shrink-0 text-[10px] font-mono text-muted-foreground group-hover:text-primary truncate">{p.course.code}</span>
                        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${p.completedPct}%` }} />
                        </div>
                        <span className="w-9 text-right text-[10px] font-mono">{p.currentScore === null ? '—' : p.currentScore.toFixed(0)}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-[10px] font-mono text-muted-foreground -mt-1.5 mb-3">Semester {semOrdinal} of {state.academicYears.length * 2} · {semLabel}</p>
              <div className="space-y-2.5">
                {state.academicYears.map((year) => {
                  const allC = year.semesters.flatMap((s) => s.courses)
                  const sks = allC.reduce((a, c) => a + c.sks, 0)
                  const isActive = year.number === yearNo
                  const filled = year.semesters.filter((s) => s.courses.length > 0).length
                  const pct = (filled / Math.max(1, year.semesters.length)) * 100
                  return (
                    <div key={year.id} className="flex items-center gap-2.5">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-display font-bold shrink-0 ${isActive ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}
                      >
                        {year.number}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-medium">Year {year.number}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {sks > 0 ? `${sks} SKS` : '—'}
                          </span>
                        </div>
                        <div className="h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isActive ? 'bg-accent' : 'bg-muted-foreground/30'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>

            <RecentActivityCard />
            <CertificatesCard />

            <AssignmentsDue />

            {/* Tasks */}
            <DashboardTasks />
          </div>
        </div>
      </div>
    </div>
  )
}
