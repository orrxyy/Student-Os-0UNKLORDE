import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { CERTIFICATE_CATEGORIES, categoryLabel, todayKey } from '../lib/certificates'
import { CertificateCard } from '../components/CertificateCard'
import { CertificateEditor } from '../components/CertificateEditor'
import { Button, Card, EmptyState, Input, Select } from '../components/ui'
import type { Certificate } from '../types'

type Sort = 'newest' | 'oldest' | 'az' | 'issuer'

export function CertificatesPage() {
  const { state } = useStore()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [sem, setSem] = useState('all')
  const [courseId, setCourseId] = useState('all')
  const [date, setDate] = useState('all')
  const [sort, setSort] = useState<Sort>('newest')
  const [adding, setAdding] = useState(false)
  const [filesOpen, setFilesOpen] = useState<string | null>(null)
  const [addErrors, setAddErrors] = useState<string[]>([])

  const semesters = useMemo(
    () => state.academicYears.flatMap((y) => y.semesters.map((s) => ({ id: s.id, label: `Year ${y.number} · Semester ${s.number}`, courses: s.courses }))),
    [state.academicYears],
  )
  const courseOpts = semesters.filter((s) => sem === 'all' || s.id === sem).flatMap((s) => s.courses)
  const courseText = useMemo(() => new Map(semesters.flatMap((s) => s.courses).map((c) => [c.id, `${c.code} ${c.name}`.toLowerCase()])), [semesters])

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const year = todayKey().slice(0, 4)
    const out = state.certificates.filter((c) => {
      if (cat !== 'all' && c.category !== cat) return false
      if (sem !== 'all' && c.semesterId !== sem) return false
      if (courseId !== 'all' && c.courseId !== courseId) return false
      if (date === 'year' && !(c.issueDate?.startsWith(year))) return false
      if (date === 'older' && !(c.issueDate && !c.issueDate.startsWith(year))) return false
      if (!needle) return true
      return [c.title, c.issuer, categoryLabel(c.category), c.certificateNumber, c.description, c.relatedOrganization, c.credentialUrl, c.courseId && courseText.get(c.courseId)]
        .some((v) => v?.toLowerCase().includes(needle))
    })
    const dated = (dir: 1 | -1) => (a: Certificate, b: Certificate) =>
      !a.issueDate && !b.issueDate ? a.title.localeCompare(b.title) : !a.issueDate ? 1 : !b.issueDate ? -1 : a.issueDate.localeCompare(b.issueDate) * dir
    return out.sort(
      sort === 'newest' ? dated(-1)
      : sort === 'oldest' ? dated(1)
      : sort === 'az' ? (a, b) => a.title.localeCompare(b.title)
      : (a, b) => a.issuer.localeCompare(b.issuer) || a.title.localeCompare(b.title),
    )
  }, [state.certificates, q, cat, sem, courseId, date, sort, courseText])

  const filtered = q.trim() !== '' || cat !== 'all' || sem !== 'all' || courseId !== 'all' || date !== 'all'
  const clear = () => { setQ(''); setCat('all'); setSem('all'); setCourseId('all'); setDate('all') }
  const total = state.certificates.length

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-[0.28em] uppercase text-accent">Inventory</p>
          <h1 className="font-display text-xl font-semibold mt-1">Certificates</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your certificate and credential inventory</p>
        </div>
        <Button size="sm" icon="plus" onClick={() => setAdding(true)} className="shrink-0">Add Certificate</Button>
      </div>

      {total > 0 && (
        <>
          <Input placeholder="Search certificates…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search certificates" />
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Select label="Category" value={cat} onChange={(e) => setCat(e.target.value)} options={[{ value: 'all', label: 'All' }, ...CERTIFICATE_CATEGORIES]} />
            <Select label="Semester" value={sem} onChange={(e) => { setSem(e.target.value); setCourseId('all') }} options={[{ value: 'all', label: 'All Semesters' }, ...semesters.map((s) => ({ value: s.id, label: s.label }))]} />
            <Select label="Course" value={courseId} onChange={(e) => setCourseId(e.target.value)} options={[{ value: 'all', label: 'All Courses' }, ...courseOpts.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))]} />
            <Select label="Date" value={date} onChange={(e) => setDate(e.target.value)} options={[{ value: 'all', label: 'All' }, { value: 'year', label: 'This Year' }, { value: 'older', label: 'Older' }]} />
            <Select label="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} options={[{ value: 'newest', label: 'Newest' }, { value: 'oldest', label: 'Oldest' }, { value: 'az', label: 'A–Z' }, { value: 'issuer', label: 'Issuer' }]} />
          </div>
        </>
      )}

      {addErrors.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
          <p className="text-xs font-medium text-destructive">Certificate saved, but some files were not attached:</p>
          {addErrors.map((e) => <p key={e} className="text-xs text-destructive break-words">{e}</p>)}
          <button type="button" className="text-xs underline text-muted-foreground" onClick={() => setAddErrors([])}>Dismiss</button>
        </div>
      )}

      {total === 0 ? (
        <Card className="p-4">
          <EmptyState icon="award" title="No certificates yet" description="Keep your certificates, credentials, and proof of achievement organized in one place." action={<Button size="sm" icon="plus" onClick={() => setAdding(true)}>Add Certificate</Button>} className="py-10" />
        </Card>
      ) : rows.length === 0 ? (
        <Card className="p-4">
          <EmptyState icon="award" title="No certificates match your filters" description="Try a different search or clear the filters." action={<Button size="sm" variant="outline" onClick={clear}>Clear Filters</Button>} className="py-10" />
        </Card>
      ) : (
        <Card className="divide-y divide-border/60">
          <p className="px-4 py-2 text-[11px] font-mono text-muted-foreground">{rows.length}{filtered ? ` of ${total}` : ''} {total === 1 ? 'certificate' : 'certificates'}</p>
          {rows.map((c) => (
            <CertificateCard key={c.id} cert={c} open={filesOpen === c.id} onToggleFiles={() => setFilesOpen(filesOpen === c.id ? null : c.id)} />
          ))}
        </Card>
      )}

      {adding && (
        <CertificateEditor
          onClose={() => setAdding(false)}
          onSaved={(c, errs, n) => { setAddErrors(errs); if (n > 0) setFilesOpen(c.id) }}
        />
      )}
    </div>
  )
}
