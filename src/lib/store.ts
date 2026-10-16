import React, { createElement, createContext, useContext, useEffect, useRef, useState } from 'react'
import type { CvEntry, CvProfile, PortfolioItem, Certificate, Assignment, Submission, Attachment, AppState, Course, GradeComponent, Material, MaterialType, Note, PortfolioEntry, Task, ClassSchedule, CourseStatus } from '../types'
import { initialState, uid } from '../data/mock'
import { defaultGradingScale } from '../data/mock'
import { stampCourse } from './stamp'
import { applyScheduleSeed } from '../data/schedule'
import { fileStorage } from './attachmentStorage'
import {
  deleteRemoteAttachment,
  fetchRemoteAttachments,
  saveRemoteAttachment,
} from './attachmentsRemote'
import { legacyEntryToItem, legacyCategoryToType } from './portfolio'
import { pullCourses, pushCourse, deleteRemoteCourse, courseSig } from './coursesRemote'
import { fetchSemesters } from './semesterRemote'
import {
  deleteRemoteAssignment,
  fetchAssignments,
  saveRemoteAssignment,
} from './assignmentsRemote'
import {
  deleteRemoteTask,
  fetchTasks,
  saveRemoteTask,
} from './tasksRemote'
import {
  fetchSubmissions,
  saveRemoteSubmission,
} from './submissionsRemote'
import {
  deleteRemoteMaterial,
  fetchMaterials,
  saveRemoteMaterial,
} from './materialsRemote'

import {
  deleteRemoteNote,
  fetchNotes,
  saveRemoteNote,
} from './notesRemote'

import {
  deleteRemoteCertificate,
  fetchCertificates,
  saveRemoteCertificate,
} from './certificatesRemote'

import {
  deletePortfolioItemRemote,
  fetchCvEntries,
  fetchCvProfile,
  fetchCvSkills,
  fetchPortfolioItems,
  saveCvEntries,
  saveCvProfile,
  saveCvSkills,
  savePortfolioItem,
} from './portfolioCvRemote'

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
  addAttachment: (a: Attachment) => Promise<void>
  removeAttachment: (id: string) => Promise<void>
  resetState: () => void
}

