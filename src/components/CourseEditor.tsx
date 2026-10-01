import { useState } from 'react'
import { useStore } from '../lib/store'
import { Button, Modal, Input, Select, Icon } from './ui'
import type { AcademicYear, ClassSchedule, Course, CourseStatus, DayOfWeek } from '../types'

export const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'planned', label: 'Planned' },
  { value: 'completed', label: 'Completed' },
]

export function blankForm(semId: string) {
  return { code: '', name: '', sks: '3', lecturer: '', status: 'active' as CourseStatus, semesterId: semId }
}

export function newSlot(): ClassSchedule {
  return { day: 'Monday', start: '08:00', end: '10:00' }
}

// ─── Schedule slot row ────────────────────────────────────────────────────────

const FIELD =
  'w-full text-sm bg-card border border-border rounded-md px-2 h-10 focus:outline-none focus:border-ring placeholder:text-muted-foreground'

export function SlotRow({
  slot,
  error,
  onChange,
  onRemove,
}: {
  slot: ClassSchedule
  error?: string
  onChange: (s: ClassSchedule) => void
  onRemove: () => void
}) {
  return (
    <div className="py-3 border-b border-border last:border-0">
      <div className="grid grid-cols-2 sm:grid-cols-[7rem_1fr_1fr] gap-2">
        <select
          aria-label="Day"
          value={slot.day}
          onChange={(e) => onChange({ ...slot, day: e.target.value as DayOfWeek })}
          className={`${FIELD} col-span-2 sm:col-span-1`}
        >
          {DAYS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <input
          aria-label="Start time"
          type="time"
          value={slot.start}
          onChange={(e) => onChange({ ...slot, start: e.target.value })}
          className={FIELD}
        />
        <input
          aria-label="End time"
          type="time"
          value={slot.end}
          onChange={(e) => onChange({ ...slot, end: e.target.value })}
          className={FIELD}
        />
      </div>
      <div className="flex items-center gap-2 mt-2">
        <input
          aria-label="Room"
          value={slot.room ?? ''}
          placeholder="Room (optional)"
          onChange={(e) => onChange({ ...slot, room: e.target.value })}
          className={`${FIELD} flex-1 min-w-0`}
        />
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap cursor-pointer h-10">
          <input
            type="checkbox"
            checked={slot.isLab ?? false}
            onChange={(e) => onChange({ ...slot, isLab: e.target.checked })}
            className="accent-primary"
          />
          Lab
        </label>
        <button
          type="button"
          aria-label="Remove slot"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive transition-colors w-10 h-10 flex items-center justify-center shrink-0"
        >
          <Icon name="x" size={14} />
        </button>
      </div>
      {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
    </div>
  )
}

// ─── Course form (shared between add and edit) ────────────────────────────────

export interface CourseFormState {
  code: string
  name: string
  sks: string
  lecturer: string
  status: CourseStatus
  semesterId: string
}

export function CourseForm({
  form,
  slots,
  errors,
  semesterOptions,
  onFieldChange,
  onSlotChange,
  onSlotAdd,
  onSlotRemove,
}: {
  form: CourseFormState
  slots: ClassSchedule[]
  errors: Record<string, string>
  semesterOptions: { value: string; label: string }[]
  onFieldChange: (f: Partial<CourseFormState>) => void
  onSlotChange: (i: number, s: ClassSchedule) => void
  onSlotAdd: () => void
  onSlotRemove: (i: number) => void
}) {
  return (
    <div className="space-y-4 overflow-y-auto" style={{ maxHeight: '60vh' }}>
      {/* Core fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Course Code"
          placeholder="e.g. MATH1061"
          value={form.code}
          onChange={(e) => onFieldChange({ code: e.target.value })}
          error={errors.code}
        />
        <Input
          label="SKS (Credits)"
          type="number"
          min={1}
          max={8}
          placeholder="3"
          value={form.sks}
          onChange={(e) => onFieldChange({ sks: e.target.value })}
          error={errors.sks}
        />
      </div>
      <Input
        label="Course Name"
        placeholder="e.g. Kalkulus I"
        value={form.name}
        onChange={(e) => onFieldChange({ name: e.target.value })}
        error={errors.name}
      />
      <div className="grid grid-cols-1 gap-3">
        <Input
          label="Lecturer"
          placeholder="Optional"
          value={form.lecturer}
          onChange={(e) => onFieldChange({ lecturer: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select
          label="Status"
          options={STATUS_OPTIONS}
          value={form.status}
          onChange={(e) => onFieldChange({ status: e.target.value as CourseStatus })}
        />
        <Select
          label="Semester"
          options={semesterOptions}
          value={form.semesterId}
          onChange={(e) => onFieldChange({ semesterId: e.target.value })}
        />
      </div>

      {/* Schedule */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Class Schedule
        </p>
        {slots.length > 0 ? (
          <div className="border border-border rounded-lg px-3">
            {slots.map((slot, i) => (
              <SlotRow
                key={i}
                slot={slot}
                error={errors[`slot${i}`]}
                onChange={(s) => onSlotChange(i, s)}
                onRemove={() => onSlotRemove(i)}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic mb-2">No schedule slots yet.</p>
        )}
        <button
          type="button"
          onClick={onSlotAdd}
          className="mt-2 text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
        >
          <Icon name="plus" size={12} />
          Add slot
        </button>
      </div>

      <p className="text-xs text-muted-foreground border-t border-border pt-3">
        Default grade template (Assignments 20% · Quizzes 20% · Midterm 25% · Final 35%) is applied automatically and
        can be fully edited in the course page.
      </p>
    </div>
  )
}


export function validateCourseForm(
  form: CourseFormState,
  slots: ClassSchedule[],
  years: AcademicYear[],
  targetSemId: string,
  excludeId?: string,
) {
  const errs: Record<string, string> = {}
  if (!form.code.trim()) errs.code = 'Required'
  if (!form.name.trim()) errs.name = 'Required'
  const sks = Number(form.sks)
  if (!Number.isFinite(sks) || sks < 1 || sks > 8) errs.sks = 'Must be 1–8'
  const targetSem = years.flatMap((y) => y.semesters).find((s) => s.id === targetSemId)
  if (targetSem && form.code.trim()) {
    const dup = targetSem.courses.some(
      (c) => c.code.toUpperCase() === form.code.trim().toUpperCase() && c.id !== excludeId,
    )
    if (dup) errs.code = 'Code already exists in that semester'
  }
  slots.forEach((s, i) => {
    if (!s.day || !s.start || !s.end) errs[`slot${i}`] = 'Day, start and end time are required'
    else if (s.start >= s.end) errs[`slot${i}`] = 'Start time must be before end time'
  })
  return errs
}

export function EditCourseModal({ course, onClose }: { course: Course | null; onClose: () => void }) {
  const { state, updateCourseField, moveCourse } = useStore()
  const [form, setForm] = useState<CourseFormState>(blankForm(''))
  const [slots, setSlots] = useState<ClassSchedule[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loadedId, setLoadedId] = useState<string | null>(null)

  if (course && loadedId !== course.id) {
    setLoadedId(course.id)
    setForm({
      code: course.code,
      name: course.name,
      sks: String(course.sks),
      lecturer: course.lecturer ?? '',
      status: course.status,
      semesterId: course.semesterId,
    })
    setSlots((course.classSchedule ?? []).map((s) => ({ ...s })))
    setErrors({})
  }
  if (!course && loadedId !== null) setLoadedId(null)

  const semesterOptions = state.academicYears.flatMap((y) =>
    y.semesters.map((s) => ({ value: s.id, label: `Year ${y.number} · Semester ${s.number}` })),
  )

  function save() {
    if (!course) return
    const errs = validateCourseForm(form, slots, state.academicYears, form.semesterId, course.id)
    if (Object.keys(errs).length) { setErrors(errs); return }
    if (form.semesterId !== course.semesterId) moveCourse(course.id, form.semesterId)
    updateCourseField(course.id, {
      code: form.code.trim(),
      name: form.name.trim(),
      sks: Number(form.sks),
      lecturer: form.lecturer.trim() || undefined,
      status: form.status,
      semesterId: form.semesterId,
      classSchedule: slots.map((s) => ({ ...s, room: s.room?.trim() || undefined })),
    })
    onClose()
  }

  return (
    <Modal
      open={!!course}
      onClose={onClose}
      title={`Edit — ${course?.code ?? ''}`}
      className="max-w-lg"
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save Changes</Button>
        </>
      }
    >
      <CourseForm
        form={form}
        slots={slots}
        errors={errors}
        semesterOptions={semesterOptions}
        onFieldChange={(f) => setForm((p) => ({ ...p, ...f }))}
        onSlotChange={(i, s) => setSlots((p) => p.map((x, idx) => (idx === i ? s : x)))}
        onSlotAdd={() => setSlots((p) => [...p, newSlot()])}
        onSlotRemove={(i) => setSlots((p) => p.filter((_, idx) => idx !== i))}
      />
    </Modal>
  )
}
