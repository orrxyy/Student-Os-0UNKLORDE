import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useStore, useSemester } from '../lib/store'
import {
  semesterGPA,
  currentWeightedScore,
  finalScore,
  effectiveScore,
  letterGrade,
  formatGPA,
} from '../lib/grades'
import {
  Card,
  Badge,
  StatTile,
  EmptyState,
  Button,
  Modal,
  Input,
  Select,
  Icon,
} from '../components/ui'
import { CourseForm, EditCourseModal, blankForm, newSlot, validateCourseForm, type CourseFormState } from '../components/CourseEditor'
import type { Course, GradingScale, ClassSchedule } from '../types'

// ─── Constants ────────────────────────────────────────────────────────────────


const COURSE_COLORS: Record<string, { bar: string; tag: string; tagText: string }> = {
  MATH: { bar: 'bg-indigo-400', tag: 'bg-indigo-50 dark:bg-indigo-950/50', tagText: 'text-indigo-700 dark:text-indigo-300' },
  PHYS: { bar: 'bg-teal-500', tag: 'bg-teal-50 dark:bg-teal-950/50', tagText: 'text-teal-700 dark:text-teal-300' },
  IBDA: { bar: 'bg-primary', tag: 'bg-sage-light', tagText: 'text-primary' },
  IDIS: { bar: 'bg-purple-400', tag: 'bg-purple-50 dark:bg-purple-950/50', tagText: 'text-purple-700 dark:text-purple-300' },
  PHED: { bar: 'bg-emerald-500', tag: 'bg-emerald-50 dark:bg-emerald-950/50', tagText: 'text-emerald-700 dark:text-emerald-300' },
  THEO: { bar: 'bg-amber-500', tag: 'bg-amber-50 dark:bg-amber-950/50', tagText: 'text-amber-700 dark:text-amber-300' },
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


// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCourseColor(code: string) {
  const prefix = code.replace(/[0-9]/g, '').slice(0, 4)
  return COURSE_COLORS[prefix] ?? { bar: 'bg-muted-foreground', tag: 'bg-muted', tagText: 'text-muted-foreground' }
}

// ─── Course card ──────────────────────────────────────────────────────────────

function CourseCard({
  course,
  gradingScale,
  onEdit,
  onDelete,
}: {
  course: Course
  gradingScale: GradingScale
  onEdit: (c: Course) => void
  onDelete: (c: Course) => void
}) {
  const current = currentWeightedScore(course)
  const final = finalScore(course)
  const displayScore = final ?? current
  const letter = displayScore !== null ? letterGrade(displayScore, gradingScale) : null
  const done = course.gradeComponents.filter((c) => !c.isBonus && effectiveScore(c) !== null).length
  const total = course.gradeComponents.filter((c) => !c.isBonus).length
  const pct = total > 0 ? (done / total) * 100 : 0
  const color = getCourseColor(course.code)

  return (
    <Card className="group overflow-hidden relative">
      {/* Colored top bar */}
      <div className={`h-1 w-full ${color.bar}`} />

      <div className="p-5">
        {/* Hover action buttons — top-right, revealed on group hover */}
        <div className="absolute top-3 right-3 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            type="button"
            onClick={() => onEdit(course)}
            title="Edit course"
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon name="edit-2" size={12} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(course)}
            title="Delete course"
            className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
          >
            <Icon name="trash-2" size={12} />
          </button>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <Link to={`/course/${course.id}`} className="min-w-0 flex-1 pr-12">
            <span
              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold mb-1.5 ${color.tag} ${color.tagText}`}
            >
              {course.code}
            </span>
            <p className="font-display text-[13px] font-semibold leading-snug hover:text-primary transition-colors">
              {course.name}
            </p>
          </Link>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge variant="outline">{course.sks} SKS</Badge>
            {final !== null && <Badge variant="primary">{letter}</Badge>}
          </div>
        </div>

        {/* Score */}
        <div className="flex items-end justify-between mb-3">
          <div>
            {displayScore !== null ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-display font-bold text-foreground">
                  {displayScore.toFixed(1)}
                </span>
                {letter && current === null && (
                  <span className={`text-sm font-display font-bold ${LETTER_STYLE[letter] ?? ''}`}>{letter}</span>
                )}
                {current !== null && final === null && (
                  <span className="text-xs text-muted-foreground font-mono">current</span>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No grades entered</p>
            )}
          </div>
          {course.lecturer && (
            <p className="text-[10px] text-muted-foreground text-right max-w-[100px] line-clamp-1">
              {course.lecturer}
            </p>
          )}
        </div>

        {/* Component progress */}
        <div>
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground mb-1.5">
            <span>{done}/{total} components</span>
            {done > 0 && <span>{Math.round(pct)}%</span>}
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${color.bar}`}
              style={{ width: `${pct}%`, opacity: pct > 0 ? 1 : 0 }}
            />
          </div>
        </div>
      </div>
    </Card>
  )
}

// ─── SemesterPage ─────────────────────────────────────────────────────────────

