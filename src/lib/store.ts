import React, { createElement, createContext, useContext, useEffect, useState } from 'react'
import type { CvEntry, CvProfile, PortfolioItem, Certificate, Assignment, Submission, Attachment, AppState, Course, GradeComponent, Material, MaterialType, Note, PortfolioEntry, Task, ClassSchedule, CourseStatus } from '../types'
import { initialState, uid } from '../data/mock'
import { defaultGradingScale } from '../data/mock'
import { stampCourse } from './stamp'
import { applyScheduleSeed } from '../data/schedule'
import { fileStorage } from './attachmentStorage'
import { legacyEntryToItem, legacyCategoryToType } from './portfolio'

const STORAGE_KEY = 'student-os-v2'

// Phase 2E-E: portfolioItems is the single source; legacy `portfolio` entries are copied in once (by id) and left untouched.
function migratePortfolio(s: AppState): AppState {
  const migrations = Array.isArray(s.migrations) ? s.migrations : []
  const items = Array.isArray(s.portfolioItems) ? s.portfolioItems.filter((p) => p && p.id && p.title) : []
  if (migrations.includes('portfolio-items-v1')) return { ...s, portfolioItems: items, migrations }
  const have = new Set(items.map((p) => p.id))
  const legacy = (Array.isArray(s.portfolio) ? s.portfolio : []).filter((e) => e && e.id && !have.has(e.id)).map(legacyEntryToItem)
  return { ...s, portfolioItems: [...items, ...legacy], migrations: [...migrations, 'portfolio-items-v1'] }
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      // Migration: activeSemesterId (Phase 2A)
      if (!parsed.activeSemesterId) {
        parsed.activeSemesterId = 'sem_y1s1'
      }
      // Migration: notes (Phase 2C)
      if (!parsed.notes) {
        parsed.notes = []
      }
      // Migration: stamp semesterId on embedded course tasks (Phase 2C)
      for (const year of parsed.academicYears) {
        for (const sem of year.semesters) {
          for (const course of sem.courses) {
            course.tasks = course.tasks.map((t) =>
              t.semesterId ? t : { ...t, semesterId: sem.id },
            )
            course.assignments = (course.assignments ?? []).map((a) =>
              a.semesterId ? a : { ...a, semesterId: sem.id },
            )
            course.materials = course.materials.map((m) =>
              m.semesterId ? m : { ...m, semesterId: sem.id },
            )
          }
        }
      }
      // Migration: scope global tasks / notes to a semester (Phase 3)
      parsed.globalTasks = (parsed.globalTasks ?? []).map((t) =>
        t.semesterId ? t : { ...t, semesterId: 'sem_y1s1' },
      )
      const courseSem = new Map<string, string>()
      for (const year of parsed.academicYears) {
        for (const sem of year.semesters) for (const c of sem.courses) courseSem.set(c.id, sem.id)
      }
      parsed.notes = parsed.notes.map((n) =>
        n.semesterId
          ? n
          : { ...n, semesterId: (n.courseId && courseSem.get(n.courseId)) || 'sem_y1s1' },
      )
      // Migration: attachments (Phase 2C.5)
      parsed.attachments = Array.isArray(parsed.attachments)
        ? parsed.attachments.filter((a) => a && a.id && a.storage?.key)
        : []
      // Migration: submissions (Phase 2D-C)
      parsed.submissions = Array.isArray(parsed.submissions)
        ? parsed.submissions.filter((s) => s && s.id && s.assignmentId)
        : []
      // Migration: certificates (Phase 2E-D), add empty list only when missing
      if (!Array.isArray(parsed.certificates)) parsed.certificates = []
      // Migration: Y1S1 lecturer/room seed (Phase 2E-A), one-time, fill-blank-only
      parsed.migrations = Array.isArray(parsed.migrations) ? parsed.migrations : []
      if (!parsed.migrations.includes('schedule-seed-v1')) {
        for (const year of parsed.academicYears) {
          for (const sem of year.semesters) {
            if (sem.id !== 'sem_y1s1') continue
            sem.courses = sem.courses.map(applyScheduleSeed)
          }
        }
        parsed.migrations.push('schedule-seed-v1')
      }
      // Migration: CV inventory, defaults only when missing
      parsed.cvProfile = { ...initialState.cvProfile, ...(parsed.cvProfile ?? {}) }
      parsed.cvEntries = Array.isArray(parsed.cvEntries) ? parsed.cvEntries.filter((e) => e && e.sourceId && e.type) : []
      parsed.cvSkills = Array.isArray(parsed.cvSkills) ? parsed.cvSkills.filter((s) => typeof s === 'string') : []
      return migratePortfolio(parsed)
    }
  } catch {}
  return migratePortfolio(initialState)
}