const StoreContext = createContext<StoreContextType | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(loadState)

  useEffect(() => {
    saveState(state)
  }, [state])

  function mergeAssignments(
  local: Assignment[],
  remote: Assignment[],
): Assignment[] {
  const byId = new Map(local.map((assignment) => [assignment.id, assignment]))

  for (const remoteAssignment of remote) {
    const localAssignment = byId.get(remoteAssignment.id)
    byId.set(
      remoteAssignment.id,
      localAssignment
        ? { ...localAssignment, ...remoteAssignment }
        : remoteAssignment,
    )
  }

  return [...byId.values()]
}
  
    // Read fixed semester metadata from Supabase; keep the local fallback and course data.
  useEffect(() => {
    let alive = true

    fetchSemesters()
      .then((remote) => {
        if (!alive || remote.length === 0) return

        const byId = new Map(remote.map((semester) => [semester.id, semester]))

        setState((prev) => ({
          ...prev,
          academicYears: prev.academicYears.map((year) => ({
            ...year,
            semesters: year.semesters.map((semester) => {
              const remoteSemester = byId.get(semester.id)
              if (!remoteSemester) return semester

              return {
                ...semester,
                yearId: remoteSemester.yearId,
                number: remoteSemester.number,
              }
            }) as typeof year.semesters,
          })),
        }))
      })
      .catch((error) => {
        console.warn('[supabase] semesters unavailable, using local data', error)
      })

    return () => {
      alive = false
    }
  }, [])

    // Read assignments from Supabase and merge them into their course.
  useEffect(() => {
    let alive = true

    fetchAssignments()
      .then((remote) => {
        if (!alive || remote.length === 0) return

        setState((prev) => ({
          ...prev,
          academicYears: prev.academicYears.map((year) => ({
            ...year,
            semesters: year.semesters.map((semester) => ({
              ...semester,
              courses: semester.courses.map((course) => ({
                ...course,
                assignments: mergeAssignments(
                  course.assignments ?? [],
                  remote.filter((assignment) => assignment.courseId === course.id),
                ),
              })),
            })) as typeof year.semesters,
          })),
        }))
      })
      .catch((error) => {
        console.warn('[supabase] assignments unavailable, using local data', error)
      })

    return () => {
      alive = false
    }
  }, [])

    // Read tasks from Supabase and merge them with local tasks.
  useEffect(() => {
    let alive = true

    fetchTasks()
      .then((remote) => {
        if (!alive || remote.length === 0) return

        const mergeTasks = (local: Task[], incoming: Task[]) => {
          const byId = new Map(local.map((task) => [task.id, task]))
          for (const task of incoming) {
            byId.set(task.id, { ...byId.get(task.id), ...task })
          }
          return [...byId.values()]
        }

        setState((prev) => ({
          ...prev,
          globalTasks: mergeTasks(
            prev.globalTasks,
            remote.filter((task) => !task.courseId),
          ),
          academicYears: prev.academicYears.map((year) => ({
            ...year,
            semesters: year.semesters.map((semester) => ({
              ...semester,
              courses: semester.courses.map((course) => {
                const courseTasks = remote.filter(
                  (task) => task.courseId === course.id,
                )
                const taskIdByAssignment = new Map<string, string>(
                  courseTasks
                    .filter((task) => task.assignmentId)
                    .map((task) => [task.assignmentId!, task.id] as const),
                )

                return {
                  ...course,
                  tasks: mergeTasks(course.tasks, courseTasks),
                  assignments: (course.assignments ?? []).map((assignment) => ({
                    ...assignment,
                    taskId:
                      taskIdByAssignment.get(assignment.id) ?? assignment.taskId,
                  })),
                }
              }),
            })) as typeof year.semesters,
          })),
        }))
      })
      .catch((error) => {
        console.warn('[supabase] tasks unavailable, using local data', error)
      })

    return () => {
      alive = false
    }
  }, [])
    // Read submissions from Supabase; keep existing local submissions.
  useEffect(() => {
    let alive = true

    fetchSubmissions()
      .then((remote) => {
        if (!alive || remote.length === 0) return

        setState((prev) => {
          const byAssignmentId = new Map(
            prev.submissions.map((submission) => [
              submission.assignmentId,
              submission,
            ] as const),
          )

          for (const submission of remote) {
            const local = byAssignmentId.get(submission.assignmentId)
            byAssignmentId.set(
              submission.assignmentId,
              local ? { ...local, ...submission } : submission,
            )
          }

          return {
            ...prev,
            submissions: [...byAssignmentId.values()],
          }
        })
      })
      .catch((error) => {
        console.warn(
          '[supabase] submissions unavailable, using local data',
          error,
        )
      })

    return () => {
      alive = false
    }
  }, [])
    // Read materials from Supabase and merge them into their courses.
  useEffect(() => {
    let alive = true

    fetchMaterials()
      .then((remote) => {
        if (!alive || remote.length === 0) return

        setState((prev) => ({
          ...prev,
          academicYears: prev.academicYears.map((year) => ({
            ...year,
            semesters: year.semesters.map((semester) => ({
              ...semester,
              courses: semester.courses.map((course) => {
                const byId = new Map(
                  course.materials.map((material) => [material.id, material] as const),
                )

                for (const material of remote.filter(
                  (item) => item.courseId === course.id,
                )) {
                  const local = byId.get(material.id)
                  byId.set(
                    material.id,
                    local ? { ...local, ...material } : material,
                  )
                }

                return { ...course, materials: [...byId.values()] }
              }),
            })) as typeof year.semesters,
          })),
        }))
      })
      .catch((error) => {
        console.warn('[supabase] materials unavailable, using local data', error)
      })

    return () => {
      alive = false
    }
  }, [])
    // Read notes from Supabase and merge them with local notes.
  useEffect(() => {
    let alive = true

    fetchNotes()
      .then((remote) => {
        if (!alive || remote.length === 0) return

        setState((prev) => {
          const byId = new Map(prev.notes.map((note) => [note.id, note]))

          for (const note of remote) {
            const local = byId.get(note.id)
            byId.set(note.id, local ? { ...local, ...note } : note)
          }

          return { ...prev, notes: [...byId.values()] }
        })
      })
      .catch((error) => {
        console.warn('[supabase] notes unavailable, using local data', error)
      })

    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
  let alive = true

  fetchRemoteAttachments()
    .then((remote) => {
      if (!alive || remote.length === 0) return

      setState((prev) => {
        const byId = new Map(prev.attachments.map((attachment) => [attachment.id, attachment]))

        for (const attachment of remote) {
          byId.set(attachment.id, attachment)
        }

        return { ...prev, attachments: [...byId.values()] }
      })
    })
    .catch((error) => {
      console.warn('[supabase] attachments unavailable, using local data', error)
    })

  return () => {
    alive = false
  }
}, [])
  
    // Read certificates from Supabase and merge them with the local cache.
  useEffect(() => {
    let alive = true
    const localAtStart = state.certificates

    fetchCertificates()
      .then(async (remote) => {
        if (!alive) return

        // Copy older local-only certificates to Supabase.
        const remoteIds = new Set(remote.map((certificate) => certificate.id))
        for (const certificate of localAtStart) {
          if (remoteIds.has(certificate.id)) continue

          try {
            await saveRemoteCertificate(certificate)
          } catch (error) {
            console.warn(
              '[supabase] could not migrate local certificate',
              certificate.id,
              error,
            )
          }
        }

        if (!alive) return

        setState((prev) => {
          const byId = new Map(
            prev.certificates.map((certificate) => [certificate.id, certificate]),
          )

          // Supabase wins if the same certificate exists in both places.
          for (const certificate of remote) {
            byId.set(certificate.id, {
              ...byId.get(certificate.id),
              ...certificate,
            })
          }

          return { ...prev, certificates: [...byId.values()] }
        })
      })
      .catch((error) => {
        console.warn('[supabase] certificates unavailable, using local data', error)
      })

    return () => {
      alive = false
    }
  }, [])

    useEffect(() => {
    let alive = true
    const localItems = state.portfolioItems
    const localProfile = state.cvProfile
    const localEntries = state.cvEntries
    const localSkills = state.cvSkills

    Promise.all([
      fetchPortfolioItems(),
      fetchCvProfile(),
      fetchCvEntries(),
      fetchCvSkills(),
    ])
      .then(async ([remoteItems, remoteProfile, remoteEntries, remoteSkills]) => {
        if (!alive) return

        const remoteIds = new Set(remoteItems.map((item) => item.id))
        for (const item of localItems) {
          if (!remoteIds.has(item.id)) {
            await savePortfolioItem(item)
          }
        }

        if (!remoteProfile) await saveCvProfile(localProfile)
        if (remoteEntries.length === 0 && localEntries.length) {
          await saveCvEntries(localEntries)
        }
        if (remoteSkills.length === 0 && localSkills.length) {
          await saveCvSkills(localSkills)
        }

        if (!alive) return
        setState((prev) => {
          const byId = new Map(localItems.map((item) => [item.id, item]))
          for (const item of remoteItems) byId.set(item.id, item)

          return {
            ...prev,
            portfolioItems: [...byId.values()],
            cvProfile: remoteProfile ?? localProfile,
            cvEntries: remoteEntries.length ? remoteEntries : localEntries,
            cvSkills: remoteSkills.length ? remoteSkills : localSkills,
          }
        })
      })
      .catch((error) => {
        console.warn('[supabase] portfolio/CV data unavailable', error)
      })

    return () => {
      alive = false
    }
  }, [])
  
  // Courses + grade components live in Supabase; localStorage keeps a full local cache and everything else.
  const sigs = useRef(new Map<string, string>())
  const queue = useRef<Promise<void>>(Promise.resolve())
  const pending = useRef(new Set<string>())
  const [remoteReady, setRemoteReady] = useState(false)

  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const attempt = (n: number) => {
      pullCourses()
        .then((remote) => {
          if (!alive) return
          const byId = new Map(remote.map((r) => [r.id, r]))
          setState((prev) => {
            const next = {
              ...prev,
              academicYears: prev.academicYears.map((y) => ({
                ...y,
                semesters: y.semesters.map((sem) => ({
                  ...sem,
                  courses: sem.courses.map((c) => {
                    const r = byId.get(c.id)
                    return r ? { ...c, ...r } : c
                  }),
                })) as typeof y.semesters,
              })),
            }
            for (const y of next.academicYears) for (const sem of y.semesters) for (const c of sem.courses) {
              if (byId.has(c.id)) sigs.current.set(c.id, courseSig(c))
            }
            return next
          })
          setRemoteReady(true)
        })
        .catch((e) => {
          console.warn('[supabase] courses unavailable, using local data (retrying)', e)
          if (alive && n < 6) timer = setTimeout(() => attempt(n + 1), Math.min(2000 * 2 ** n, 30000))
        })
    }
    attempt(0)
    return () => { alive = false; clearTimeout(timer) }
  }, [])

  useEffect(() => {
    if (!remoteReady) return
    const all = state.academicYears.flatMap((y) => y.semesters.flatMap((s) => s.courses))
    const live = new Set(all.map((c) => c.id))
    for (const c of all) {
      const sig = courseSig(c)
      const pk = c.id + sig
      if (sigs.current.get(c.id) === sig || pending.current.has(pk)) continue
      pending.current.add(pk)
      queue.current = queue.current.then(() =>
        pushCourse(c)
          .then(() => { sigs.current.set(c.id, sig) })
          .catch((e) => console.warn('[supabase] push failed, will retry', e))
          .finally(() => pending.current.delete(pk)),
      )
    }
    for (const id of [...sigs.current.keys()]) {
      if (live.has(id)) continue
      queue.current = queue.current.then(() =>
        deleteRemoteCourse(id).then(() => { sigs.current.delete(id) }).catch((e) => console.warn('[supabase] delete failed, will retry', e)),
      )
    }
  }, [state, remoteReady])

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

    mutateCourse(courseId, (c) => ({
      ...c,
      assignments: [...(c.assignments ?? []), a],
    }))

    void saveRemoteAssignment(a).catch((error) => {
      console.warn('[supabase] assignment save failed', error)
    })

    return a
  }

  function updateAssignment(courseId: string, id: string, patch: Partial<AssignmentInput>) {
    const now = new Date().toISOString()
    const course = getCourse(courseId)
    const prev = course?.assignments?.find((assignment) => assignment.id === id)
    if (!prev) return

    const next = { ...prev, ...patch, updatedAt: now }

    mutateCourse(courseId, (c) => {
      const isDone = (status: Assignment['status']) =>
        status === 'completed' || status === 'graded'
      const tasks = prev.taskId
        ? c.tasks.map((task) =>
            task.id === prev.taskId
              ? {
                  ...task,
                  title: next.title,
                  dueDate: next.dueDate,
                  priority: next.priority ?? task.priority,
                  assessmentId: next.assessmentId,
                  completed:
                    isDone(prev.status) === isDone(next.status)
                      ? task.completed
                      : isDone(next.status),
                }
              : task,
          )
        : c.tasks

      return {
        ...c,
        tasks,
        assignments: c.assignments.map((assignment) =>
          assignment.id === id ? next : assignment,
        ),
      }
    })

    void saveRemoteAssignment(next).catch((error) => {
      console.warn('[supabase] assignment update failed', error)
    })
  }
   function createAssignmentTask(courseId: string, assignmentId: string) {
    const course = getCourse(courseId)
    const assignment = course?.assignments.find(
      (item) => item.id === assignmentId,
    )
    if (!course || !assignment) return
    if (
      assignment.taskId &&
      course.tasks.some((task) => task.id === assignment.taskId)
    ) {
      return
    }

    const task: Task = {
      id: uid(),
      courseId,
      semesterId: course.semesterId,
      title: assignment.title,
      description: assignment.description,
      type: 'assignment',
      assessmentId: assignment.assessmentId,
      assignmentId: assignment.id,
      dueDate: assignment.dueDate,
      completed:
        assignment.status === 'completed' || assignment.status === 'graded',
      priority: assignment.priority ?? 'medium',
      difficulty: 'medium',
      createdAt: new Date().toISOString(),
    }

    mutateCourse(courseId, (current) => ({
      ...current,
      tasks: [...current.tasks, task],
      assignments: current.assignments.map((item) =>
        item.id === assignmentId
          ? { ...item, taskId: task.id, updatedAt: new Date().toISOString() }
          : item,
      ),
    }))

    void saveRemoteTask(task).catch((error) => {
      console.warn('[supabase] task save failed', error)
    })
  }

  function deleteAssignment(courseId: string, id: string) {
    const course = getCourse(courseId)
    const assignment = course?.assignments?.find((item) => item.id === id)
    if (!assignment) return

    const ownedTask = assignment.taskId
      ? course?.tasks.find((task) => task.id === assignment.taskId && task.assignmentId === id)
      : undefined
    const submissionIds = new Set(
      state.submissions.filter((submission) => submission.assignmentId === id).map((submission) => submission.id),
    )
    const cascade = cascadeAttachments(
      (attachment) =>
        (attachment.entityType === 'assignment' && attachment.entityId === id) ||
        (attachment.entityType === 'submission' && submissionIds.has(attachment.entityId)) ||
        (!!ownedTask && attachment.entityType === 'task' && attachment.entityId === ownedTask.id),
    )

    setState((prev) => {
      const next = cascade(prev)
      return {
        ...next,
        submissions: next.submissions.filter((submission) => submission.assignmentId !== id),
      }
    })

    mutateCourse(courseId, (c) => ({
      ...c,
      assignments: c.assignments.filter((item) => item.id !== id),
      tasks: ownedTask ? c.tasks.filter((task) => task.id !== ownedTask.id) : c.tasks,
    }))

    void deleteRemoteAssignment(id).catch((error) => {
      console.warn('[supabase] assignment delete failed', error)
    })
  }

    function setSubmission(
    courseId: string,
    assignmentId: string,
    submitted: boolean,
    note?: string,
  ) {
    const course = getCourse(courseId)
    const assignment = course?.assignments?.find(
      (item) => item.id === assignmentId,
    )
    if (!course || !assignment) return

    const now = new Date().toISOString()
    const existing = state.submissions.find(
      (submission) => submission.assignmentId === assignmentId,
    )

    const patch = submitted
      ? {
          status: 'submitted' as const,
          submittedAt: now,
          note: note?.trim() || undefined,
        }
      : {
          status: 'not_submitted' as const,
          submittedAt: undefined,
          note: note?.trim() || undefined,
        }

    const next: Submission = existing
      ? { ...existing, ...patch, updatedAt: now }
      : {
          id: uid(),
          assignmentId,
          courseId,
          semesterId: course.semesterId,
          createdAt: now,
          updatedAt: now,
          ...patch,
        }

    setState((prev) => ({
      ...prev,
      submissions: [
        ...prev.submissions.filter(
          (submission) => submission.assignmentId !== assignmentId,
        ),
        next,
      ],
    }))

    void saveRemoteSubmission(next).catch((error) => {
      console.warn('[supabase] submission save failed', error)
    })

    // Keep the assignment status in step, without automatically completing it.
    if (
      submitted &&
      (assignment.status === 'pending' || assignment.status === 'in_progress')
    ) {
      updateAssignment(courseId, assignmentId, { status: 'submitted' })
    }

    if (!submitted && assignment.status === 'submitted') {
      updateAssignment(courseId, assignmentId, { status: 'in_progress' })
    }
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
  for (const attachment of list) {
    if (attachment.storage.provider === 'remote') {
      void deleteRemoteAttachment(attachment).catch((error) => {
        console.warn('[supabase] attachment delete failed', error)
      })
    } else {
      void fileStorage.delete(attachment.storage.key).catch((error) => {
        console.warn('[local] attachment delete failed', error)
      })
    }
  }
}

