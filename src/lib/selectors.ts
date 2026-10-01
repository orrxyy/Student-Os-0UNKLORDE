/**
 * Central derived selectors for application state.
 *
 * All components should read academic data through these helpers rather than
 * traversing `state.academicYears` directly. This keeps the active-semester
 * concept in one place and makes future Supabase migration straightforward.
 */

import type {
  AppState,
  Assignment,
  Attachment,
  Submission,
  AcademicYear,
  Semester,
  Course,
  ClassSchedule,
  DayOfWeek,
  GradeComponent,
  Material,
  Certificate,
  PortfolioItem,
  Note,
  Task,
} from '../types'
import {
  semesterGPA as calcSemGPA,
  cumulativeGPA as calcCumGPA,
} from './grades'

// ─── Semester navigation ──────────────────────────────────────────────────────

/** Returns the active Semester object (single source of truth via activeSemesterId). */
export function getActiveSemester(state: AppState): Semester | null {
  for (const year of state.academicYears) {
    for (const sem of year.semesters) {
      if (sem.id === state.activeSemesterId) return sem
    }
  }
  return null
}

/** Returns the AcademicYear that contains the active semester. */
export function getActiveYear(state: AppState): AcademicYear | null {
  for (const year of state.academicYears) {
    for (const sem of year.semesters) {
      if (sem.id === state.activeSemesterId) return year
    }
  }
  return null
}

/** Returns a flat list of all semesters across all years. */
export function getAllSemesters(state: AppState): Semester[] {
  return state.academicYears.flatMap((y) => y.semesters)
}

// ─── Active courses ───────────────────────────────────────────────────────────

/**
 * Returns courses in the active semester with status === 'active'.
 * Deliberately excludes demo/planned/completed courses from statistics so
 * entries like "Moodle Class Demo" never skew counts or GPA.
 */
export function getActiveCourses(state: AppState): Course[] {
  const sem = getActiveSemester(state)
  if (!sem) return []
  return sem.courses.filter((c) => c.status === 'active')
}

/** Total credit-hours (SKS) in the active semester. */
export function getActiveCredits(state: AppState): number {
  return getActiveCourses(state).reduce((sum, c) => sum + c.sks, 0)
}

/** Number of active courses in the active semester. */
export function getActiveCourseCount(state: AppState): number {
  return getActiveCourses(state).length
}

// ─── GPA ──────────────────────────────────────────────────────────────────────

/** Semester GPA calculated only from active-semester active courses. */
export function getActiveSemesterGPA(state: AppState): number | null {
  return calcSemGPA(getActiveCourses(state), state.gradingScale)
}

/** Cumulative GPA across every semester / every course in the academic record. */
export function getGlobalCumulativeGPA(state: AppState): number | null {
  return calcCumGPA(getAllSemesters(state), state.gradingScale)
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

/**
 * Returns today's scheduled classes (Jakarta time / WIB), sorted by start time.
 * Only active courses in the active semester are included.
 */
export function getTodayClasses(
  state: AppState,
): Array<{ course: Course; slot: ClassSchedule }> {
  const todayName = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    timeZone: 'Asia/Jakarta',
  }) as DayOfWeek

  const result: Array<{ course: Course; slot: ClassSchedule }> = []
  for (const course of getActiveCourses(state)) {
    for (const slot of course.classSchedule ?? []) {
      if (slot.day === todayName) {
        result.push({ course, slot })
      }
    }
  }
  return result.sort((a, b) => a.slot.start.localeCompare(b.slot.start))
}

// ─── Deadlines ───────────────────────────────────────────────────────────────

/**
 * Returns incomplete tasks with a due date within `withinDays` days from now,
 * across both course-level tasks (active courses only) and global tasks.
 * Sorted ascending by due date.
 */
export function getUpcomingDeadlines(
  state: AppState,
  withinDays = 7,
): Task[] {
  const now = new Date()
  const cutoff = new Date(now.getTime() + withinDays * 86_400_000)

  const tasks: Task[] = []

  for (const course of getActiveCourses(state)) {
    for (const task of course.tasks) {
      if (!task.completed && task.dueDate) {
        const due = new Date(task.dueDate)
        if (due >= now && due <= cutoff) tasks.push(task)
      }
    }
  }

  for (const task of state.globalTasks) {
    if (!task.completed && task.dueDate) {
      const due = new Date(task.dueDate)
      if (due >= now && due <= cutoff) tasks.push(task)
    }
  }

  return tasks.sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
}

// ─── Cross-domain selectors ───────────────────────────────────────────────────

function findCourse(state: AppState, courseId: string): Course | undefined {
  for (const year of state.academicYears) {
    for (const sem of year.semesters) {
      const c = sem.courses.find((c) => c.id === courseId)
      if (c) return c
    }
  }
}

/** All tasks belonging to a specific course (embedded in the course). */
export function getCourseTasks(state: AppState, courseId: string): Task[] {
  return findCourse(state, courseId)?.tasks ?? []
}

/** Grade components for a specific course (acting as assessments). */
export function getCourseAssessments(state: AppState, courseId: string): GradeComponent[] {
  return findCourse(state, courseId)?.gradeComponents ?? []
}

/** Materials embedded in a specific course. */
export function getCourseMaterials(state: AppState, courseId: string): Material[] {
  return findCourse(state, courseId)?.materials ?? []
}

/** Notes from global state that reference a specific course. */
export function getCourseNotes(state: AppState, courseId: string): Note[] {
  return state.notes.filter((n) => n.courseId === courseId)
}