export function SemesterPage() {
  const { year: yearParam, sem: semParam } = useParams<{ year: string; sem: string }>()
  const yearNum = Number(yearParam) as 1 | 2 | 3 | 4
  const semNum = Number(semParam) as 1 | 2
  const { addCourse, updateCourseField, deleteCourse, moveCourse, setActiveSemester, state } = useStore()
  const data = useSemester(yearNum, semNum)

  // ── Add modal state ──
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState(() => blankForm(''))
  const [addSlots, setAddSlots] = useState<ClassSchedule[]>([])
  const [addErrors, setAddErrors] = useState<Record<string, string>>({})

  // ── Edit modal state ──
  const [editTarget, setEditTarget] = useState<Course | null>(null)

  // ── Delete confirmation ──
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null)

  if (!data) {
    return (
      <div className="p-4 md:p-6">
        <EmptyState icon="alert-circle" title="Semester not found" />
      </div>
    )
  }

  const { year, semester } = data
  const courses = semester.courses
  const totalSKS = courses.reduce((a, c) => a + c.sks, 0)
  const semGPA = semesterGPA(courses, state.gradingScale)
  const isActive = state.activeSemesterId === semester.id

  // All semester options for the "move to" selector
  const semesterOptions = state.academicYears.flatMap((y) =>
    y.semesters.map((s) => ({ value: s.id, label: `Year ${y.number} · Semester ${s.number}` }))
  )

  function validate(form: CourseFormState, slots: ClassSchedule[], targetSemId: string) {
    return validateCourseForm(form, slots, state.academicYears, targetSemId)
  }

  // ── Add handlers ──
  function openAdd() {
    setAddForm(blankForm(semester.id))
    setAddSlots([])
    setAddErrors({})
    setAddOpen(true)
  }

  function handleAdd() {
    const errs = validate(addForm, addSlots, addForm.semesterId)
    if (Object.keys(errs).length) { setAddErrors(errs); return }
    addCourse(addForm.semesterId, {
      code: addForm.code.trim(),
      name: addForm.name.trim(),
      sks: Number(addForm.sks),
      lecturer: addForm.lecturer.trim() || undefined,
      status: addForm.status,
      classSchedule: addSlots,
    })
    setAddOpen(false)
  }

  // ── Edit handlers ──
  function openEdit(course: Course) {
    setEditTarget(course)
  }

  // ── Delete handler ──
  function handleDelete() {
    if (!deleteTarget) return
    deleteCourse(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb + header */}
      <div>
        <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
          <Link to="/academics" className="hover:text-foreground transition-colors">
            Academics
          </Link>
          <Icon name="chevron-right" size={11} />
          <span className="text-foreground font-medium">Year {yearNum} · Semester {semNum}</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-semibold">Year {yearNum} · Semester {semNum}</h1>
            {isActive ? (
              <p className="text-xs text-muted-foreground mt-0.5">Current active semester</p>
            ) : (
              <button
                type="button"
                onClick={() => setActiveSemester(semester.id)}
                className="text-xs text-muted-foreground hover:text-primary mt-0.5 flex items-center gap-1 transition-colors"
              >
                <Icon name="check" size={11} />
                Set as active semester
              </button>
            )}
          </div>
          <Button onClick={openAdd} icon="plus" size="sm">
            Add Course
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 px-4 md:px-5 py-4 bg-card border border-border rounded-xl">
        <StatTile label="Courses" value={courses.length} />
        <div className="w-px h-10 bg-border" />
        <StatTile label="Total SKS" value={totalSKS || '—'} />
        <div className="w-px h-10 bg-border" />
        <StatTile
          label="Semester GPA"
          value={formatGPA(semGPA)}
          accent={semGPA !== null}
          sub={semGPA !== null ? 'calculated' : 'no grades yet'}
        />
        {isActive && (
          <>
            <div className="w-px h-10 bg-border" />
            <Badge variant="secondary" className="self-center">Active Semester</Badge>
          </>
        )}
      </div>

      {/* Course grid */}
      {courses.length === 0 ? (
        <EmptyState
          icon="book-open"
          title="No courses yet"
          description="Add your first course to begin this semester."
          action={
            <Button onClick={openAdd} icon="plus">
              Add Course
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {courses.map((c) => (
            <CourseCard
              key={c.id}
              course={c}
              gradingScale={state.gradingScale}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Add Course modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Course"
        className="max-w-lg"
        actions={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add Course</Button>
          </>
        }
      >
        <CourseForm
          form={addForm}
          slots={addSlots}
          errors={addErrors}
          semesterOptions={semesterOptions}
          onFieldChange={(f) => setAddForm((prev) => ({ ...prev, ...f }))}
          onSlotChange={(i, s) => setAddSlots((prev) => prev.map((x, idx) => (idx === i ? s : x)))}
          onSlotAdd={() => setAddSlots((prev) => [...prev, newSlot()])}
          onSlotRemove={(i) => setAddSlots((prev) => prev.filter((_, idx) => idx !== i))}
        />
      </Modal>

      {/* Edit Course modal */}
      <EditCourseModal course={editTarget} onClose={() => setEditTarget(null)} />

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Course"
        actions={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-foreground">
            {deleteTarget?.code} — {deleteTarget?.name}
          </span>
          ? This will permanently remove all grades, tasks, and materials for this course.
        </p>
      </Modal>
    </div>
  )
}