async function addAttachment(attachment: Attachment): Promise<void> {
  if (attachment.storage.provider === 'remote') {
    await saveRemoteAttachment(attachment)
  }

  setState((prev) =>
    prev.attachments.some((item) => item.id === attachment.id)
      ? prev
      : { ...prev, attachments: [...prev.attachments, attachment] },
  )
}

async function removeAttachment(id: string): Promise<void> {
  const target = state.attachments.find((attachment) => attachment.id === id)
  if (!target) return

  try {
    if (target.storage.provider === 'remote') {
      await deleteRemoteAttachment(target)
    } else {
      await fileStorage.delete(target.storage.key)
    }

    setState((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((attachment) => attachment.id !== id),
    }))
  } catch (error) {
    console.warn('[attachments] remove failed', error)
  }
}

function cascadeAttachments(match: (attachment: Attachment) => boolean) {
  dropBlobs(state.attachments.filter(match))
  return (prev: AppState) => ({
    ...prev,
    attachments: prev.attachments.filter((attachment) => !match(attachment)),
  })
}
function deleteCourse(courseId: string) {
  const cascade = cascadeAttachments(
    (attachment) =>
      attachment.courseId === courseId ||
      (attachment.entityType === 'course' && attachment.entityId === courseId),
  )

  const certificatesToUpdate = state.certificates
    .filter((certificate) => certificate.courseId === courseId)
    .map((certificate) => ({ ...certificate, courseId: undefined }))

  const portfolioItemsToUpdate = state.portfolioItems
    .filter((item) => item.courseId === courseId)
    .map((item) => ({ ...item, courseId: undefined }))

  setState((prev) => ({
    ...cascade(prev),
    notes: prev.notes.filter((note) => note.courseId !== courseId),
    certificates: prev.certificates.map(
      (certificate) =>
        certificatesToUpdate.find((updated) => updated.id === certificate.id) ??
        certificate,
    ),
    portfolioItems: prev.portfolioItems.map(
      (item) =>
        portfolioItemsToUpdate.find((updated) => updated.id === item.id) ??
        item,
    ),
    submissions: prev.submissions.filter(
      (submission) => submission.courseId !== courseId,
    ),
    academicYears: prev.academicYears.map((year) => ({
      ...year,
      semesters: year.semesters.map((semester) => ({
        ...semester,
        courses: semester.courses.filter((course) => course.id !== courseId),
      })) as [typeof year.semesters[0], typeof year.semesters[1]],
    })),
  }))

  for (const certificate of certificatesToUpdate) {
    void saveRemoteCertificate(certificate).catch((error) => {
      console.warn('[supabase] certificate course unlink failed', error)
    })
  }

  for (const item of portfolioItemsToUpdate) {
    void savePortfolioItem(item).catch((error) => {
      console.warn('[supabase] portfolio course unlink failed', error)
    })
  }
}

