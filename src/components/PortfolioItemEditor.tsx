import { useState } from 'react'
import { useStore } from '../lib/store'
import { PORTFOLIO_TYPES } from '../lib/portfolio'
import { isValidUrl } from '../lib/certificates'
import type { PortfolioItem, PortfolioItemType } from '../types'
import { AttachmentSection, PendingFilesField, attachFiles } from './Attachments'
import { Badge, Button, Icon, Input, Modal, Select } from './ui'

interface Props {
  onClose: () => void
  item?: PortfolioItem
  defaultCourseId?: string
  onSaved?: (item: PortfolioItem, fileErrors: string[], fileCount: number) => void
}

const Heading = ({ children }: { children: string }) => (
  <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground pt-1">{children}</p>
)

export function PortfolioItemEditor({ onClose, item, defaultCourseId, onSaved }: Props) {
  const { state, addPortfolioItem, updatePortfolioItem, addAttachment } = useStore()
  const sems = state.academicYears.flatMap((y) => y.semesters.map((s) => ({ id: s.id, label: `Year ${y.number} · Semester ${s.number}`, courses: s.courses })))
  const courses = sems.flatMap((s) => s.courses)
  const initCourse = item?.courseId ?? defaultCourseId ?? ''
  const initSem = courses.find((c) => c.id === initCourse)?.semesterId ?? item?.semesterId ?? ''

  const [f, setF] = useState({
    title: item?.title ?? '',
    type: (item?.type ?? 'project') as PortfolioItemType,
    org: item?.organization ?? '',
    role: item?.role ?? '',
    description: item?.description ?? '',
    start: item?.startDate ?? '',
    end: item?.endDate ?? '',
    sem: initSem,
    course: initCourse,
    location: item?.location ?? '',
    url: item?.url ?? '',
    featured: item?.featured ?? false,
  })
  const [highlights, setHighlights] = useState<string[]>(item?.highlights?.length ? item.highlights : [])
  const [skills, setSkills] = useState<string[]>(item?.skills ?? [])
  const [skillDraft, setSkillDraft] = useState('')
  const [certIds, setCertIds] = useState<string[]>((item?.certificateIds ?? []).filter((id) => state.certificates.some((c) => c.id === id)))
  const [files, setFiles] = useState<File[]>([])
  const [fileErrors, setFileErrors] = useState<string[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (p: Partial<typeof f>) => { setF((x) => ({ ...x, ...p })); setError('') }
  const semCourses = sems.find((s) => s.id === f.sem)?.courses ?? []

  function addSkills(raw: string, into = skills) {
    const next = [...into]
    for (const part of raw.split(',')) {
      const s = part.trim()
      if (s && !next.some((x) => x.toLowerCase() === s.toLowerCase())) next.push(s)
    }
    setSkills(next)
    setSkillDraft('')
    return next
  }

  async function save() {
    if (saving) return
    const title = f.title.trim(), url = f.url.trim()
    if (!title) return setError('Title is required')
    if (url && !isValidUrl(url)) return setError('URL must start with http:// or https://')
    if (f.start && f.end && f.end < f.start) return setError('End date cannot be earlier than start date')
    const opt = (v: string) => v.trim() || undefined
    const finalSkills = skillDraft.trim() ? addSkills(skillDraft) : skills
    const hl = highlights.map((h) => h.trim()).filter(Boolean)
    const data = {
      title,
      type: f.type,
      organization: opt(f.org),
      role: opt(f.role),
      description: opt(f.description),
      startDate: f.start || undefined,
      endDate: f.end || undefined,
      semesterId: f.sem || undefined,
      courseId: f.course || undefined,
      location: opt(f.location),
      url: url || undefined,
      skills: finalSkills.length ? finalSkills : undefined,
      highlights: hl.length ? hl : undefined,
      certificateIds: certIds.length ? certIds : undefined,
      featured: f.featured || undefined,
    }
    if (item) {
      updatePortfolioItem(item.id, data)
      return onClose()
    }
    setSaving(true)
    const created = addPortfolioItem(data)
    let errs: string[] = []
    if (files.length > 0) {
      errs = await attachFiles(files, { entityType: 'portfolio', entityId: created.id }, state.attachments, addAttachment)
    }
    setSaving(false)
    onSaved?.(created, errs, files.length)
    onClose()
  }

  const toggleCert = (id: string) => { setCertIds((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id])); setError('') }
  const textarea = 'bg-card border border-border rounded px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring outline-none w-full resize-y'

  return (
    <Modal
      open
      onClose={onClose}
      title={item ? 'Edit Portfolio Item' : 'Add Portfolio Item'}
      actions={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? 'Saving…' : item ? 'Save' : 'Add'}</Button></>}
    >
      <div className="space-y-3">
        <Heading>Basic Information</Heading>
        <Input label="Title" value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Campus Blood Donation Committee" />
        <Select label="Type" value={f.type} onChange={(e) => set({ type: e.target.value as PortfolioItemType })} options={PORTFOLIO_TYPES} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Organization" value={f.org} onChange={(e) => set({ org: e.target.value })} />
          <Input label="Role" value={f.role} onChange={(e) => set({ role: e.target.value })} />
        </div>

        <Heading>Description</Heading>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</label>
          <textarea rows={3} value={f.description} onChange={(e) => set({ description: e.target.value })} placeholder="A short overall explanation" className={textarea} />
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">Highlights</label>
          {highlights.map((h, i) => (
            <div key={i} className="flex items-start gap-2">
              <textarea
                rows={1}
                aria-label={`Highlight ${i + 1}`}
                value={h}
                onChange={(e) => setHighlights((x) => x.map((v, j) => (j === i ? e.target.value : v)))}
                placeholder="A specific contribution or result"
                className={`${textarea} min-h-10`}
              />
              <button type="button" aria-label={`Remove highlight ${i + 1}`} onClick={() => setHighlights((x) => x.filter((_, j) => j !== i))} className="w-10 h-10 shrink-0 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-muted">
                <Icon name="x" size={14} />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setHighlights((x) => [...x, ''])} className="inline-flex items-center gap-1.5 h-10 px-3 rounded-md text-xs font-medium border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-accent hover:bg-muted/50">
            <Icon name="plus" size={13} /> Add highlight
          </button>
        </div>

        <Heading>Dates</Heading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Start Date" type="date" value={f.start} onChange={(e) => set({ start: e.target.value })} />
          <Input label="End Date" type="date" value={f.end} onChange={(e) => set({ end: e.target.value })} />
        </div>

        <Heading>Academic Context</Heading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Semester"
            value={f.sem}
            onChange={(e) => set({ sem: e.target.value, course: courses.find((c) => c.id === f.course)?.semesterId === e.target.value ? f.course : '' })}
            options={[{ value: '', label: 'None' }, ...sems.map((s) => ({ value: s.id, label: s.label }))]}
          />
          <Select
            label="Course"
            value={f.course}
            onChange={(e) => set({ course: e.target.value, sem: courses.find((c) => c.id === e.target.value)?.semesterId ?? f.sem })}
            options={[{ value: '', label: 'None' }, ...(f.sem ? semCourses : courses).map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))]}
          />
        </div>

        <Heading>Additional Information</Heading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Location" value={f.location} onChange={(e) => set({ location: e.target.value })} />
          <Input label="URL" value={f.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://..." />
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">Skills</label>
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-sm bg-muted text-xs font-mono max-w-full">
                  <span className="break-all">{s}</span>
                  <button type="button" aria-label={`Remove skill ${s}`} onClick={() => setSkills((x) => x.filter((y) => y !== s))} className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive">
                    <Icon name="x" size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              aria-label="Add skill"
              value={skillDraft}
              onChange={(e) => setSkillDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkills(skillDraft) } }}
              placeholder="Type a skill, press Enter"
              className="bg-card border border-border rounded px-3 h-10 text-sm focus:border-ring focus:ring-1 focus:ring-ring outline-none w-full"
            />
            <Button variant="outline" onClick={() => addSkills(skillDraft)} disabled={!skillDraft.trim()}>Add skill</Button>
          </div>
        </div>

        <Heading>Evidence</Heading>
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">Link Certificates</label>
          {state.certificates.length === 0 ? (
            <p className="text-xs text-muted-foreground">No certificates yet. Add one in Certificates to link it here.</p>
          ) : (
            <div className="max-h-44 overflow-y-auto rounded-md border border-border divide-y divide-border/60">
              {state.certificates.map((c) => (
                <label key={c.id} className="flex items-start gap-2.5 px-3 py-2 min-h-10 cursor-pointer hover:bg-muted/50">
                  <input type="checkbox" checked={certIds.includes(c.id)} onChange={() => toggleCert(c.id)} className="accent-accent mt-0.5 shrink-0" />
                  <span className="min-w-0 text-sm break-words">{c.title}<span className="block text-[11px] text-muted-foreground">{c.issuer}</span></span>
                </label>
              ))}
            </div>
          )}
        </div>
        {item ? (
          <AttachmentSection entityType="portfolio" entityId={item.id} />
        ) : (
          <PendingFilesField files={files} onChange={setFiles} errors={fileErrors} onErrors={setFileErrors} />
        )}

        <Heading>Featured</Heading>
        <label className="flex items-center gap-2 text-sm cursor-pointer min-h-10">
          <input type="checkbox" checked={f.featured} onChange={(e) => set({ featured: e.target.checked })} className="accent-accent" />
          Mark as featured <Badge variant="accent">★</Badge>
        </label>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </Modal>
  )
}