export type PortfolioItemInput = Omit<PortfolioItem, 'id' | 'createdAt' | 'updatedAt'>

export type CertificateInput = Omit<Certificate, 'id' | 'createdAt' | 'updatedAt'>

export type AssignmentInput = Partial<Omit<Assignment, 'id' | 'courseId' | 'semesterId' | 'createdAt' | 'updatedAt'>> & { title: string }

function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
}

type StoreContextType = {
  state: AppState
  getCourse: (id: string) => Course | undefined
  updateCourseComponents: (courseId: string, components: GradeComponent[]) => void
  updateCourseField: (courseId: string, fields: Partial<Course>) => void
  addCourse: (semId: string, data: Pick<Course, 'code' | 'name' | 'sks'> & { lecturer?: string; room?: string; status?: CourseStatus; classSchedule?: ClassSchedule[] }) => Course
  deleteCourse: (courseId: string) => void
  moveCourse: (courseId: string, newSemId: string) => void
  setActiveSemester: (semesterId: string) => void
  addAssignment: (courseId: string, data: AssignmentInput) => Assignment
  updateAssignment: (courseId: string, id: string, patch: Partial<AssignmentInput>) => void
  deleteAssignment: (courseId: string, id: string) => void
  createAssignmentTask: (courseId: string, assignmentId: string) => void
  updateTask: (id: string, patch: Partial<Pick<Task, 'difficulty' | 'title' | 'academicWeek'>>) => void
  setSubmission: (courseId: string, assignmentId: string, submitted: boolean, note?: string) => void
  addTask: (task: Omit<Task, 'id'>) => void
  toggleTask: (id: string) => void
  deleteTask: (id: string) => void
  addMaterial: (courseId: string, data: { week: number; topic: string; type: MaterialType; url?: string; notes?: string }) => Material
  deleteMaterial: (courseId: string, materialId: string) => void
  updateMaterial: (courseId: string, materialId: string, patch: Partial<Pick<Material, 'topic' | 'title' | 'url' | 'academicWeek' | 'week' | 'type'>>) => void
  addCertificate: (data: CertificateInput) => Certificate
  updateCertificate: (id: string, data: CertificateInput) => void
  deleteCertificate: (id: string) => void
  addPortfolioItem: (data: PortfolioItemInput) => PortfolioItem
  updatePortfolioItem: (id: string, data: PortfolioItemInput) => void
  deletePortfolioItem: (id: string) => void
  updateCvProfile: (patch: Partial<CvProfile>) => void
  setCvEntries: (entries: CvEntry[]) => void
  setCvSkills: (skills: string[]) => void
  addNote: (data: Omit<Note, 'id' | 'createdAt'>) => void
  updateNote: (id: string, fields: Partial<Omit<Note, 'id' | 'createdAt'>>) => void
  deleteNote: (id: string) => void
  addPortfolio: (entry: Omit<PortfolioEntry, 'id'>) => void
  addAttachment: (a: Attachment) => void
  removeAttachment: (id: string) => void
  resetState: () => void
}