function moveCourse(courseId: string, newSemId: string) {
  const courseToMove = state.academicYears
    .flatMap((year) => year.semesters)
    .flatMap((semester) => semester.courses)
    .find((course) => course.id === courseId)

  const targetSemesterExists = state.academicYears
    .flatMap((year) => year.semesters)
    .some((semester) => semester.id === newSemId)

  if (!courseToMove || !targetSemesterExists) return

  const movedCourse: Course = {
    ...courseToMove,
    semesterId: newSemId,
  }

  const certificatesToUpdate = state.certificates
    .filter((certificate) => certificate.courseId === courseId)
    .map((certificate) => ({ ...certificate, semesterId: newSemId }))

  const portfolioItemsToUpdate = state.portfolioItems
    .filter((item) => item.courseId === courseId)
    .map((item) => ({ ...item, semesterId: newSemId }))

  setState((prev) => {
    const yearsWithoutCourse = prev.academicYears.map((year) => ({
      ...year,
      semesters: year.semesters.map((semester) => ({
        ...semester,
        courses: semester.courses.filter((course) => course.id !== courseId),
      })) as [typeof year.semesters[0], typeof year.semesters[1]],
    }))

    return {
      ...prev,
      certificates: prev.certificates.map(
        (certificate) =>
          certificatesToUpdate.find((updated) => updated.id === certificate.id) ??
          certificate,
      ),
      portfolioItems: prev.portfolioItems.map(
        (item) =>
          portfolioItemsToUpdate.find((updated) => updated.id === item.id) ??
          item,
      ),
      academicYears: yearsWithoutCourse.map((year) => ({
        ...year,
        semesters: year.semesters.map((semester) =>
          semester.id === newSemId
            ? { ...semester, courses: [...semester.courses, movedCourse] }
            : semester,
        ) as [typeof year.semesters[0], typeof year.semesters[1]],
      })),
    }
  })

  for (const certificate of certificatesToUpdate) {
    void saveRemoteCertificate(certificate).catch((error) => {
      console.warn('[supabase] certificate semester update failed', error)
    })
  }

  for (const item of portfolioItemsToUpdate) {
    void savePortfolioItem(item).catch((error) => {
      console.warn('[supabase] portfolio semester update failed', error)
    })
  }
}
   function addTask(task: Omit<Task, 'id'>) {
    let semesterId = task.semesterId

    if (task.courseId && !semesterId) {
      outer: for (const year of state.academicYears) {
        for (const semester of year.semesters) {
          if (semester.courses.some((course) => course.id === task.courseId)) {
            semesterId = semester.id
            break outer
          }
        }
      }
    }

    if (!semesterId) semesterId = state.activeSemesterId

    const newTask: Task = {
      ...task,
      id: uid(),
      semesterId,
      createdAt: new Date().toISOString(),
    }

    if (newTask.courseId) {
      mutateCourse(newTask.courseId, (course) => ({
        ...course,
        tasks: [...course.tasks, newTask],
      }))
    } else {
      setState((prev) => ({
        ...prev,
        globalTasks: [...prev.globalTasks, newTask],
      }))
    }

    void saveRemoteTask(newTask).catch((error) => {
      console.warn('[supabase] task save failed', error)
    })
  }
    function updateTask(
    id: string,
    patch: Partial<Pick<Task, 'difficulty' | 'title' | 'academicWeek'>>,
  ) {
    const current =
      state.globalTasks.find((task) => task.id === id) ??
      state.academicYears
        .flatMap((year) => year.semesters)
        .flatMap((semester) => semester.courses)
        .flatMap((course) => course.tasks)
        .find((task) => task.id === id)

    if (!current) return

    const next = { ...current, ...patch }

    setState((prev) => {
      const updateList = (tasks: Task[]) =>
        tasks.map((task) => (task.id === id ? next : task))

      return {
        ...prev,
        globalTasks: updateList(prev.globalTasks),
        academicYears: prev.academicYears.map((year) => ({
          ...year,
          semesters: year.semesters.map((semester) => ({
            ...semester,
            courses: semester.courses.map((course) => ({
              ...course,
              tasks: updateList(course.tasks),
            })),
          })) as [typeof year.semesters[0], typeof year.semesters[1]],
        })),
      }
    })

    void saveRemoteTask(next).catch((error) => {
      console.warn('[supabase] task update failed', error)
    })
  }
    function toggleTask(id: string) {
    const current =
      state.globalTasks.find((task) => task.id === id) ??
      state.academicYears
        .flatMap((year) => year.semesters)
        .flatMap((semester) => semester.courses)
        .flatMap((course) => course.tasks)
        .find((task) => task.id === id)

    if (!current) return

    const now = new Date().toISOString()
    const nextTask: Task = {
      ...current,
      completed: !current.completed,
      completedAt: !current.completed ? now : undefined,
    }

    void saveRemoteTask(nextTask).catch((error) => {
      console.warn('[supabase] task update failed', error)
    })

    for (const year of state.academicYears) {
      for (const semester of year.semesters) {
        for (const course of semester.courses) {
          for (const assignment of course.assignments ?? []) {
            if (
              assignment.taskId !== id &&
              assignment.id !== current.assignmentId
            ) {
              continue
            }

            const wasDone =
              assignment.status === 'completed' || assignment.status === 'graded'
            let updated: Assignment | undefined

            if (nextTask.completed && !wasDone) {
              updated = {
                ...assignment,
                status: 'completed',
                completedAt: now,
                updatedAt: now,
              }
            } else if (!nextTask.completed && wasDone) {
              updated = {
                ...assignment,
                status: 'in_progress',
                completedAt: undefined,
                updatedAt: now,
              }
            }

            if (updated) {
              void saveRemoteAssignment(updated).catch((error) => {
                console.warn('[supabase] linked assignment update failed', error)
              })
            }
          }
        }
      }
    }

    setState((prev) => {
      const updateTasks = (tasks: Task[]) =>
        tasks.map((task) => (task.id === id ? nextTask : task))

      const nowDone = nextTask.completed
      const syncAssignments = (assignments: Assignment[]) =>
        assignments.map((assignment) => {
          if (
            assignment.taskId !== id &&
            assignment.id !== current.assignmentId
          ) {
            return assignment
          }

          const wasDone =
            assignment.status === 'completed' || assignment.status === 'graded'

          if (nowDone && !wasDone) {
            return {
              ...assignment,
              status: 'completed' as const,
              completedAt: now,
              updatedAt: now,
            }
          }

          if (!nowDone && wasDone) {
            return {
              ...assignment,
              status: 'in_progress' as const,
              completedAt: undefined,
              updatedAt: now,
            }
          }

          return assignment
        })

      return {
        ...prev,
        globalTasks: updateTasks(prev.globalTasks),
        academicYears: prev.academicYears.map((year) => ({
          ...year,
          semesters: year.semesters.map((semester) => ({
            ...semester,
            courses: semester.courses.map((course) => ({
              ...course,
              tasks: updateTasks(course.tasks),
              assignments: syncAssignments(course.assignments ?? []),
            })),
          })) as [typeof year.semesters[0], typeof year.semesters[1]],
        })),
      }
    })
  }

    function deleteTask(id: string) {
    const cascade = cascadeAttachments(
      (attachment) => attachment.entityType === 'task' && attachment.entityId === id,
    )

    setState((prev) => {
      const removeFromList = (tasks: Task[]) =>
        tasks.filter((task) => task.id !== id)

      return {
        ...cascade(prev),
        globalTasks: removeFromList(prev.globalTasks),
        academicYears: prev.academicYears.map((year) => ({
          ...year,
          semesters: year.semesters.map((semester) => ({
            ...semester,
            courses: semester.courses.map((course) => ({
              ...course,
              tasks: removeFromList(course.tasks),
              assignments: (course.assignments ?? []).map((assignment) =>
                assignment.taskId === id
                  ? { ...assignment, taskId: undefined }
                  : assignment,
              ),
            })),
          })) as [typeof year.semesters[0], typeof year.semesters[1]],
        })),
      }
    })

    void deleteRemoteTask(id).catch((error) => {
      console.warn('[supabase] task delete failed', error)
    })
  }

  function addMaterial(
    courseId: string,
    data: {
      week: number
      topic: string
      type: MaterialType
      url?: string
      notes?: string
    },
  ): Material {
    const course = getCourse(courseId)
    const material: Material = {
      ...data,
      id: uid(),
      courseId,
      semesterId: course?.semesterId,
      createdAt: new Date().toISOString(),
    }

    mutateCourse(courseId, (current) => ({
      ...current,
      materials: [...current.materials, material],
    }))

    void saveRemoteMaterial(material).catch((error) => {
      console.warn('[supabase] material save failed', error)
    })

    return material
  }

  function updateMaterial(
    courseId: string,
    materialId: string,
    patch: Partial<
      Pick<Material, 'topic' | 'title' | 'url' | 'academicWeek' | 'week' | 'type'>
    >,
  ) {
    const current = getCourse(courseId)?.materials.find(
      (material) => material.id === materialId,
    )
    if (!current) return

    const next = { ...current, ...patch }

    mutateCourse(courseId, (course) => ({
      ...course,
      materials: course.materials.map((material) =>
        material.id === materialId ? next : material,
      ),
    }))

    void saveRemoteMaterial(next).catch((error) => {
      console.warn('[supabase] material update failed', error)
    })
  }

  function deleteMaterial(courseId: string, materialId: string) {
    const cascade = cascadeAttachments(
      (attachment) =>
        attachment.entityType === 'material' &&
        attachment.entityId === materialId,
    )

    setState(cascade)

    mutateCourse(courseId, (course) => ({
      ...course,
      materials: course.materials.filter(
        (material) => material.id !== materialId,
      ),
    }))

    void deleteRemoteMaterial(materialId).catch((error) => {
      console.warn('[supabase] material delete failed', error)
    })
  }

   function addCertificate(data: CertificateInput): Certificate {
    const now = new Date().toISOString()
// addCertificate
const certificate: Certificate = {
  ...data,
  id: uid(),
  createdAt: now,
  updatedAt: now,
}

    setState((prev) => ({
      ...prev,
      certificates: [...prev.certificates, certificate],
    }))

    void saveRemoteCertificate(certificate).catch((error) => {
      console.warn('[supabase] certificate save failed', error)
    })

    return certificate
  }

  function updateCertificate(id: string, data: CertificateInput) {
    const current = state.certificates.find((certificate) => certificate.id === id)
    if (!current) return

// updateCertificate
const certificate: Certificate = {
  ...current,
  ...data,
  updatedAt: new Date().toISOString(),
}
    setState((prev) => ({
      ...prev,
      certificates: prev.certificates.map((item) =>
        item.id === id ? certificate : item,
      ),
    }))

    void saveRemoteCertificate(certificate).catch((error) => {
      console.warn('[supabase] certificate update failed', error)
    })
  }

