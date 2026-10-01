import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { PORTFOLIO_TYPES, typeLabel, typeOrder } from '../lib/portfolio'
import { PortfolioCard } from '../components/PortfolioCard'
import { PortfolioItemEditor } from '../components/PortfolioItemEditor'
import { Button, Card, EmptyState, Input, Select } from '../components/ui'
import type { PortfolioItem } from '../types'

type Sort = 'newest' | 'oldest' | 'az' | 'type' | 'featured'

export function PortfolioPage() {
  const { state } = useStore()
  const [q, setQ] = useState('')
  const [type, setType] = useState('all')
  const [sem, setSem] = useState('all')
  const [courseId, setCourseId] = useState('all')
  const [featured, setFeatured] = useState('all')
  const [sort, setSort] = useState<Sort>('newest')
  const [adding, setAdding] = useState(false)
  const [addErrors, setAddErrors] = useState<string[]>([])

  const semesters = useMemo(
    () => state.academicYears.flatMap((y) => y.semesters.map((s) => ({ id: s.id, label: `Year ${y.number} · Semester ${s.number}`, courses: s.courses }))),
    [state.academicYears],
  )
  const courseOpts = semesters.filter((s) => sem === 'all' || s.id === sem).flatMap((s) => s.courses)
  const courseText = useMemo(() => new Map(semesters.flatMap((s) => s.courses).map((c) => [c.id, `${c.code} ${c.name}`.toLowerCase()])), [semesters])

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const out = state.portfolioItems.filter((p) => {
      if (type !== 'all' && p.type !== type) return false
      if (sem !== 'all' && p.semesterId !== sem) return false
      if (courseId !== 'all' && p.courseId !== courseId) return false
      if (featured === 'yes' && !p.featured) return false
      if (featured === 'no' && p.featured) return false
      if (!needle) return true
      return [p.title, typeLabel(p.type), p.organization, p.role, p.description, p.location, p.url, p.courseId && courseText.get(p.courseId), ...(p.skills ?? []), ...(p.highlights ?? [])]
        .some((v) => v?.toLowerCase().includes(needle))
    })
    const byTitle = (a: PortfolioItem, b: PortfolioItem) => a.title.localeCompare(b.title)
    const dated = (dir: 1 | -1) => (a: PortfolioItem, b: PortfolioItem) =>
      !a.startDate && !b.startDate ? byTitle(a, b) : !a.startDate ? 1 : !b.startDate ? -1 : a.startDate.localeCompare(b.startDate) * dir || byTitle(a, b)
    return out.sort(
      sort === 'newest' ? dated(-1)
      : sort === 'oldest' ? dated(1)
      : sort === 'az' ? byTitle
      : sort === 'type' ? (a, b) => typeOrder(a.type) - typeOrder(b.type) || byTitle(a, b)
      : (a, b) => Number(!!b.featured) - Number(!!a.featured) || dated(-1)(a, b),
    )
  }, [state.portfolioItems, q, type, sem, courseId, featured, sort, courseText])

  const total = state.portfolioItems.length
  const filtered = q.trim() !== '' || type !== 'all' || sem !== 'all' || courseId !== 'all' || featured !== 'all'
  const clear = () => { setQ(''); setType('all'); setSem('all'); setCourseId('all'); setFeatured('all') }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-[0.28em] uppercase text-accent">Inventory</p>
          <h1 className="font-display text-xl font-semibold mt-1">Portfolio</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your experiences, projects, achievements, and activities</p>
        </div>
        <Button size="sm" icon="plus" onClick={() => setAdding(true)} className="shrink-0">Add Portfolio Item</Button>
      </div>

      {total > 0 && (
        <>
          <Input placeholder="Search portfolio…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search portfolio" />
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Select label="Type" value={type} onChange={(e) => setType(e.target.value)} options={[{ value: 'all', label: 'All' }, ...PORTFOLIO_TYPES]} />
            <Select label="Semester" value={sem} onChange={(e) => { setSem(e.target.value); setCourseId('all') }} options={[{ value: 'all', label: 'All Semesters' }, ...semesters.map((s) => ({ value: s.id, label: s.label }))]} />
            <Select label="Course" value={courseId} onChange={(e) => setCourseId(e.target.value)} options={[{ value: 'all', label: 'All Courses' }, ...courseOpts.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))]} />
            <Select label="Featured" value={featured} onChange={(e) => setFeatured(e.target.value)} options={[{ value: 'all', label: 'All' }, { value: 'yes', label: 'Featured' }, { value: 'no', label: 'Not Featured' }]} />
            <Select label="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} options={[{ value: 'newest', label: 'Newest' }, { value: 'oldest', label: 'Oldest' }, { value: 'az', label: 'A–Z' }, { value: 'type', label: 'Type' }, { value: 'featured', label: 'Featured First' }]} />
          </div>
        </>
      )}

      {addErrors.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
          <p className="text-xs font-medium text-destructive">Portfolio item saved, but some files were not attached:</p>
          {addErrors.map((e) => <p key={e} className="text-xs text-destructive break-words">{e}</p>)}
          <button type="button" className="text-xs underline text-muted-foreground" onClick={() => setAddErrors([])}>Dismiss</button>
        </div>
      )}

      {total === 0 ? (
        <Card className="p-4">
          <EmptyState icon="briefcase" title="No portfolio items yet" description="Keep track of projects, organizations, achievements, and experiences you may want to use later." action={<Button size="sm" icon="plus" onClick={() => setAdding(true)}>Add Portfolio Item</Button>} className="py-10" />
        </Card>
      ) : rows.length === 0 ? (
        <Card className="p-4">
          <EmptyState icon="briefcase" title="No portfolio items match your filters" description="Try a different search or clear the filters." action={<Button size="sm" variant="outline" onClick={clear}>Clear Filters</Button>} className="py-10" />
        </Card>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] font-mono text-muted-foreground">{rows.length}{filtered ? ` of ${total}` : ''} {total === 1 ? 'item' : 'items'}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rows.map((p) => <PortfolioCard key={p.id} item={p} />)}
          </div>
        </div>
      )}

      {adding && <PortfolioItemEditor onClose={() => setAdding(false)} onSaved={(_p, errs) => setAddErrors(errs)} />}
    </div>
  )
}