const StoreContext = createContext<StoreContextType | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(loadState)

  useEffect(() => {
    saveState(state)
  }, [state])

  function addAssignment(courseId: string, data: AssignmentInput): Assignment {
    const now = new Date().toISOString()
    const course = getCourse(courseId)
    const a: Assignment = {
      maxScore: 100,
      ...data,
      id: uid(),
      courseId,
      semesterId: course?.semesterId,
      status: data.status ?? 'pending',
      createdAt: now,
      updatedAt: now,
    }
    mutateCourse(courseId, (c) => ({ ...c, assignments: [...(c.assignments ?? []), a] }))
    return a
  }

  function updateAssignment(courseId: string, id: string, patch: Partial<AssignmentInput>) {
    const now = new Date().toISOString()
    mutateCourse(courseId, (c) => {
      const prev = (c.assignments ?? []).find((a) => a.id === id)
      if (!prev) return c
      const next = { ...prev, ...patch, updatedAt: now }
      // Keep the linked task's deadline/title/priority aligned instead of duplicating state.
      const isDone = (s: Assignment['status']) => s === 'completed' || s === 'graded'
      const tasks = prev.taskId
        ? c.tasks.map((t) =>
            t.id === prev.taskId
              ? {
                  ...t,
                  title: next.title,
                  dueDate: next.dueDate,
                  priority: next.priority ?? t.priority,
                  assessmentId: next.assessmentId,
                  // Only crossing the Completed boundary changes the task (Submitted leaves it alone).
                  completed: isDone(prev.status) === isDone(next.status) ? t.completed : isDone(next.status),
                }
              : t,
          )
        : c.tasks
      return { ...c, tasks, assignments: c.assignments.map((a) => (a.id === id ? next : a)) }
    })
  }

  function createAssignmentTask(courseId: string, assignmentId: string) {
    mutateCourse(courseId, (c) => {
      const a = (c.assignments ?? []).find((x) => x.id === assignmentId)
      if (!a || (a.taskId && c.tasks.some((t) => t.id === a.taskId))) return c
      const task: Task = {
        id: uid(),
        courseId,
        semesterId: c.semesterId,
        title: a.title,
        description: a.description,
        type: 'assignment',
        assessmentId: a.assessmentId,
        assignmentId: a.id,
        dueDate: a.dueDate,
        completed: a.status === 'completed' || a.status === 'graded',
        priority: a.priority ?? 'medium',
        difficulty: 'medium',
      }
      return {
        ...c,
        tasks: [...c.tasks, task],
        assignments: c.assignments.map((x) => (x.id === a.id ? { ...x, taskId: task.id, updatedAt: new Date().toISOString() } : x)),
      }
    })
  }

  function deleteAssignment(courseId: string, id: string) {
    const course = getCourse(courseId)
    const a = course?.assignments?.find((x) => x.id === id)
    if (!a) return
    // Only a task that was created from this assignment is owned by it.
    const ownedTask = a.taskId ? course?.tasks.find((t) => t.id === a.taskId && t.assignmentId === id) : undefined
    const subIds = new Set(state.submissions.filter((s) => s.assignmentId === id).map((s) => s.id))
    const cascade = cascadeAttachments(
      (x) =>
        (x.entityType === 'assignment' && x.entityId === id) ||
        (x.entityType === 'submission' && subIds.has(x.entityId)) ||
        (!!ownedTask && x.entityType === 'task' && x.entityId === ownedTask.id),
    )
    setState((prev) => {
      const next = cascade(prev)
      return { ...next, submissions: next.submissions.filter((s) => s.assignmentId !== id) }
    })
    mutateCourse(courseId, (c) => ({
      ...c,
      assignments: c.assignments.filter((x) => x.id !== id),
      tasks: ownedTask ? c.tasks.filter((t) => t.id !== ownedTask.id) : c.tasks,
    }))
  }

  function setSubmission(courseId: string, assignmentId: string, submitted: boolean, note?: string) {
    const course = getCourse(courseId)
    const a = course?.assignments?.find((x) => x.id === assignmentId)
    if (!course || !a) return
    const now = new Date().toISOString()
    // One record per assignment: update in place instead of creating another.
    setState((prev) => {
      const existing = prev.submissions.find((s) => s.assignmentId === assignmentId)
      const patch = submitted
        ? { status: 'submitted' as const, submittedAt: now, note: note?.trim() || undefined }
        : { status: 'not_submitted' as const, submittedAt: undefined }
      if (existing) {
        return { ...prev, submissions: prev.submissions.map((s) => (s.id === existing.id ? { ...s, ...patch, updatedAt: now } : s)) }
      }
      const created: Submission = {
        id: uid(), assignmentId, courseId, semesterId: course.semesterId, createdAt: now, updatedAt: now,
        ...patch,
      }
      return { ...prev, submissions: [...prev.submissions, created] }
    })
    // Keep the assignment status in step, without ever auto-completing it.
    if (submitted && (a.status === 'pending' || a.status === 'in_progress')) updateAssignment(courseId, assignmentId, { status: 'submitted' })
    if (!submitted && a.status === 'submitted') updateAssignment(courseId, assignmentId, { status: 'in_progress' })
  }

  function mutateCourse(courseId: string, fn: (c: Course) => Course): void {
    setState((prev) => ({
      ...prev,
      academicYears: prev.academicYears.map((year) => ({
        ...year,
        semesters: year.semesters.map((sem) => ({
          ...sem,
          courses: sem.courses.map((c) => (c.id === courseId ? stampCourse(c, fn(c)) : c)),
        })) as [typeof year.semesters[0], typeof year.semesters[1]],
      })),
    }))
  }

  function getCourse(id: string): Course | undefined {
    for (const year of state.academicYears) {
      for (const sem of year.semesters) {
        const c = sem.courses.find((c) => c.id === id)
        if (c) return c
      }
    }
  }

  function updateCourseComponents(courseId: string, components: GradeComponent[]) {
    mutateCourse(courseId, (c) => ({ ...c, gradeComponents: components }))
  }

  function updateCourseField(courseId: string, fields: Partial<Course>) {
    mutateCourse(courseId, (c) => ({ ...c, ...fields }))
  }

  function addCourse(semId: string, data: Pick<Course, 'code' | 'name' | 'sks'> & { lecturer?: string; room?: string; status?: CourseStatus; classSchedule?: ClassSchedule[] }): Course {
    const newCourse: Course = {
      id: uid(),
      code: data.code,
      name: data.name,
      sks: data.sks,
      semesterId: semId,
      status: data.status ?? 'active',
      lecturer: data.lecturer,
      room: data.room,
      gradeComponents: [
        { id: uid(), name: 'Assignments', weight: 20, maxScore: 100, score: null, scores: [], scoringMode: 'multiple', aggregation: 'average', isBonus: false, order: 0 },
        { id: uid(), name: 'Quizzes', weight: 20, maxScore: 100, score: null, scores: [], scoringMode: 'multiple', aggregation: 'average', isBonus: false, order: 1 },
        { id: uid(), name: 'Midterm (UTS)', weight: 25, maxScore: 100, score: null, scores: [], scoringMode: 'single', aggregation: 'average', isBonus: false, order: 2 },
        { id: uid(), name: 'Final (UAS)', weight: 35, maxScore: 100, score: null, scores: [], scoringMode: 'single', aggregation: 'average', isBonus: false, order: 3 },
      ],
      assignments: [],
      materials: [],
      tasks: [],
      classSchedule: data.classSchedule ?? [],
    }
    setState((prev) => ({
      ...prev,
      academicYears: prev.academicYears.map((year) => ({
        ...year,
        semesters: year.semesters.map((sem) =>
          sem.id === semId ? { ...sem, courses: [...sem.courses, newCourse] } : sem,
        ) as [typeof year.semesters[0], typeof year.semesters[1]],
      })),
    }))
    return newCourse
  }

  function dropBlobs(list: Attachment[]) {
    for (const a of list) fileStorage.delete(a.storage.key).catch(() => {})
  }

  function addAttachment(a: Attachment) {
    setState((prev) => (prev.attachments.some((x) => x.id === a.id) ? prev : { ...prev, attachments: [...prev.attachments, a] }))
  }

  function removeAttachment(id: string) {
    const target = state.attachments.find((a) => a.id === id)
    if (target) dropBlobs([target])
    setState((prev) => ({ ...prev, attachments: prev.attachments.filter((a) => a.id !== id) }))
  }

  function cascadeAttachments(match: (a: Attachment) => boolean) {
    dropBlobs(state.attachments.filter(match))
    return (prev: AppState) => ({ ...prev, attachments: prev.attachments.filter((a) => !match(a)) })
  }

  function deleteCourse(courseId: string) {
    const cascade = cascadeAttachments((a) => a.courseId === courseId || (a.entityType === 'course' && a.entityId === courseId))
    setState((prev) => ({
      ...cascade(prev),
      notes: prev.notes.filter((n) => n.courseId !== courseId),
      certificates: prev.certificates.map((c) => (c.courseId === courseId ? { ...c, courseId: undefined } : c)),
      portfolioItems: prev.portfolioItems.map((p) => (p.courseId === courseId ? { ...p, courseId: undefined } : p)),
      submissions: prev.submissions.filter((s) => s.courseId !== courseId),
      academicYears: prev.academicYears.map((year) => ({
        ...year,
        semesters: year.semesters.map((sem) => ({
          ...sem,
          courses: sem.courses.filter((c) => c.id !== courseId),
        })) as [typeof year.semesters[0], typeof year.semesters[1]],
      })),
    }))
  }

  function moveCourse(courseId: string, newSemId: string) {
    setState((prev) => {
      let moved: Course | undefined
      const withRemoved = prev.academicYears.map((year) => ({
        ...year,
        semesters: year.semesters.map((sem) => {
          const target = sem.courses.find((c) => c.id === courseId)
          if (target) moved = { ...target, semesterId: newSemId }
          return { ...sem, courses: sem.courses.filter((c) => c.id !== courseId) }
        }) as [typeof year.semesters[0], typeof year.semesters[1]],
      }))
      if (!moved) return prev
      const mc = moved
      return {
        ...prev,
        certificates: prev.certificates.map((c) => (c.courseId === courseId ? { ...c, semesterId: newSemId } : c)),
        portfolioItems: prev.portfolioItems.map((p) => (p.courseId === courseId ? { ...p, semesterId: newSemId } : p)),
        academicYears: withRemoved.map((year) => ({
          ...year,
          semesters: year.semesters.map((sem) =>
            sem.id === newSemId ? { ...sem, courses: [...sem.courses, mc] } : sem
          ) as [typeof year.semesters[0], typeof year.semesters[1]],
        })),
      }
    })
  }

  function addTask(task: Omit<Task, 'id'>) {
    let semesterId = task.semesterId
    if (task.courseId && !semesterId) {
      outer: for (const year of state.academicYears) {
        for (const sem of year.semesters) {
          if (sem.courses.find((c) => c.id === task.courseId)) {
            semesterId = sem.id
            break outer
          }
        }
      }
    }
    if (!semesterId) semesterId = state.activeSemesterId
    const newTask: Task = { ...task, id: uid(), semesterId, createdAt: new Date().toISOString() }
    if (task.courseId) {
      mutateCourse(task.courseId, (c) => ({ ...c, tasks: [...c.tasks, newTask] }))
    } else {
      setState((prev) => ({ ...prev, globalTasks: [...prev.globalTasks, newTask] }))
    }
  }

  function updateTask(id: string, patch: Partial<Pick<Task, 'difficulty' | 'title' | 'academicWeek'>>) {
    const upd = (tasks: Task[]) => tasks.map((t) => (t.id === id ? { ...t, ...patch } : t))
    setState((prev) => ({
      ...prev,
      globalTasks: upd(prev.globalTasks),
      academicYears: prev.academicYears.map((year) => ({
        ...year,
        semesters: year.semesters.map((sem) => ({
          ...sem,
          courses: sem.courses.map((c) => ({ ...c, tasks: upd(c.tasks) })),
        })) as [typeof year.semesters[0], typeof year.semesters[1]],
      })),
    }))
  }

  function toggleTask(id: string) {
    setState((prev) => {
      const toggleInList = (tasks: Task[]) =>
        tasks.map((t) =>
          t.id === id
            ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : undefined }
            : t,
        )
      let nowDone: boolean | undefined
      for (const t of [...prev.globalTasks, ...prev.academicYears.flatMap((y) => y.semesters.flatMap((s) => s.courses.flatMap((c) => c.tasks)))])
        if (t.id === id) nowDone = !t.completed
      // Task completion drives the linked assignment: done -> Completed; undone only reverts a Completed one.
      const syncAssignments = (list: Assignment[]) =>
        nowDone === undefined
          ? list
          : list.map((a) => {
              if (a.taskId !== id) return a
              const wasDone = a.status === 'completed' || a.status === 'graded'
              if (nowDone && !wasDone) return { ...a, status: 'completed' as const, updatedAt: new Date().toISOString(), completedAt: new Date().toISOString() }
              if (!nowDone && wasDone) return { ...a, status: 'in_progress' as const, updatedAt: new Date().toISOString(), completedAt: undefined }
              return a
            })
      return {
        ...prev,
        globalTasks: toggleInList(prev.globalTasks),
        academicYears: prev.academicYears.map((year) => ({
          ...year,
          semesters: year.semesters.map((sem) => ({
            ...sem,
            courses: sem.courses.map((c) => ({ ...c, tasks: toggleInList(c.tasks), assignments: syncAssignments(c.assignments ?? []) })),
          })) as [typeof year.semesters[0], typeof year.semesters[1]],
        })),
      }
    })
  }

  function deleteTask(id: string) {
    const cascade = cascadeAttachments((a) => a.entityType === 'task' && a.entityId === id)
    setState((prev) => {
      const removeFromList = (tasks: Task[]) => tasks.filter((t) => t.id !== id)
      return {
        ...cascade(prev),
        globalTasks: removeFromList(prev.globalTasks),
        academicYears: prev.academicYears.map((year) => ({
          ...year,
          semesters: year.semesters.map((sem) => ({
            ...sem,
            courses: sem.courses.map((c) => ({
              ...c,
              tasks: removeFromList(c.tasks),
              assignments: (c.assignments ?? []).map((a) => (a.taskId === id ? { ...a, taskId: undefined } : a)),
            })),
          })) as [typeof year.semesters[0], typeof year.semesters[1]],
        })),
      }
    })
  }

  function addMaterial(courseId: string, data: { week: number; topic: string; type: MaterialType; url?: string; notes?: string }): Material {
    let semesterId: string | undefined
    outer: for (const year of state.academicYears) {
      for (const sem of year.semesters) {
        if (sem.courses.find((c) => c.id === courseId)) {
          semesterId = sem.id
          break outer
        }
      }
    }
    const mat: Material = { ...data, id: uid(), courseId, semesterId }
    mutateCourse(courseId, (c) => ({ ...c, materials: [...c.materials, mat] }))
    return mat
  }

  function updateMaterial(courseId: string, materialId: string, patch: Partial<Pick<Material, 'topic' | 'title' | 'url' | 'academicWeek' | 'week' | 'type'>>) {
    mutateCourse(courseId, (c) => ({ ...c, materials: c.materials.map((m) => (m.id === materialId ? { ...m, ...patch } : m)) }))
  }

  function deleteMaterial(courseId: string, materialId: string) {
    const cascade = cascadeAttachments((a) => a.entityType === 'material' && a.entityId === materialId)
    setState(cascade)
    mutateCourse(courseId, (c) => ({ ...c, materials: c.materials.filter((m) => m.id !== materialId) }))
  }

  function resolveCertificate(data: CertificateInput): CertificateInput {
    const sem = data.courseId ? getCourse(data.courseId)?.semesterId : undefined
    return { ...data, courseId: sem ? data.courseId : undefined, semesterId: sem ?? data.semesterId }
  }

  function addCertificate(data: CertificateInput): Certificate {
    const now = new Date().toISOString()
    const cert: Certificate = { ...resolveCertificate(data), id: uid(), createdAt: now, updatedAt: now }
    setState((prev) => ({ ...prev, certificates: [...prev.certificates, cert] }))
    return cert
  }

  function updateCertificate(id: string, data: CertificateInput) {
    const next = resolveCertificate(data)
    setState((prev) => ({
      ...prev,
      certificates: prev.certificates.map((c) => (c.id === id ? { ...c, ...next, updatedAt: new Date().toISOString() } : c)),
    }))
  }

  function deleteCertificate(id: string) {
    const cascade = cascadeAttachments((a) => a.entityType === 'certificate' && a.entityId === id)
    setState((prev) => ({
      ...cascade(prev),
      certificates: prev.certificates.filter((c) => c.id !== id),
      cvEntries: prev.cvEntries.filter((e) => !(e.type === 'certificate' && e.sourceId === id)),
      portfolioItems: prev.portfolioItems.map((p) => {
        if (!p.certificateIds?.includes(id)) return p
        const ids = p.certificateIds.filter((x) => x !== id)
        return { ...p, certificateIds: ids.length ? ids : undefined }
      }),
    }))
  }

  function resolvePortfolioItem(data: PortfolioItemInput, certs: Certificate[]): PortfolioItemInput {
    const sem = data.courseId ? getCourse(data.courseId)?.semesterId : undefined
    const known = new Set(certs.map((c) => c.id))
    const ids = [...new Set(data.certificateIds ?? [])].filter((id) => known.has(id))
    return { ...data, courseId: sem ? data.courseId : undefined, semesterId: sem ?? data.semesterId, certificateIds: ids.length ? ids : undefined }
  }

  function addPortfolioItem(data: PortfolioItemInput): PortfolioItem {
    const now = new Date().toISOString()
    const item: PortfolioItem = { ...resolvePortfolioItem(data, state.certificates), id: uid(), createdAt: now, updatedAt: now }
    setState((prev) => ({ ...prev, portfolioItems: [...prev.portfolioItems, item] }))
    return item
  }

  function updatePortfolioItem(id: string, data: PortfolioItemInput) {
    const next = resolvePortfolioItem(data, state.certificates)
    setState((prev) => ({
      ...prev,
      portfolioItems: prev.portfolioItems.map((p) => (p.id === id ? { ...p, ...next, updatedAt: new Date().toISOString() } : p)),
    }))
  }

  function deletePortfolioItem(id: string) {
    const cascade = cascadeAttachments((a) => a.entityType === 'portfolio' && a.entityId === id)
    setState((prev) => ({
      ...cascade(prev),
      portfolioItems: prev.portfolioItems.filter((p) => p.id !== id),
      cvEntries: prev.cvEntries.filter((e) => !(e.type === 'portfolio' && e.sourceId === id)),
    }))
  }

  function updateCvProfile(patch: Partial<CvProfile>) {
    setState((prev) => ({ ...prev, cvProfile: { ...prev.cvProfile, ...patch } }))
  }
  function setCvEntries(entries: CvEntry[]) {
    setState((prev) => ({ ...prev, cvEntries: entries }))
  }
  function setCvSkills(skills: string[]) {
    setState((prev) => ({ ...prev, cvSkills: skills }))
  }

  function addNote(data: Omit<Note, 'id' | 'createdAt'>) {
    let semesterId = data.semesterId
    if (!semesterId && data.courseId) semesterId = getCourse(data.courseId)?.semesterId
    const note: Note = {
      ...data,
      semesterId: semesterId ?? state.activeSemesterId,
      id: uid(),
      createdAt: new Date().toISOString(),
    }
    setState((prev) => ({ ...prev, notes: [...prev.notes, note] }))
  }

  function updateNote(id: string, fields: Partial<Omit<Note, 'id' | 'createdAt'>>) {
    setState((prev) => ({
      ...prev,
      notes: prev.notes.map((n) => (n.id === id ? { ...n, ...fields } : n)),
    }))
  }

  function deleteNote(id: string) {
    const cascade = cascadeAttachments((a) => a.entityType === 'note' && a.entityId === id)
    setState((prev) => ({ ...cascade(prev), notes: prev.notes.filter((n) => n.id !== id) }))
  }

  function setActiveSemester(semesterId: string) {
    setState((prev) => ({ ...prev, activeSemesterId: semesterId }))
  }

  function addPortfolio(entry: Omit<PortfolioEntry, 'id'>) {
    const now = new Date().toISOString()
    const item: PortfolioItem = {
      id: uid(),
      title: entry.title,
      type: legacyCategoryToType(entry.category),
      organization: entry.organization || undefined,
      role: entry.role || undefined,
      description: entry.description || undefined,
      startDate: /^\d{4}-\d{2}$/.test(entry.date) ? `${entry.date}-01` : undefined,
      skills: entry.skills.length ? entry.skills : undefined,
      createdAt: now,
      updatedAt: now,
    }
    setState((prev) => ({ ...prev, portfolioItems: [...prev.portfolioItems, item] }))
  }

  function resetState() {
    localStorage.removeItem(STORAGE_KEY)
    setState(migratePortfolio(initialState))
  }

  return createElement(StoreContext.Provider, {
    value: {
      state,
      getCourse,
      updateCourseComponents,
      updateCourseField,
      addCourse,
      deleteCourse,
      moveCourse,
      setActiveSemester,
      addAssignment,
      updateAssignment,
      deleteAssignment,
      createAssignmentTask,
      updateTask,
      setSubmission,
      addTask,
      toggleTask,
      deleteTask,
      addMaterial,
      addCertificate,
      updateCertificate,
      deleteCertificate,
      deleteMaterial,
      updateMaterial,
      addPortfolioItem,
      updatePortfolioItem,
      deletePortfolioItem,
      updateCvProfile,
      setCvEntries,
      setCvSkills,
      addNote,
      updateNote,
      deleteNote,
      addAttachment,
      removeAttachment,
      addPortfolio,
      resetState,
    },
    children,
  })
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be inside StoreProvider')
  return ctx
}

export function useCourse(id: string) {
  const { state } = useStore()
  for (const year of state.academicYears) {
    for (const sem of year.semesters) {
      const course = sem.courses.find((c) => c.id === id)
      if (course) return { course, semester: sem, year }
    }
  }
  return null
}

export function useSemester(yearNum: number, semNum: number) {
  const { state } = useStore()
  const year = state.academicYears.find((y) => y.number === yearNum)
  if (!year) return null
  return { year, semester: year.semesters[semNum - 1] }
}

export { defaultGradingScale }