function deleteCertificate(id: string) {
  const cascade = cascadeAttachments(
    (attachment) =>
      attachment.entityType === 'certificate' && attachment.entityId === id,
  )

  const cvEntriesToSave = state.cvEntries.filter(
    (entry) => !(entry.type === 'certificate' && entry.sourceId === id),
  )

  const portfolioItemsToSave = state.portfolioItems
    .filter((item) => item.certificateIds?.includes(id))
    .map((item) => {
      const certificateIds = item.certificateIds!.filter(
        (certificateId) => certificateId !== id,
      )
      return {
        ...item,
        certificateIds: certificateIds.length ? certificateIds : undefined,
      }
    })

  setState((prev) => ({
    ...cascade(prev),
    certificates: prev.certificates.filter(
      (certificate) => certificate.id !== id,
    ),
    cvEntries: cvEntriesToSave,
    portfolioItems: prev.portfolioItems.map(
      (item) =>
        portfolioItemsToSave.find((updated) => updated.id === item.id) ?? item,
    ),
  }))

  void deleteRemoteCertificate(id).catch((error) => {
    console.warn('[supabase] certificate delete failed', error)
  })

  void saveCvEntries(cvEntriesToSave).catch((error) => {
    console.warn('[supabase] CV entries update failed', error)
  })

  for (const item of portfolioItemsToSave) {
    void savePortfolioItem(item).catch((error) => {
      console.warn('[supabase] portfolio certificate update failed', error)
    })
  }
}

  function resolvePortfolioItem(data: PortfolioItemInput, certs: Certificate[]): PortfolioItemInput {
    const sem = data.courseId ? getCourse(data.courseId)?.semesterId : undefined
    const known = new Set(certs.map((c) => c.id))
    const ids = [...new Set(data.certificateIds ?? [])].filter((id) => known.has(id))
    return { ...data, courseId: sem ? data.courseId : undefined, semesterId: sem ?? data.semesterId, certificateIds: ids.length ? ids : undefined }
  }

