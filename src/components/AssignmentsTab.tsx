import { useState } from 'react'
import { Link } from 'react-router'
import { useStore } from '../lib/store'
import { getAssignmentSubmission, getAssignmentAssessment, getAssignmentTask, getAttachments, getCourseAssignments } from '../lib/selectors'
import { AttachmentSection, PendingFilesField, attachFiles } from './Attachments'
import { Badge, Button, EmptyState, Icon, Input, Modal, Select } from './ui'
import type { Assignment, AssignmentStatus, TaskPriority } from '../types'

const STATUS_OPTIONS: { value: AssignmentStatus; label: string }[] = [
  { value: 'pending', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'completed', label: 'Completed' },
]
export const STATUS_LABEL: Record<AssignmentStatus, string> = {
  pending: 'Not Started', in_progress: 'In Progress', submitted: 'Submitted', completed: 'Completed', graded: 'Graded',
}
export const STATUS_BADGE: Record<AssignmentStatus, 'muted' | 'primary' | 'accent' | 'success'> = {
  pending: 'muted', in_progress: 'primary', submitted: 'accent', completed: 'success', graded: 'success',
}
const PRIORITY_BADGE = { low: 'muted', medium: 'primary', high: 'accent' } as const
const TYPE_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'Homework', label: 'Homework' },
  { value: 'Lab Report', label: 'Lab Report' },
  { value: 'Essay', label: 'Essay' },
  { value: 'Project', label: 'Project' },
  { value: 'Presentation', label: 'Presentation' },
  { value: 'Quiz Prep', label: 'Quiz Prep' },
  { value: 'Other', label: 'Other' },
]

export function isOverdue(a: Assignment): boolean {
  if (!a.dueDate || a.status === 'completed' || a.status === 'graded') return false
  return a.dueDate < new Date().toLocaleDateString('en-CA')
}

export function fmtDateTime(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
  const tz = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(d).find((p) => p.type === 'timeZoneName')?.value
  return `${date} · ${time}${tz ? ' ' + tz : ''}`
}

