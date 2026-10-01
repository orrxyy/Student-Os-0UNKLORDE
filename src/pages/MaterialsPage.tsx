import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useStore } from '../lib/store'
import { weeksForSemester } from '../data/academicWeeks'
import { MATERIAL_TYPE_LABELS, MATERIAL_TYPE_OPTIONS } from '../lib/materials'
import { getSemesterLabel } from '../lib/selectors'
import { fmtShortDate } from '../components/ActivityRow'
import { AttachmentSection, AttachmentToggle } from '../components/Attachments'
import { MaterialEditor } from '../components/MaterialEditor'
import { Badge, Button, Card, EmptyState, Icon, Input, Modal, Select } from '../components/ui'
import type { Course, Material } from '../types'

type Row = { mat: Material; course: Course; semesterId: string }
type Sort = 'recent' | 'oldest' | 'course' | 'week'

function RowMenu({ row, onEdit }: { row: Row; onEdit: () => void }) {
  const { deleteMaterial } = useStore()
  const [menu, setMenu] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const name = row.mat.title || row.mat.topic
  return (
    <>
      <div className="relative shrink-0">
        <button
          type="button"
          aria-label="Material actions"
          aria-haspopup="menu"
          onClick={() => setMenu((v) => !v)}
          className="w-10 h-10 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted text-lg leading-none"
        >
          ⋯
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setMenu(false)} />
            <div role="menu" className="absolute right-0 top-full mt-1 z-30 min-w-32 rounded-lg border border-border bg-card shadow-lg py-1">
              <button role="menuitem" className="w-full text-left px-3 min-h-10 text-sm hover:bg-muted" onClick={() => { setMenu(false); onEdit() }}>Edit</button>
              <button role="menuitem" className="w-full text-left px-3 min-h-10 text-sm text-destructive hover:bg-muted" onClick={() => { setMenu(false); setConfirm(true) }}>Delete</button>
            </div>
          </>
        )}
      </div>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Delete material"
        actions={<><Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button><Button variant="destructive" onClick={() => { deleteMaterial(row.mat.courseId, row.mat.id); setConfirm(false) }}>Delete</Button></>}
      >
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground break-words">{name}</span>
          <br />
          This will remove the material and its attached files.
        </p>
      </Modal>
    </>
  )
}