function addPortfolioItem(data: PortfolioItemInput): PortfolioItem {
  const now = new Date().toISOString()
  const item: PortfolioItem = {
    ...resolvePortfolioItem(data, state.certificates),
    id: uid(),
    createdAt: now,
    updatedAt: now,
  }

  setState((prev) => ({
    ...prev,
    portfolioItems: [...prev.portfolioItems, item],
  }))

  void savePortfolioItem(item).catch((error) => {
    console.warn('[supabase] portfolio save failed', error)
  })

  return item
}
  function updatePortfolioItem(id: string, data: PortfolioItemInput) {
    const current = state.portfolioItems.find((item) => item.id === id)
    if (!current) return

    const item: PortfolioItem = {
      ...current,
      ...resolvePortfolioItem(data, state.certificates),
      updatedAt: new Date().toISOString(),
    }
    setState((prev) => ({
      ...prev,
      portfolioItems: prev.portfolioItems.map((row) => row.id === id ? item : row),
    }))
    void savePortfolioItem(item).catch((error) =>
      console.warn('[supabase] portfolio update failed', error),
    )
  }

  function deletePortfolioItem(id: string) {
    const cascade = cascadeAttachments(
      (attachment) => attachment.entityType === 'portfolio' && attachment.entityId === id,
    )
    const entries = state.cvEntries.filter(
      (entry) => !(entry.type === 'portfolio' && entry.sourceId === id),
    )

    setState((prev) => ({
      ...cascade(prev),
      portfolioItems: prev.portfolioItems.filter((item) => item.id !== id),
      cvEntries: entries,
    }))
    void deletePortfolioItemRemote(id).catch((error) =>
      console.warn('[supabase] portfolio delete failed', error),
    )
    void saveCvEntries(entries).catch((error) =>
      console.warn('[supabase] CV entries update failed', error),
    )
  }

  function updateCvProfile(patch: Partial<CvProfile>) {
    const profile = { ...state.cvProfile, ...patch }
    setState((prev) => ({ ...prev, cvProfile: profile }))
    void saveCvProfile(profile).catch((error) =>
      console.warn('[supabase] CV profile save failed', error),
    )
  }

  function setCvEntries(entries: CvEntry[]) {
    setState((prev) => ({ ...prev, cvEntries: entries }))
    void saveCvEntries(entries).catch((error) =>
      console.warn('[supabase] CV entries save failed', error),
    )
  }

  function setCvSkills(skills: string[]) {
    setState((prev) => ({ ...prev, cvSkills: skills }))
    void saveCvSkills(skills).catch((error) =>
      console.warn('[supabase] CV skills save failed', error),
    )
  }

   function addNote(data: Omit<Note, 'id' | 'createdAt'>) {
    let semesterId = data.semesterId
    if (!semesterId && data.courseId) {
      semesterId = getCourse(data.courseId)?.semesterId
    }

    const note: Note = {
      ...data,
      semesterId: semesterId ?? state.activeSemesterId,
      id: uid(),
      createdAt: new Date().toISOString(),
    }

    setState((prev) => ({ ...prev, notes: [...prev.notes, note] }))

    void saveRemoteNote(note).catch((error) => {
      console.warn('[supabase] note save failed', error)
    })
  }

  function updateNote(
    id: string,
    fields: Partial<Omit<Note, 'id' | 'createdAt'>>,
  ) {
    const current = state.notes.find((note) => note.id === id)
    if (!current) return

    const next = { ...current, ...fields }

    setState((prev) => ({
      ...prev,
      notes: prev.notes.map((note) => (note.id === id ? next : note)),
    }))

    void saveRemoteNote(next).catch((error) => {
      console.warn('[supabase] note update failed', error)
    })
  }

  function deleteNote(id: string) {
    const cascade = cascadeAttachments(
      (attachment) =>
        attachment.entityType === 'note' && attachment.entityId === id,
    )

    setState((prev) => ({
      ...cascade(prev),
      notes: prev.notes.filter((note) => note.id !== id),
    }))

    void deleteRemoteNote(id).catch((error) => {
      console.warn('[supabase] note delete failed', error)
    })
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
        void savePortfolioItem(item).catch((error) => {
      console.warn('[supabase] portfolio save failed', error)
    })
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
