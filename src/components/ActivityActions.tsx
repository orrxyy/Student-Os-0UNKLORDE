import { useState } from 'react'
import { useStore } from '../lib/store'
import { weeksForSemester } from '../data/academicWeeks'
import { courseOf, type ActivityEvent } from '../lib/timeline'
import { Button, Input, Modal, Select } from './ui'

const WEEK_NOTE = 'Choose a week to move this entry; "Auto" places it by the date it was recorded.'

type Loaded = { title: string; content: string; score: string; week: string; label: string }

function useLoader(event: ActivityEvent) {
  const { state } = useStore()
  return (): Loaded | null => {
    const course = courseOf(state, event.courseId)
    const wk = (n?: number) => (n ? String(n) : '')
    switch (event.type) {
      case 'note': {
        const n = state.notes.find((x) => x.id === event.entityId)
        return n ? { title: n.title ?? '', content: n.content, score: '', week: wk(n.week), label: 'Note' } : null
      }
      case 'task': {
        const t = [...state.globalTasks, ...(course?.tasks ?? [])].find((x) => x.id === event.entityId)
        return t ? { title: t.title, content: '', score: '', week: wk(t.academicWeek), label: 'Task' } : null
      }
      case 'assignment': {
        const a = course?.assignments?.find((x) => x.id === event.entityId)
        return a ? { title: a.title, content: '', score: '', week: wk(a.academicWeek), label: 'Assignment' } : null
      }
      case 'submission': {
        const a = course?.assignments?.find((x) => x.id === event.subId)
        return a ? { title: a.title, content: '', score: '', week: wk(a.academicWeek), label: 'Submission' } : null
      }
      case 'material': {
        const m = course?.materials.find((x) => x.id === event.entityId)
        return m ? { title: m.title || m.topic, content: '', score: '', week: wk(m.academicWeek), label: 'Material' } : null
      }
      case 'grade': {
        const comp = course?.gradeComponents.find((x) => x.id === event.entityId)
        if (!comp) return null
        const entry = event.subId ? comp.scores?.find((x) => x.id === event.subId) : undefined
        const value = entry ? entry.value : comp.score
        return { title: entry?.label ?? comp.name, content: '', score: value === null || value === undefined ? '' : String(value), week: wk(entry ? entry.academicWeek : comp.academicWeek), label: 'Grade' }
      }
      default:
        return null
    }
  }
}

