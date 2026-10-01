import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useStore } from '../lib/store'
import { getActiveCourses } from '../lib/selectors'
import { CertificateEditor } from './CertificateEditor'
import { PortfolioItemEditor } from './PortfolioItemEditor'
import { Modal, Button, Badge, Input, Select, Icon } from './ui'
import type { MaterialType, TaskPriority } from '../types'
import {
  parseIntent, commitIntent,
  type Intent, isReady, ENTITY_LABELS,
  type EntityType, type Overrides, type CommitResult,
} from '../lib/addAnything'
import { getSemesterLabel } from '../lib/selectors'

// ─── Types ────────────────────────────────────────────────────────────────────

type InputTab = 'grade' | 'task' | 'material' | 'note' | 'certificate' | 'portfolio'
type GradeMode = 'score' | 'letter'

const LETTERS = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F']

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

// ─── Grade Score tab ──────────────────────────────────────────────────────────

function GradeScoreForm({
  courses,
  onSave,
}: {
  courses: ReturnType<typeof getActiveCourses>
  onSave: () => void
}) {
  const { state, updateCourseComponents } = useStore()
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '')
  const [compId, setCompId] = useState('')
  const [scoreStr, setScoreStr] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const course = courses.find((c) => c.id === courseId)
  const components = (course?.gradeComponents ?? []).filter((c) => !c.isBonus)

  function handleSave() {
    setError('')
    const score = parseFloat(scoreStr)
    if (isNaN(score) || score < 0) { setError('Enter a valid score (0 or above)'); return }
    if (!compId) { setError('Select a component'); return }
    if (!course) return

    const updated = course.gradeComponents.map((c) =>
      c.id === compId
        ? c.scoringMode === 'single'
          ? { ...c, score }
          : {
              ...c,
              scores: [
                ...c.scores,
                { id: `score_${Date.now()}`, label: `Score ${c.scores.length + 1}`, value: score },
              ],
            }
        : c,
    )
    updateCourseComponents(course.id, updated)
    setSaved(true)
    setTimeout(() => { setSaved(false); setScoreStr(''); setCompId('') }, 1500)
  }

  if (courses.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No active courses found.</p>
  }

  return (
    <div className="space-y-3">
      <Select
        label="Course"
        options={courses.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
        value={courseId}
        onChange={(e) => { setCourseId(e.target.value); setCompId(''); setSaved(false) }}
      />
      <Select
        label="Component"
        options={[{ value: '', label: '— select —' }, ...components.map((c) => ({ value: c.id, label: c.name }))]}
        value={compId}
        onChange={(e) => setCompId(e.target.value)}
      />
      <Input
        label="Score"
        type="number"
        step="0.01"
        min={0}
        placeholder={course ? `0 – ${components.find((c) => c.id === compId)?.maxScore ?? 100}` : ''}
        value={scoreStr}
        onChange={(e) => setScoreStr(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        error={error}
      />
      {saved && (
        <p className="text-xs text-emerald-600 flex items-center gap-1">
          <Icon name="check" size={12} /> Score saved.
        </p>
      )}
      <div className="pt-1 flex justify-end">
        <Button onClick={handleSave} size="sm">Save Score</Button>
      </div>
    </div>
  )
}

// ─── Grade Letter tab ─────────────────────────────────────────────────────────

function GradeLetterForm({
  courses,
}: {
  courses: ReturnType<typeof getActiveCourses>
}) {
  const { updateCourseField } = useStore()
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '')
  const [letter, setLetter] = useState('B+')
  const [saved, setSaved] = useState(false)

  function handleSave() {
    if (!courseId) return
    updateCourseField(courseId, { courseLetterGrade: letter })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  if (courses.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No active courses found.</p>
  }

  return (
    <div className="space-y-3">
      <Select
        label="Course"
        options={courses.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
        value={courseId}
        onChange={(e) => { setCourseId(e.target.value); setSaved(false) }}
      />
      <Select
        label="Letter Grade"
        options={LETTERS.map((l) => ({ value: l, label: l }))}
        value={letter}
        onChange={(e) => setLetter(e.target.value)}
      />
      <p className="text-[11px] text-muted-foreground bg-muted px-3 py-2 rounded-md">
        This sets a course-level letter grade without requiring a numerical score. The grading scale is used for GPA
        calculation. Numeric component scores take precedence if entered.
      </p>
      {saved && (
        <p className="text-xs text-emerald-600 flex items-center gap-1">
          <Icon name="check" size={12} /> Letter grade saved for {courses.find((c) => c.id === courseId)?.code}.
        </p>
      )}
      <div className="pt-1 flex justify-end">
        <Button onClick={handleSave} size="sm">Save Letter Grade</Button>
      </div>
    </div>
  )
}

// ─── Task tab ─────────────────────────────────────────────────────────────────

function TaskForm({ courses }: { courses: ReturnType<typeof getActiveCourses> }) {
  const { addTask } = useStore()
  const [title, setTitle] = useState('')
  const [courseId, setCourseId] = useState('')
  const [due, setDue] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  function handleSave() {
    if (!title.trim()) { setError('Task title is required'); return }
    setError('')
    addTask({
      title: title.trim(),
      courseId: courseId || undefined,
      dueDate: due || undefined,
      priority,
      completed: false,
    })
    setSaved(true)
    setTimeout(() => { setSaved(false); setTitle(''); setDue(''); setCourseId('') }, 1500)
  }

  return (
    <div className="space-y-3">
      <Input
        label="Task Title"
        placeholder="e.g. Complete assignment 3"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        error={error}
      />
      <Select
        label="Course (optional)"
        options={[{ value: '', label: '— none —' }, ...courses.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))]}
        value={courseId}
        onChange={(e) => setCourseId(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Due Date"
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
        />
        <Select
          label="Priority"
          options={PRIORITY_OPTIONS}
          value={priority}
          onChange={(e) => setPriority(e.target.value as TaskPriority)}
        />
      </div>
      {saved && (
        <p className="text-xs text-emerald-600 flex items-center gap-1">
          <Icon name="check" size={12} /> Task added.
        </p>
      )}
      <div className="pt-1 flex justify-end">
        <Button onClick={handleSave} size="sm">Add Task</Button>
      </div>
    </div>
  )
}

// ─── Material tab ─────────────────────────────────────────────────────────────

const MATERIAL_TYPE_OPTIONS: { value: MaterialType; label: string }[] = [
  { value: 'lecture', label: 'Lecture Slides' },
  { value: 'reading', label: 'Reading' },
  { value: 'video', label: 'Video' },
  { value: 'lab', label: 'Lab Sheet' },
  { value: 'other', label: 'Other' },
]

function MaterialForm({ courses }: { courses: ReturnType<typeof getActiveCourses> }) {
  const { addMaterial } = useStore()
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '')
  const [topic, setTopic] = useState('')
  const [week, setWeek] = useState('1')
  const [type, setType] = useState<MaterialType>('lecture')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  function handleSave() {
    if (!topic.trim()) { setError('Topic / title is required'); return }
    if (!courseId) { setError('Select a course'); return }
    setError('')
    addMaterial(courseId, {
      topic: topic.trim(),
      week: parseInt(week) || 1,
      type,
      url: url.trim() || undefined,
    })
    setSaved(true)
    setTimeout(() => { setSaved(false); setTopic(''); setUrl('') }, 1500)
  }

  if (courses.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No active courses found.</p>
  }

  return (
    <div className="space-y-3">
      <Select
        label="Course"
        options={courses.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
        value={courseId}
        onChange={(e) => { setCourseId(e.target.value); setSaved(false) }}
      />
      <Input
        label="Topic / Title"
        placeholder="e.g. Week 4 Lecture Slides"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        error={error}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Week"
          type="number"
          min={1}
          max={16}
          value={week}
          onChange={(e) => setWeek(e.target.value)}
        />
        <Select
          label="Type"
          options={MATERIAL_TYPE_OPTIONS}
          value={type}
          onChange={(e) => setType(e.target.value as MaterialType)}
        />
      </div>
      <Input
        label="URL (optional)"
        placeholder="https://..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      {saved && (
        <p className="text-xs text-emerald-600 flex items-center gap-1">
          <Icon name="check" size={12} /> Material added.
        </p>
      )}
      <div className="pt-1 flex justify-end">
        <Button onClick={handleSave} size="sm">Add Material</Button>
      </div>
    </div>
  )
}

// ─── Note tab ─────────────────────────────────────────────────────────────────

const WEEK_OPTIONS = [
  { value: '', label: 'No week' },
  ...Array.from({ length: 14 }, (_, i) => ({ value: String(i + 1), label: `Week ${i + 1}` })),
]

function NoteForm({ courses, onClose }: { courses: ReturnType<typeof getActiveCourses>; onClose: () => void }) {
  const { addNote } = useStore()
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [week, setWeek] = useState('')
  const [taskId, setTaskId] = useState('')
  const [assessmentId, setAssessmentId] = useState('')
  const [errors, setErrors] = useState<{ course?: string; content?: string }>({})

  const course = courses.find((c) => c.id === courseId)

  function handleSave() {
    const errs: typeof errors = {}
    if (!course) errs.course = 'Select a course'
    if (!content.trim()) errs.content = 'Note content is required'
    setErrors(errs)
    if (!course || errs.content) return
    addNote({
      courseId: course.id,
      semesterId: course.semesterId,
      title: title.trim() || undefined,
      content: content.trim(),
      week: week ? Number(week) : undefined,
      relatedTaskId: taskId || undefined,
      relatedAssessmentId: assessmentId || undefined,
    })
    onClose()
  }

  if (courses.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No active courses found.</p>
  }

  return (
    <div className="space-y-3">
      <Select
        label="Course"
        options={courses.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
        value={courseId}
        onChange={(e) => { setCourseId(e.target.value); setTaskId(''); setAssessmentId('') }}
      />
      {errors.course && <p className="text-xs text-destructive">{errors.course}</p>}
      <Input label="Title (optional)" placeholder="e.g. Limits recap" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Content</label>
        <textarea
          rows={5}
          value={content}
          placeholder="Write your note…"
          onChange={(e) => setContent(e.target.value)}
          className="bg-card border border-border rounded px-3 py-2 text-sm font-sans focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors resize-y w-full"
        />
        {errors.content && <p className="text-xs text-destructive">{errors.content}</p>}
      </div>
      <Select label="Week (optional)" options={WEEK_OPTIONS} value={week} onChange={(e) => setWeek(e.target.value)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select
          label="Related task"
          options={[{ value: '', label: 'None' }, ...(course?.tasks ?? []).map((t) => ({ value: t.id, label: t.title }))]}
          value={taskId}
          onChange={(e) => setTaskId(e.target.value)}
        />
        <Select
          label="Related assessment"
          options={[{ value: '', label: 'None' }, ...(course?.gradeComponents ?? []).map((g) => ({ value: g.id, label: g.name }))]}
          value={assessmentId}
          onChange={(e) => setAssessmentId(e.target.value)}
        />
      </div>
      <div className="pt-1 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={handleSave}>Add Note</Button>
      </div>
    </div>
  )
}

function CertificateTab({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Save a certificate or credential with its issuer, dates and files. It is stored in your global Certificates inventory.</p>
      <Button onClick={() => setOpen(true)} size="sm">Open certificate form</Button>
      {open && <CertificateEditor onClose={() => setOpen(false)} onSaved={onSaved} />}
    </div>
  )
}

function PortfolioTab({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Save a project, organization, volunteer work, achievement or other experience. It is stored in your global Portfolio inventory.</p>
      <Button onClick={() => setOpen(true)} size="sm">Open portfolio item form</Button>
      {open && <PortfolioItemEditor onClose={() => setOpen(false)} onSaved={() => { onSaved(); navigate('/portfolio') }} />}
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  seed?: string
}

function ManualForms({ onClose }: { onClose: () => void }) {
  const { state } = useStore()
  const [tab, setTab] = useState<InputTab>('grade')
  const [gradeMode, setGradeMode] = useState<GradeMode>('score')
  const activeCourses = getActiveCourses(state)
  const TABS: { key: InputTab; label: string; icon: string }[] = [
    { key: 'grade', label: 'Grade', icon: '📊' },
    { key: 'task', label: 'Task', icon: '✓' },
    { key: 'material', label: 'Material', icon: '📁' },
    { key: 'note', label: 'Note', icon: '📝' },
    { key: 'certificate', label: 'Certificate', icon: '🏅' },
    { key: 'portfolio', label: 'Portfolio Item', icon: '💼' },
  ]
  return (
    <div>
      <div className="flex gap-1 border-b border-border mb-4 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'grade' && (
        <div className="space-y-4">
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {(['score', 'letter'] as GradeMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setGradeMode(m)}
                className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
                  gradeMode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'score' ? 'Numeric Score' : 'Letter Grade'}
              </button>
            ))}
          </div>
          {gradeMode === 'score' ? (
            <GradeScoreForm courses={activeCourses} onSave={onClose} />
          ) : (
            <GradeLetterForm courses={activeCourses} />
          )}
        </div>
      )}
      {tab === 'task' && <TaskForm courses={activeCourses} />}
      {tab === 'material' && <MaterialForm courses={activeCourses} />}
      {tab === 'note' && <NoteForm courses={activeCourses} onClose={onClose} />}
      {tab === 'certificate' && <CertificateTab onSaved={onClose} />}
      {tab === 'portfolio' && <PortfolioTab onSaved={onClose} />}
    </div>
  )
}