/** All tasks (course-level) across all courses in a given semester. */
export function getSemesterTasks(state: AppState, semesterId: string): Task[] {
  for (const year of state.academicYears) {
    for (const sem of year.semesters) {
      if (sem.id === semesterId) {
        return sem.courses.flatMap((c) => c.tasks)
      }
    }
  }
  return []
}

/** All materials across all courses in a given semester. */
export function getSemesterMaterials(state: AppState, semesterId: string): Material[] {
  for (const year of state.academicYears) {
    for (const sem of year.semesters) {
      if (sem.id === semesterId) {
        return sem.courses.flatMap((c) => c.materials)
      }
    }
  }
  return []
}

// ─── Active-semester aggregates (Dashboard) ───────────────────────────────────

/** Course-level tasks of the active courses plus global tasks scoped to the active semester. */
export function getActiveTasks(state: AppState): Task[] {
  const fromCourses = getActiveCourses(state).flatMap((c) => c.tasks)
  const global = state.globalTasks.filter((t) => t.semesterId === state.activeSemesterId)
  return [...fromCourses, ...global]
}

/** Materials across every course in the active semester. */
export function getActiveMaterials(state: AppState): Material[] {
  return getSemesterMaterials(state, state.activeSemesterId)
}

/** Notes belonging to the active semester (directly, or via one of its courses). */
export function getActiveNotes(state: AppState): Note[] {
  const sem = getActiveSemester(state)
  const courseIds = new Set((sem?.courses ?? []).map((c) => c.id))
  return state.notes.filter(
    (n) => n.semesterId === state.activeSemesterId || (n.courseId && courseIds.has(n.courseId)),
  )
}

/** Graded vs total (non-bonus) grade components across active courses. */
export function getActiveAssessmentStats(state: AppState): { graded: number; total: number } {
  let graded = 0
  let total = 0
  for (const course of getActiveCourses(state)) {
    for (const comp of course.gradeComponents) {
      if (comp.isBonus) continue
      total++
      const has =
        (comp.scoringMode ?? 'single') === 'single' ? comp.score !== null : (comp.scores ?? []).length > 0
      if (has) graded++
    }
  }
  return { graded, total }
}

/** "Year 2 · Semester 1" for a semester id. */
export function getSemesterLabel(state: AppState, semesterId: string): string {
  for (const year of state.academicYears) {
    for (const sem of year.semesters) {
      if (sem.id === semesterId) return `Year ${year.number} · Semester ${sem.number}`
    }
  }
  return ''
}

/** Attachments referencing one entity. */
/** Assignments of one course. */
export function getCourseAssignments(state: AppState, courseId: string): Assignment[] {
  return findCourse(state, courseId)?.assignments ?? []
}

/** Assignments across all courses of a semester. */
export function getSemesterAssignments(state: AppState, semesterId: string): Assignment[] {
  for (const year of state.academicYears)
    for (const sem of year.semesters)
      if (sem.id === semesterId) return sem.courses.flatMap((c) => c.assignments ?? [])
  return []
}

export function getActiveAssignments(state: AppState): Assignment[] {
  return getSemesterAssignments(state, state.activeSemesterId)
}

/** The task linked to an assignment, if it still exists. */
export function getAssignmentTask(state: AppState, a: Assignment): Task | undefined {
  if (!a.taskId) return undefined
  return findCourse(state, a.courseId)?.tasks.find((t) => t.id === a.taskId)
}

/** The grade component (assessment) linked to an assignment, if it still exists. */
export function getAssignmentAssessment(state: AppState, a: Assignment): GradeComponent | undefined {
  if (!a.assessmentId) return undefined
  return findCourse(state, a.courseId)?.gradeComponents.find((g) => g.id === a.assessmentId)
}

/** The (single) submission record for an assignment; follows the assignment's course/semester. */
export function getAssignmentSubmission(state: AppState, a: Assignment): Submission | undefined {
  return state.submissions.find((s) => s.assignmentId === a.id)
}

/** The assignment a task originated from, if any. */
export function getTaskAssignment(state: AppState, t: Task): Assignment | undefined {
  if (!t.assignmentId || !t.courseId) return undefined
  return findCourse(state, t.courseId)?.assignments?.find((a) => a.id === t.assignmentId)
}

export function getCertificates(state: AppState): Certificate[] {
  return state.certificates
}

export function getCertificateById(state: AppState, id: string): Certificate | undefined {
  return state.certificates.find((c) => c.id === id)
}

export function getCourseCertificates(state: AppState, courseId: string): Certificate[] {
  return state.certificates.filter((c) => c.courseId === courseId)
}

export function getSemesterCertificates(state: AppState, semesterId: string): Certificate[] {
  return state.certificates.filter((c) => c.semesterId === semesterId)
}

export function getAttachments(state: AppState, entityType: Attachment['entityType'], entityId: string): Attachment[] {
  return state.attachments.filter((a) => a.entityType === entityType && a.entityId === entityId)
}

export function getPortfolioItems(state: AppState): PortfolioItem[] {
  return state.portfolioItems
}

export function getPortfolioItemById(state: AppState, id: string): PortfolioItem | undefined {
  return state.portfolioItems.find((p) => p.id === id)
}

export function getCoursePortfolioItems(state: AppState, courseId: string): PortfolioItem[] {
  return state.portfolioItems.filter((p) => p.courseId === courseId)
}

export function getSemesterPortfolioItems(state: AppState, semesterId: string): PortfolioItem[] {
  return state.portfolioItems.filter((p) => p.semesterId === semesterId)
}

export function getFeaturedPortfolioItems(state: AppState): PortfolioItem[] {
  return state.portfolioItems.filter((p) => p.featured)
}