export function MaterialsPage() {
  const { state } = useStore()
  const [sem, setSem] = useState(state.activeSemesterId)
  const [courseId, setCourseId] = useState('all')
  const [week, setWeek] = useState('all')
  const [type, setType] = useState('all')
  const [sort, setSort] = useState<Sort>('recent')
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Material | null>(null)
  const [filesOpen, setFilesOpen] = useState<string | null>(null)
  const [addErrors, setAddErrors] = useState<string[]>([])

  const semesters = useMemo(
    () => state.academicYears.flatMap((y) => y.semesters.map((s) => ({ id: s.id, label: `Year ${y.number} · Semester ${s.number}`, courses: s.courses }))),
    [state.academicYears],
  )
  const all: Row[] = useMemo(
    () => semesters.flatMap((s) => s.courses.flatMap((c) => c.materials.map((mat) => ({ mat, course: c, semesterId: mat.semesterId ?? s.id })))),
    [semesters],
  )
  const attCount = useMemo(() => {
    const m = new Map<string, number>()
    state.attachments.forEach((a) => a.entityType === 'material' && m.set(a.entityId, (m.get(a.entityId) ?? 0) + 1))
    return m
  }, [state.attachments])

  const inSem = useMemo(() => all.filter((r) => sem === 'all' || r.semesterId === sem), [all, sem])
  const courseOpts = semesters.filter((s) => sem === 'all' || s.id === sem).flatMap((s) => s.courses)
  const configured = sem !== 'all' ? weeksForSemester(sem) : []
  const weekNums = configured.length
    ? configured.map((w) => w.number)
    : [...new Set(inSem.map((r) => r.mat.week).filter(Boolean))].sort((a, b) => a - b)

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const out = inSem.filter(({ mat, course }) => {
      if (courseId !== 'all' && course.id !== courseId) return false
      if (week === 'none' ? !!mat.week : week !== 'all' && mat.week !== Number(week)) return false
      if (type !== 'all' && mat.type !== type) return false
      if (!needle) return true
      return [mat.title, mat.topic, course.name, course.code, mat.type, MATERIAL_TYPE_LABELS[mat.type], mat.url].some((v) => v?.toLowerCase().includes(needle))
    })
    const t = (r: Row) => (r.mat.createdAt ? Date.parse(r.mat.createdAt) : NaN)
    const dated = (dir: 1 | -1) => (a: Row, b: Row) => {
      const x = t(a), y = t(b)
      if (isNaN(x) && isNaN(y)) return 0
      if (isNaN(x)) return 1
      if (isNaN(y)) return -1
      return (x - y) * dir
    }
    return out.sort(
      sort === 'recent' ? dated(-1)
      : sort === 'oldest' ? dated(1)
      : sort === 'course' ? (a, b) => a.course.code.localeCompare(b.course.code) || a.mat.week - b.mat.week
      : (a, b) => a.mat.week - b.mat.week || a.course.code.localeCompare(b.course.code),
    )
  }, [inSem, courseId, week, type, q, sort])

  const filtered = q.trim() !== '' || courseId !== 'all' || week !== 'all' || type !== 'all'
  const clear = () => { setQ(''); setCourseId('all'); setWeek('all'); setType('all') }
  const semName = semesters.find((s) => s.id === sem)?.label ?? ''

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-[0.28em] uppercase text-accent">{getSemesterLabel(state, state.activeSemesterId)}</p>
          <h1 className="font-display text-xl font-semibold mt-1">Materials</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage and access all your academic materials.</p>
        </div>
        <Button size="sm" icon="plus" onClick={() => setAdding(true)} className="shrink-0">Add Material</Button>
      </div>

      <Input placeholder="Search materials…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search materials" />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Select
          label="Semester"
          value={sem}
          onChange={(e) => { setSem(e.target.value); setCourseId('all'); setWeek('all') }}
          options={[{ value: 'all', label: 'All Semesters' }, ...semesters.map((s) => ({ value: s.id, label: s.label }))]}
        />
        <Select
          label="Course"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          options={[{ value: 'all', label: 'All Courses' }, ...courseOpts.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))]}
        />
        <Select
          label="Week"
          value={week}
          onChange={(e) => setWeek(e.target.value)}
          options={[{ value: 'all', label: 'All Weeks' }, ...weekNums.map((n) => ({ value: String(n), label: `Week ${n}` })), ...(inSem.some((r) => !r.mat.week) ? [{ value: 'none', label: 'No Week' }] : [])]}
        />
        <Select label="Type" value={type} onChange={(e) => setType(e.target.value)} options={[{ value: 'all', label: 'All Types' }, ...MATERIAL_TYPE_OPTIONS]} />
        <Select
          label="Sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          options={[{ value: 'recent', label: 'Recently Added' }, { value: 'oldest', label: 'Oldest' }, { value: 'course', label: 'Course' }, { value: 'week', label: 'Week' }]}
        />
      </div>

      {addErrors.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
          <p className="text-xs font-medium text-destructive">Material saved, but some files were not attached:</p>
          {addErrors.map((e) => <p key={e} className="text-xs text-destructive break-words">{e}</p>)}
          <button type="button" className="text-xs underline text-muted-foreground" onClick={() => setAddErrors([])}>Dismiss</button>
        </div>
      )}

      {rows.length === 0 ? (
        <Card className="p-4">
          {filtered || inSem.length > 0 ? (
            <EmptyState icon="folder" title="No materials match your filters" description="Try a different search or clear the filters." action={<Button size="sm" variant="outline" onClick={clear}>Clear Filters</Button>} className="py-10" />
          ) : (
            <EmptyState icon="folder" title="No materials yet" description={`Materials you add for ${sem === 'all' ? 'your semesters' : semName} will appear here.`} action={<Button size="sm" icon="plus" onClick={() => setAdding(true)}>Add Material</Button>} className="py-10" />
          )}
        </Card>
      ) : (
        <Card className="divide-y divide-border/60">
          <p className="px-4 py-2 text-[11px] font-mono text-muted-foreground">{rows.length} {rows.length === 1 ? 'material' : 'materials'}</p>
          {rows.map((r) => {
            const { mat, course } = r
            const n = attCount.get(mat.id) ?? 0
            const open = filesOpen === mat.id
            return (
              <div key={mat.id} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-md bg-sage-light text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Icon name="file-text" size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium break-words">{mat.title || mat.topic}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 break-words">{course.code} · {course.name}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                      <Badge variant="muted">{mat.week ? `Week ${mat.week}` : 'No Week'}</Badge>
                      <Badge variant="outline">{MATERIAL_TYPE_LABELS[mat.type]}</Badge>
                      {mat.url && (
                        <a href={mat.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-xs inline-flex items-center gap-1 min-h-6">
                          <Icon name="external-link" size={11} /> Link
                        </a>
                      )}
                      {mat.createdAt && <span className="text-[11px] font-mono text-muted-foreground">Added {fmtShortDate(mat.createdAt.slice(0, 10))}</span>}
                      {sem === 'all' && <span className="text-[11px] font-mono text-muted-foreground">{semesters.find((s) => s.id === r.semesterId)?.label}</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <AttachmentToggle entityType="material" entityId={mat.id} showLabel open={open} onToggle={() => setFilesOpen(open ? null : mat.id)} />
                      <Link to={`/course/${course.id}?tab=materials`} className="inline-flex items-center gap-1 h-9 px-2 rounded-md text-xs font-medium text-accent hover:bg-muted">
                        Open Course <Icon name="chevron-right" size={12} />
                      </Link>
                    </div>
                  </div>
                  <RowMenu row={r} onEdit={() => setEditing(mat)} />
                </div>
                {open && (
                  <div className="mt-3 sm:ml-12 max-w-xl">
                    <AttachmentSection entityType="material" entityId={mat.id} semesterId={mat.semesterId} courseId={course.id} />
                  </div>
                )}
              </div>
            )
          })}
        </Card>
      )}

      {adding && (
        <MaterialEditor
          courseId={courseOpts.find((c) => c.id === courseId)?.id ?? courseOpts[0]?.id ?? state.academicYears.flatMap((y) => y.semesters).find((s) => s.id === state.activeSemesterId)?.courses[0]?.id}
          onClose={() => setAdding(false)}
          onAdded={(mat, errs, n) => { setAddErrors(errs); if (n > 0) setFilesOpen(mat.id) }}
        />
      )}
      {editing && <MaterialEditor material={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