const EXAMPLES = ['Quiz 2 IDIS 87', 'IDIS = B+', 'Finish physics lab report tomorrow', 'Material IDIS Week 4', 'course semester 2']

export function AddAnythingModal({ open, onClose, seed = '' }: Props) {
  const store = useStore()
  const { state, setActiveSemester } = store
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [overrides, setOverrides] = useState<Overrides>({})
  const [manual, setManual] = useState(false)
  const [picking, setPicking] = useState<null | 'course' | 'entity' | 'component'>(null)
  const [draft, setDraft] = useState<{ code: string; name: string; sks: string }>({ code: '', name: '', sks: '' })
  const [result, setResult] = useState<CommitResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setText(seed)
      setOverrides({})
      setManual(false)
      setPicking(null)
      setResult(null)
      setError('')
      setDraft({ code: '', name: '', sks: '' })
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open, seed])

  const intent = useMemo(() => (text.trim() ? parseIntent(text, state, overrides) : null), [text, state, overrides]) as Intent | null

  function reset(next = '') {
    setText(next); setOverrides({}); setPicking(null); setResult(null); setError('')
    setDraft({ code: '', name: '', sks: '' })
    setTimeout(() => inputRef.current?.focus(), 30)
  }

  function commit() {
    if (!intent) return
    setError('')
    const sks = draft.sks ? parseInt(draft.sks, 10) : undefined
    const d = { code: draft.code || undefined, name: draft.name || undefined, sks }
    if (intent.issues.length) { setError(intent.issues[0]); return }
    if (intent.ambiguity) { setPicking(intent.ambiguity.kind); return }
    const r = commitIntent(intent, store, d)
    if (!r.ok) { setError(r.message); return }
    setResult(r)
  }

  const needsDraft = intent?.entity === 'course' && intent.missing.length > 0
  const draftComplete = !needsDraft || ((intent!.missing.includes('code') ? draft.code.trim() : true) && (intent!.missing.includes('name') ? draft.name.trim() : true) && (intent!.missing.includes('sks') ? draft.sks.trim() : true))
  const canCommit = !!intent && !intent.ambiguity && !intent.issues.length && draftComplete
  const switchTarget = result?.semesterId && result.semesterId !== state.activeSemesterId ? result.semesterId : null

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); if (canCommit) commit(); else if (intent?.ambiguity) setPicking(intent.ambiguity.kind) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Anything" className="max-w-lg">
      {result ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-sage-light border border-border">
            <Icon name="check" size={16} className="text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-foreground">{result.message}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="primary" className="min-h-11" onClick={() => reset()}>Add another</Button>
            {switchTarget && (
              <Button variant="secondary" className="min-h-11" onClick={() => { setActiveSemester(switchTarget); onClose() }}>
                Switch to {getSemesterLabel(state, switchTarget)}
              </Button>
            )}
            {result.href && (
              <Button variant="ghost" className="min-h-11" onClick={() => { onClose(); navigate(result.href!) }}>Open</Button>
            )}
          </div>
        </div>
      ) : manual ? (
        <div>
          <button type="button" onClick={() => setManual(false)} className="text-xs text-accent mb-3 min-h-8 flex items-center gap-1">
            <Icon name="chevron-left" size={12} /> Back to smart input
          </button>
          <ManualForms onClose={onClose} />
        </div>
      ) : (
        <div className="space-y-3">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => { setText(e.target.value); setOverrides({}); setPicking(null); setError('') }}
            onKeyDown={onKey}
            placeholder="Quiz 2 IDIS 87 · IDIS = B+ · finish lab report tomorrow…"
            className="w-full h-12 px-3.5 rounded-lg border border-border bg-background text-base md:text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-accent/40"
            aria-label="Add anything"
            autoComplete="off"
          />

          {!intent && (
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground">Type naturally — grades, tasks, materials, notes, courses, certificates, projects…</p>
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLES.map((ex) => (
                  <button key={ex} type="button" onClick={() => reset(ex)} className="px-2.5 min-h-8 rounded-full bg-muted text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {intent && (
            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="accent">{ENTITY_LABELS[intent.entity]}</Badge>
                {intent.course && <span className="text-xs font-mono text-muted-foreground">{intent.course.code}</span>}
                {intent.semesterLabel && <span className="text-xs text-muted-foreground">· {intent.semesterLabel}</span>}
              </div>
              {intent.fields.length > 0 && (
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                  {intent.fields.map((f) => (
                    <div key={f.label} className="contents">
                      <dt className="text-muted-foreground">{f.label}</dt>
                      <dd className="text-foreground break-words min-w-0">{f.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {intent.warnings.map((w) => <p key={w} className="text-[11px] text-muted-foreground">{w}</p>)}
              {intent.issues.map((w) => <p key={w} className="text-xs text-destructive">{w}</p>)}

              {needsDraft && !intent.issues.length && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  {intent.missing.includes('code') && <Input placeholder="Code e.g. CSCI1011" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />}
                  {intent.missing.includes('name') && <Input placeholder="Course name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />}
                  {intent.missing.includes('sks') && <Input placeholder="SKS" inputMode="numeric" value={draft.sks} onChange={(e) => setDraft({ ...draft, sks: e.target.value.replace(/\D/g, '') })} />}
                </div>
              )}

              {intent.ambiguity && picking === null && (
                <div className="rounded-md bg-card border border-border p-3 space-y-2.5">
                  <p className="text-sm text-foreground">
                    {intent.ambiguity.kind === 'course' && intent.ambiguity.suggested
                      ? `Did you mean ${intent.ambiguity.suggested.code} — ${intent.ambiguity.suggested.name}?`
                      : intent.ambiguity.question}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {((intent.ambiguity.kind === 'course' && intent.ambiguity.suggested) || intent.ambiguity.kind === 'entity') && (
                      <Button variant="primary" size="sm" className="min-h-10" onClick={() => {
                        const a = intent.ambiguity!
                        setOverrides(a.kind === 'course' ? { ...overrides, courseId: a.suggested!.id } : { ...overrides, entity: (a as { suggested: EntityType }).suggested })
                      }}>Confirm</Button>
                    )}
                    <Button variant="secondary" size="sm" className="min-h-10" onClick={() => setPicking(intent.ambiguity!.kind)}>Choose another</Button>
                    <Button variant="ghost" size="sm" className="min-h-10" onClick={() => reset()}>Cancel</Button>
                  </div>
                </div>
              )}

              {intent.ambiguity && picking !== null && (
                <div className="rounded-md bg-card border border-border p-2 max-h-56 overflow-y-auto">
                  <p className="text-[11px] text-muted-foreground px-2 py-1">
                    {picking === 'entity' ? 'Add this as…' : picking === 'component' ? 'Grade component' : 'Choose a course'}
                  </p>
                  {intent.ambiguity.kind === 'course' && intent.ambiguity.candidates.map((c) => (
                    <button key={c.id} type="button" className="w-full text-left px-2 min-h-10 rounded hover:bg-muted text-sm flex items-center gap-2" onClick={() => { setOverrides({ ...overrides, courseId: c.id }); setPicking(null) }}>
                      <span className="font-mono text-xs text-muted-foreground shrink-0">{c.code}</span>
                      <span className="truncate">{c.name}</span>
                    </button>
                  ))}
                  {intent.ambiguity.kind === 'entity' && intent.ambiguity.candidates.map((e) => (
                    <button key={e} type="button" className="w-full text-left px-2 min-h-10 rounded hover:bg-muted text-sm" onClick={() => { setOverrides({ ...overrides, entity: e }); setPicking(null) }}>
                      {ENTITY_LABELS[e]}
                    </button>
                  ))}
                  {intent.ambiguity.kind === 'component' && intent.ambiguity.candidates.map((c) => (
                    <button key={c.id} type="button" className="w-full text-left px-2 min-h-10 rounded hover:bg-muted text-sm flex justify-between gap-2" onClick={() => { setOverrides({ ...overrides, componentId: c.id }); setPicking(null) }}>
                      <span className="truncate">{c.name}</span><span className="text-xs text-muted-foreground shrink-0">{c.weight}%</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex items-center justify-between gap-2 pt-1">
            <button type="button" onClick={() => setManual(true)} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 min-h-10">
              Use forms instead
            </button>
            <Button variant="primary" className="min-h-11 px-5" disabled={!canCommit} onClick={commit}>
              {intent?.entity === 'course' ? 'Create course' : 'Add'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