export function fmtDate(iso?: string): string {
  if (!iso) return 'No deadline'
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface FormState {
  title: string
  description: string
  dueDate: string
  status: AssignmentStatus
  priority: TaskPriority | ''
  type: string
  assessmentId: string
}
const EMPTY: FormState = { title: '', description: '', dueDate: '', status: 'pending', priority: '', type: '', assessmentId: '' }

export function AssignmentsTab({ courseId }: { courseId: string }) {
  const { state, getCourse, addAssignment, updateAssignment, deleteAssignment, createAssignmentTask, toggleTask, addAttachment, setSubmission } =
    useStore()
  const course = getCourse(courseId)
  const [modal, setModal] = useState<'closed' | 'add' | string>('closed')
  const [form, setForm] = useState<FormState>(EMPTY)
  const [pending, setPending] = useState<File[]>([])
  const [fileErrors, setFileErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null)
  const [notice, setNotice] = useState<string[]>([])
  const [submitTarget, setSubmitTarget] = useState<Assignment | null>(null)
  const [submitNote, setSubmitNote] = useState('')

  if (!course) return null
  const assignments = [...getCourseAssignments(state, courseId)].sort((a, b) =>
    (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'),
  )
  const assessmentOptions = [
    { value: '', label: 'None' },
    ...course.gradeComponents.map((g) => ({ value: g.id, label: g.name })),
  ]
  const editing = modal !== 'closed' && modal !== 'add' ? assignments.find((a) => a.id === modal) : undefined

  function close() {
    setModal('closed')
    setPending([])
    setFileErrors([])
  }

  function openAdd() {
    setForm(EMPTY)
    setModal('add')
  }

  function openEdit(a: Assignment) {
    setForm({
      title: a.title,
      description: a.description ?? '',
      dueDate: a.dueDate ?? '',
      status: a.status,
      priority: a.priority ?? '',
      type: a.type ?? '',
      assessmentId: a.assessmentId ?? '',
    })
    setModal(a.id)
  }

  async function save() {
    if (!form.title.trim() || saving) return
    const data = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      dueDate: form.dueDate || undefined,
      status: form.status,
      priority: form.priority || undefined,
      type: form.type || undefined,
      assessmentId: form.assessmentId || undefined,
    }
    if (editing) {
      updateAssignment(courseId, editing.id, data)
      close()
      return
    }
    setSaving(true)
    const a = addAssignment(courseId, data)
    let errs: string[] = []
    if (pending.length > 0) {
      errs = await attachFiles(
        pending,
        { entityType: 'assignment', entityId: a.id, semesterId: a.semesterId, courseId },
        state.attachments,
        addAttachment,
      )
      setOpenId(a.id)
    }
    setSaving(false)
    close()
    setNotice(errs)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button icon="plus" onClick={openAdd}>
          Add Assignment
        </Button>
      </div>

      {notice.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
          <p className="text-xs font-medium text-destructive">Assignment saved, but some files were not attached:</p>
          {notice.map((e) => <p key={e} className="text-xs text-destructive break-words">{e}</p>)}
          <button type="button" className="text-xs underline text-muted-foreground" onClick={() => setNotice([])}>Dismiss</button>
        </div>
      )}

      {assignments.length === 0 ? (
        <EmptyState
          icon="file-text"
          title="No assignments yet"
          description="Add an assignment to track its deadline, files, task and assessment."
        />
      ) : (
        <div className="space-y-2">
          {assignments.map((a) => {
            const task = getAssignmentTask(state, a)
            const assessment = getAssignmentAssessment(state, a)
            const fileCount = getAttachments(state, 'assignment', a.id).length
            const open = openId === a.id
            const sub = getAssignmentSubmission(state, a)
            const submitted = sub?.status === 'submitted'
            return (
              <div key={a.id} className="bg-card border border-border rounded-lg min-w-0">
                <div className="p-3 sm:p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold uppercase tracking-wide break-words">{a.title}</p>
                      <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                        {isOverdue(a) ? <span className="text-destructive font-semibold">OVERDUE · {fmtDate(a.dueDate)}</span> : a.dueDate ? `Due ${fmtDate(a.dueDate)}` : 'No deadline'}
                        {a.type ? ` · ${a.type}` : ''}
                        {a.score !== undefined ? ` · ${a.score}/${a.maxScore}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1.5 shrink-0">
                      <Badge variant={STATUS_BADGE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                      {a.priority && <Badge variant={PRIORITY_BADGE[a.priority]}>{a.priority}</Badge>}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 min-w-0">
                    <div className="min-w-0 text-xs">
                      <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">Submission</p>
                      {submitted ? (
                        <p className="text-foreground break-words">
                          <span className="inline-flex items-center gap-1 font-medium"><Icon name="check" size={12} />Submitted</span>
                          {sub?.submittedAt && <span className="block text-muted-foreground font-mono">{fmtDateTime(sub.submittedAt)}</span>}
                          {sub?.note && <span className="block text-muted-foreground break-words">{sub.note}</span>}
                        </p>
                      ) : (
                        <p className="text-muted-foreground">Not submitted</p>
                      )}
                    </div>
                    {submitted ? (
                      <Button variant="outline" onClick={() => setSubmission(courseId, a.id, false)}>Mark as Not Submitted</Button>
                    ) : (
                      <Button variant="secondary" onClick={() => { setSubmitNote(''); setSubmitTarget(a) }}>Mark Submitted</Button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground min-w-0">
                    {fileCount > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Icon name="paperclip" size={12} />
                        {fileCount} {fileCount === 1 ? 'file' : 'files'}
                      </span>
                    )}
                    {assessment && (
                      <span className="inline-flex items-center gap-1 min-w-0">
                        <Icon name="award" size={12} />
                        <span className="truncate">Related Assessment: {assessment.name}</span>
                      </span>
                    )}
                    {a.assessmentId && !assessment && <span>Assessment unlinked</span>}
                    {task && (
                      <span className="inline-flex items-center gap-1">
                        <Icon name="check-square" size={12} />
                        Task {task.completed ? 'done' : 'open'}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button variant="outline" onClick={() => setOpenId(open ? null : a.id)}>
                      {open ? 'Close' : 'Open'}
                    </Button>
                    <Button variant="outline" icon="edit-2" onClick={() => openEdit(a)}>
                      Edit
                    </Button>
                    {!task && (
                      <Button variant="secondary" icon="plus" onClick={() => createAssignmentTask(courseId, a.id)}>
                        Create Task
                      </Button>
                    )}
                    {task && (
                      <Link
                        to={`/tasks?task=${task.id}`}
                        className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-md text-sm font-medium border border-border bg-secondary text-secondary-foreground hover:bg-muted transition-colors"
                      >
                        View Task
                      </Link>
                    )}
                    {assessment && (
                      <Link
                        to={`/course/${courseId}?tab=grades`}
                        className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-md text-sm font-medium border border-border bg-card hover:bg-muted transition-colors"
                      >
                        Open Grade
                      </Link>
                    )}
                    <Button variant="ghost" icon="trash-2" onClick={() => setDeleteTarget(a)}>
                      Delete
                    </Button>
                  </div>
                </div>

                {open && (
                  <div className="border-t border-border p-3 sm:p-4 space-y-4 bg-muted/20">
                    {a.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{a.description}</p>}
                    {task && (
                      <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-card min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleTask(task.id)}
                          aria-label="Toggle linked task"
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            task.completed ? 'bg-primary border-primary text-primary-foreground' : 'border-border hover:border-primary'
                          }`}
                        >
                          {task.completed && <Icon name="check" size={11} />}
                        </button>
                        <span className={`text-sm truncate ${task.completed ? 'line-through text-muted-foreground' : ''}`}>{task.title}</span>
                        {task.dueDate && <span className="ml-auto text-xs font-mono text-muted-foreground shrink-0">{task.dueDate}</span>}
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1.5">Assignment files (reference)</p>
                      <AttachmentSection entityType="assignment" entityId={a.id} semesterId={a.semesterId} courseId={courseId} compact />
                    </div>
                    {sub ? (
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1.5">Submitted files</p>
                        <AttachmentSection entityType="submission" entityId={sub.id} semesterId={a.semesterId} courseId={courseId} compact />
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Mark the assignment submitted to attach the files you handed in.</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal
        open={modal !== 'closed'}
        onClose={close}
        title={editing ? 'Edit Assignment' : 'Add Assignment'}
        actions={
          <>
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button onClick={save} disabled={saving || !form.title.trim()}>
              {saving ? 'Saving…' : editing ? 'Save' : 'Add'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Title" placeholder="e.g. Physics Lab Report 1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full text-sm bg-card rounded border border-border p-3 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Deadline" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            <Select
              label="Status"
              value={form.status}
              options={STATUS_OPTIONS}
              onChange={(e) => setForm({ ...form, status: e.target.value as AssignmentStatus })}
            />
            <Select
              label="Priority"
              value={form.priority}
              options={[{ value: '', label: 'None' }, { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]}
              onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority | '' })}
            />
            <Select label="Type" value={form.type} options={TYPE_OPTIONS} onChange={(e) => setForm({ ...form, type: e.target.value })} />
          </div>
          <Select
            label="Related Assessment"
            value={form.assessmentId}
            options={assessmentOptions}
            onChange={(e) => setForm({ ...form, assessmentId: e.target.value })}
          />
          {editing ? (
            <AttachmentSection entityType="assignment" entityId={editing.id} semesterId={editing.semesterId} courseId={courseId} />
          ) : (
            <PendingFilesField files={pending} onChange={setPending} errors={fileErrors} onErrors={setFileErrors} />
          )}
        </div>
      </Modal>

      <Modal
        open={!!submitTarget}
        onClose={() => setSubmitTarget(null)}
        title="Mark Submitted"
        actions={
          <>
            <Button variant="ghost" onClick={() => setSubmitTarget(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (submitTarget) {
                  setSubmission(courseId, submitTarget.id, true, submitNote)
                  setOpenId(submitTarget.id)
                }
                setSubmitTarget(null)
              }}
            >
              Mark Submitted
            </Button>
          </>
        }
      >
        <Input
          label="Note (optional)"
          placeholder="e.g. Submitted through Moodle"
          maxLength={140}
          value={submitNote}
          onChange={(e) => setSubmitNote(e.target.value)}
        />
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Assignment"
        actions={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget) deleteAssignment(courseId, deleteTarget.id)
                setDeleteTarget(null)
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground break-words">
          Delete “{deleteTarget?.title}”? Its files, its submission record and the task created from it are removed. The linked assessment and its grades are kept.
        </p>
      </Modal>
    </div>
  )
}