function EditForm({ event, initial, onClose }: { event: ActivityEvent; initial: Loaded; onClose: () => void }) {
  const { state, updateNote, updateTask, updateAssignment, updateMaterial, updateCourseComponents } = useStore()
  const [f, setF] = useState(initial)
  const [error, setError] = useState('')
  const weeks = weeksForSemester(event.semesterId)
  const week = f.week ? Number(f.week) : undefined
  const course = courseOf(state, event.courseId)

  function save() {
    const title = f.title.trim()
    if (event.type === 'note' && !f.content.trim()) return setError('Note content is required')
    if (['task', 'assignment', 'material'].includes(event.type) && !title) return setError('Title is required')
    if (event.type === 'grade') {
      const v = Number(f.score)
      if (f.score.trim() === '' || !Number.isFinite(v) || v < 0) return setError('Enter a valid score')
    }
    const id = event.entityId!
    switch (event.type) {
      case 'note':
        updateNote(id, { title: title || undefined, content: f.content.trim(), week })
        break
      case 'task':
        updateTask(id, { title, academicWeek: week })
        break
      case 'assignment':
        updateAssignment(event.courseId!, id, { title, academicWeek: week })
        break
      case 'submission':
        updateAssignment(event.courseId!, event.subId!, { academicWeek: week })
        break
      case 'material': {
        const m = course?.materials.find((x) => x.id === id)
        updateMaterial(event.courseId!, id, { topic: title, title: m?.title ? title : undefined, academicWeek: week })
        break
      }
      case 'grade': {
        if (!course) break
        const v = Number(f.score)
        updateCourseComponents(
          course.id,
          course.gradeComponents.map((c) =>
            c.id !== id
              ? c
              : event.subId
                ? { ...c, scores: c.scores.map((e) => (e.id === event.subId ? { ...e, value: v, academicWeek: week } : e)) }
                : { ...c, score: v, academicWeek: week },
          ),
        )
        break
      }
    }
    onClose()
  }

  const set = (p: Partial<Loaded>) => { setF((x) => ({ ...x, ...p })); setError('') }
  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit ${initial.label}`}
      actions={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save}>Save</Button></>}
    >
      <div className="space-y-3">
        {event.type !== 'submission' && event.type !== 'grade' && (
          <Input label={event.type === 'note' ? 'Title (optional)' : 'Title'} value={f.title} onChange={(e) => set({ title: e.target.value })} />
        )}
        {event.type === 'grade' && (
          <>
            <p className="text-sm font-medium">{f.title}</p>
            <Input label="Score" type="number" value={f.score} onChange={(e) => set({ score: e.target.value })} />
          </>
        )}
        {event.type === 'note' && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Content</label>
            <textarea rows={4} value={f.content} onChange={(e) => set({ content: e.target.value })} className="bg-card border border-border rounded px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring outline-none w-full resize-y" />
          </div>
        )}
        {event.type === 'submission' && <p className="text-sm font-medium">{f.title}</p>}
        <Select
          label={event.type === 'submission' ? 'Assignment week' : 'Academic week'}
          value={f.week}
          onChange={(e) => set({ week: e.target.value })}
          options={[{ value: '', label: 'Auto (by date)' }, ...weeks.map((w) => ({ value: String(w.number), label: `Week ${w.number}` }))]}
        />
        <p className="text-xs text-muted-foreground">{WEEK_NOTE}</p>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </Modal>
  )
}

const DELETE_TEXT: Record<string, string> = {
  grade: 'Delete this grade entry? This removes the score from the course grades.',
  task: 'Delete this task? This removes the task itself.',
  assignment: 'Delete this assignment? Its linked task, submission and attachments follow the usual cleanup rules.',
  material: 'Delete this material? This removes the material from the course.',
  note: 'Delete this note? This removes the note and its attachments.',
  submission: 'Remove this submission? The assignment will be marked as not submitted.',
}

export function ActivityMenu({ event }: { event: ActivityEvent }) {
  const store = useStore()
  const load = useLoader(event)
  const [menu, setMenu] = useState(false)
  const [mode, setMode] = useState<null | 'edit' | 'delete'>(null)
  const [initial, setInitial] = useState<Loaded | null>(null)
  const { state } = store

  function openEdit() {
    setMenu(false)
    const l = load()
    if (l) { setInitial(l); setMode('edit') }
  }

  function doDelete() {
    const id = event.entityId!
    const course = courseOf(state, event.courseId)
    switch (event.type) {
      case 'note': store.deleteNote(id); break
      case 'task': store.deleteTask(id); break
      case 'assignment': store.deleteAssignment(event.courseId!, id); break
      case 'material': store.deleteMaterial(event.courseId!, id); break
      case 'submission': store.setSubmission(event.courseId!, event.subId!, false); break
      case 'grade':
        if (course)
          store.updateCourseComponents(
            course.id,
            course.gradeComponents.map((c) =>
              c.id !== id
                ? c
                : event.subId
                  ? { ...c, scores: c.scores.filter((e) => e.id !== event.subId) }
                  : { ...c, score: null, scoredAt: undefined, academicWeek: undefined },
            ),
          )
        break
    }
    setMode(null)
  }

  return (
    <>
      <div className="relative">
        <button
          type="button"
          aria-label="Activity actions"
          aria-haspopup="menu"
          onClick={() => setMenu((v) => !v)}
          className="w-10 h-10 sm:w-8 sm:h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted sm:opacity-0 sm:group-hover/row:opacity-100 sm:focus:opacity-100 transition-opacity text-lg leading-none"
        >
          ⋯
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setMenu(false)} />
            <div role="menu" className="absolute right-0 top-full mt-1 z-30 min-w-32 rounded-lg border border-border bg-card shadow-lg py-1">
              <button role="menuitem" className="w-full text-left px-3 min-h-10 text-sm hover:bg-muted" onClick={openEdit}>Edit</button>
              <button role="menuitem" className="w-full text-left px-3 min-h-10 text-sm text-destructive hover:bg-muted" onClick={() => { setMenu(false); setMode('delete') }}>Delete</button>
            </div>
          </>
        )}
      </div>
      {mode === 'edit' && initial && <EditForm event={event} initial={initial} onClose={() => setMode(null)} />}
      <Modal
        open={mode === 'delete'}
        onClose={() => setMode(null)}
        title="Delete activity"
        actions={<><Button variant="ghost" onClick={() => setMode(null)}>Cancel</Button><Button variant="destructive" onClick={doDelete}>Delete</Button></>}
      >
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{event.title}</span>
          <br />
          {DELETE_TEXT[event.type]}
        </p>
      </Modal>
    </>
  )
}
