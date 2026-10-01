import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { dateRangeLabel, typeLabel } from '../lib/portfolio'
import { fmtDay, isValidUrl } from '../lib/certificates'
import { formatGPA } from '../lib/grades'
import { getGlobalCumulativeGPA, getSemesterLabel } from '../lib/selectors'
import type { Certificate, CvEntry, CvProfile, PortfolioItem, PortfolioItemType } from '../types'
import { Badge, Button, Card, EmptyState, Icon, Input } from '../components/ui'

type SectionKey = 'education' | 'experience' | 'projects' | 'leadership' | 'volunteer' | 'achievements' | 'certifications'

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'education', label: 'Education' },
  { key: 'experience', label: 'Experience' },
  { key: 'projects', label: 'Projects' },
  { key: 'leadership', label: 'Organizations / Leadership' },
  { key: 'volunteer', label: 'Volunteer' },
  { key: 'achievements', label: 'Achievements' },
  { key: 'certifications', label: 'Certifications' },
]

const TYPE_SECTION: Record<PortfolioItemType, SectionKey> = {
  project: 'projects',
  organization: 'leadership',
  leadership: 'leadership',
  volunteer: 'volunteer',
  achievement: 'achievements',
  competition: 'achievements',
  experience: 'experience',
  other: 'experience',
}

type Resolved =
  | { entry: CvEntry; section: 'education' }
  | { entry: CvEntry; section: SectionKey; item: PortfolioItem }
  | { entry: CvEntry; section: 'certifications'; cert: Certificate }

const keyOf = (e: Pick<CvEntry, 'type' | 'sourceId'>) => `${e.type}:${e.sourceId}`
const label = 'block text-xs font-medium text-muted-foreground uppercase tracking-wide'

function SectionTitle({ children }: { children: string }) {
  return <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">{children}</p>
}

export function CvPage() {
  const { state, updateCvProfile, setCvEntries, setCvSkills } = useStore()
  const [skillDraft, setSkillDraft] = useState('')
  const p = state.cvProfile
  const sorted = useMemo(() => [...state.cvEntries].sort((a, b) => a.order - b.order), [state.cvEntries])

  // Stale references are ignored here (and removed from the store on delete).
  const resolved: Resolved[] = useMemo(() => {
    const out: Resolved[] = []
    for (const entry of sorted) {
      if (entry.type === 'education') out.push({ entry, section: 'education' })
      else if (entry.type === 'portfolio') {
        const item = state.portfolioItems.find((x) => x.id === entry.sourceId)
        if (item) out.push({ entry, section: TYPE_SECTION[item.type] ?? 'experience', item })
      } else {
        const cert = state.certificates.find((x) => x.id === entry.sourceId)
        if (cert) out.push({ entry, section: 'certifications', cert })
      }
    }
    return out
  }, [sorted, state.portfolioItems, state.certificates])

  const inCv = new Set(state.cvEntries.map(keyOf))
  const availPortfolio = state.portfolioItems.filter((i) => !inCv.has(`portfolio:${i.id}`))
  const availCerts = state.certificates.filter((c) => !inCv.has(`certificate:${c.id}`))
  const educationIn = inCv.has('education:academic')
  const nextOrder = () => state.cvEntries.reduce((m, e) => Math.max(m, e.order), 0) + 1

  const add = (type: CvEntry['type'], sourceId: string) => setCvEntries([...state.cvEntries, { type, sourceId, visible: true, order: nextOrder() }])
  const remove = (e: CvEntry) => setCvEntries(state.cvEntries.filter((x) => keyOf(x) !== keyOf(e)))
  const toggle = (e: CvEntry) => setCvEntries(state.cvEntries.map((x) => (keyOf(x) === keyOf(e) ? { ...x, visible: !x.visible } : x)))
  function move(group: Resolved[], idx: number, dir: -1 | 1) {
    const a = group[idx]?.entry, b = group[idx + dir]?.entry
    if (!a || !b) return
    setCvEntries(state.cvEntries.map((x) => (keyOf(x) === keyOf(a) ? { ...x, order: b.order } : keyOf(x) === keyOf(b) ? { ...x, order: a.order } : x)))
  }

  function addSkills(raw: string) {
    const next = [...state.cvSkills]
    for (const part of raw.split(',')) {
      const s = part.trim()
      if (s && !next.some((x) => x.toLowerCase() === s.toLowerCase())) next.push(s)
    }
    setCvSkills(next)
    setSkillDraft('')
  }

  const field = (k: keyof CvProfile, name: string, opts: { placeholder?: string; url?: boolean; type?: string } = {}) => (
    <div>
      <Input label={name} type={opts.type} value={p[k]} placeholder={opts.placeholder} onChange={(e) => updateCvProfile({ [k]: e.target.value })} />
      {opts.url && p[k].trim() && !isValidUrl(p[k].trim()) && <p className="text-[11px] text-destructive mt-1">Must start with http:// or https://</p>}
    </div>
  )

  const groups = SECTIONS.map((s) => ({ ...s, rows: resolved.filter((r) => r.section === s.key) })).filter((g) => g.rows.length > 0)
  const visibleGroups = groups.map((g) => ({ ...g, rows: g.rows.filter((r) => r.entry.visible) })).filter((g) => g.rows.length > 0)
  const contact = [p.email, p.phone, p.location].filter(Boolean)
  const links = [p.linkedin, p.github, p.website].filter((u) => u.trim() && isValidUrl(u.trim()))
  const previewEmpty = !p.fullName && !p.headline && contact.length === 0 && links.length === 0 && visibleGroups.length === 0 && state.cvSkills.length === 0
  const cumGpa = getGlobalCumulativeGPA(state)

  const rowTitle = (r: Resolved) => ('item' in r ? r.item.title : 'cert' in r ? r.cert.title : 'Education')
  const rowSub = (r: Resolved) => ('item' in r ? typeLabel(r.item.type) : 'cert' in r ? r.cert.issuer : 'Academic record')
  const iconBtn = 'w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none'

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <div className="min-w-0">
        <p className="font-mono text-[10px] tracking-[0.28em] uppercase text-accent">Inventory</p>
        <h1 className="font-display text-xl font-semibold mt-1">CV Inventory</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Choose which existing records appear on your future CV</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <div className="space-y-4 min-w-0">
          <Card className="p-4 space-y-3">
            <SectionTitle>Profile</SectionTitle>
            {field('fullName', 'Full Name')}
            {field('headline', 'Professional Headline', { placeholder: 'e.g. Informatics student · aspiring data analyst' })}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field('email', 'Email', { type: 'email' })}
              {field('phone', 'Phone')}
            </div>
            {field('location', 'Location')}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field('institution', 'Institution')}
              {field('degree', 'Degree / Program')}
            </div>
            {field('linkedin', 'LinkedIn URL', { placeholder: 'https://', url: true })}
            {field('github', 'GitHub URL', { placeholder: 'https://', url: true })}
            {field('website', 'Portfolio URL', { placeholder: 'https://', url: true })}
          </Card>

          <Card className="p-4 space-y-3">
            <SectionTitle>CV Items</SectionTitle>
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing added yet. Add records below.</p>
            ) : (
              groups.map((g) => (
                <div key={g.key} className="space-y-1">
                  <p className="text-xs font-medium">{g.label}</p>
                  <div className="rounded-md border border-border divide-y divide-border/60">
                    {g.rows.map((r, i) => (
                      <div key={keyOf(r.entry)} className={`flex items-center gap-1 pl-3 pr-1 py-1 ${r.entry.visible ? '' : 'opacity-60'}`}>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm break-words">{rowTitle(r)}</p>
                          <p className="text-[11px] text-muted-foreground break-words">{rowSub(r)}{r.entry.visible ? '' : ' · Hidden'}</p>
                        </div>
                        <button type="button" aria-label={`Move ${rowTitle(r)} up`} disabled={i === 0} onClick={() => move(g.rows, i, -1)} className={iconBtn}><Icon name="chevron-up" size={14} /></button>
                        <button type="button" aria-label={`Move ${rowTitle(r)} down`} disabled={i === g.rows.length - 1} onClick={() => move(g.rows, i, 1)} className={iconBtn}><Icon name="chevron-down" size={14} /></button>
                        <button type="button" aria-label={`${r.entry.visible ? 'Hide' : 'Show'} ${rowTitle(r)}`} onClick={() => toggle(r.entry)} className={iconBtn}><Icon name={r.entry.visible ? 'eye' : 'eye-off'} size={14} /></button>
                        <button type="button" aria-label={`Remove ${rowTitle(r)} from CV`} onClick={() => remove(r.entry)} className={`${iconBtn} hover:text-destructive`}><Icon name="x" size={14} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}

            <div className="pt-2 space-y-2 border-t border-border/60">
              <p className={label}>Add to CV</p>
              {!educationIn && (
                <div className="flex items-center gap-2">
                  <span className="text-sm flex-1">Education (academic record)</span>
                  <Button size="sm" variant="outline" onClick={() => add('education', 'academic')}>Add to CV</Button>
                </div>
              )}
              {availPortfolio.length + availCerts.length === 0 && educationIn && (
                <p className="text-xs text-muted-foreground">All existing portfolio items and certificates are already on your CV, or none exist yet.</p>
              )}
              {availPortfolio.length > 0 && (
                <div className="max-h-52 overflow-y-auto rounded-md border border-border divide-y divide-border/60">
                  <p className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Portfolio items</p>
                  {availPortfolio.map((i) => (
                    <div key={i.id} className="flex items-center gap-2 pl-3 pr-1 py-1">
                      <div className="min-w-0 flex-1"><p className="text-sm break-words">{i.title}</p><p className="text-[11px] text-muted-foreground">{typeLabel(i.type)}</p></div>
                      <Button size="sm" variant="outline" aria-label={`Add ${i.title} to CV`} onClick={() => add('portfolio', i.id)}>Add</Button>
                    </div>
                  ))}
                </div>
              )}
              {availCerts.length > 0 && (
                <div className="max-h-52 overflow-y-auto rounded-md border border-border divide-y divide-border/60">
                  <p className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Certificates</p>
                  {availCerts.map((c) => (
                    <div key={c.id} className="flex items-center gap-2 pl-3 pr-1 py-1">
                      <div className="min-w-0 flex-1"><p className="text-sm break-words">{c.title}</p><p className="text-[11px] text-muted-foreground break-words">{c.issuer}</p></div>
                      <Button size="sm" variant="outline" aria-label={`Add ${c.title} to CV`} onClick={() => add('certificate', c.id)}>Add</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <SectionTitle>Skills</SectionTitle>
            {state.cvSkills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {state.cvSkills.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-sm bg-muted text-xs font-mono max-w-full">
                    <span className="break-all">{s}</span>
                    <button type="button" aria-label={`Remove skill ${s}`} onClick={() => setCvSkills(state.cvSkills.filter((x) => x !== s))} className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive"><Icon name="x" size={11} /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                aria-label="Add CV skill"
                value={skillDraft}
                onChange={(e) => setSkillDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkills(skillDraft) } }}
                placeholder="Type a skill, press Enter"
                className="bg-card border border-border rounded px-3 h-10 text-sm focus:border-ring focus:ring-1 focus:ring-ring outline-none w-full"
              />
              <Button variant="outline" onClick={() => addSkills(skillDraft)} disabled={!skillDraft.trim()}>Add skill</Button>
            </div>
          </Card>
        </div>

        <div className="min-w-0 lg:sticky lg:top-4">
          <SectionTitle>Live preview</SectionTitle>
          <Card className="mt-2 p-5 md:p-6 space-y-4" >
            {previewEmpty ? (
              <EmptyState icon="file-text" title="Your CV preview is empty" description="Fill in your profile and add items to see them here." className="py-8" />
            ) : (
              <>
                <header className="space-y-1 pb-3 border-b border-border">
                  {p.fullName && <h2 className="font-display text-xl font-semibold break-words">{p.fullName}</h2>}
                  {p.headline && <p className="text-sm text-muted-foreground break-words">{p.headline}</p>}
                  {(contact.length > 0 || links.length > 0) && (
                    <p className="text-xs text-muted-foreground break-words [overflow-wrap:anywhere]">
                      {[...contact, ...links].join('  ·  ')}
                    </p>
                  )}
                </header>
                {visibleGroups.map((g) => (
                  <section key={g.key} className="space-y-2.5">
                    <h3 className="font-mono text-[10px] tracking-[0.18em] uppercase text-accent border-b border-border/60 pb-1">{g.label}</h3>
                    {g.rows.map((r) => (
                      <div key={keyOf(r.entry)} className="min-w-0">
                        {'item' in r ? <PreviewItem item={r.item} /> : 'cert' in r ? <PreviewCert cert={r.cert} /> : (
                          <>
                            <p className="text-sm font-medium break-words">{p.institution || 'Institution'}</p>
                            <p className="text-xs text-muted-foreground break-words">
                              {[p.degree, getSemesterLabel(state, state.activeSemesterId), cumGpa !== null ? `GPA ${formatGPA(cumGpa)}` : ''].filter(Boolean).join(' · ')}
                            </p>
                          </>
                        )}
                      </div>
                    ))}
                  </section>
                ))}
                {state.cvSkills.length > 0 && (
                  <section className="space-y-2">
                    <h3 className="font-mono text-[10px] tracking-[0.18em] uppercase text-accent border-b border-border/60 pb-1">Skills</h3>
                    <div className="flex flex-wrap gap-1.5">{state.cvSkills.map((s) => <Badge key={s} variant="muted" className="break-all">{s}</Badge>)}</div>
                  </section>
                )}
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

function PreviewItem({ item }: { item: PortfolioItem }) {
  const range = dateRangeLabel(item.startDate, item.endDate)
  const sub = [item.organization, item.role, item.location].filter(Boolean).join(' · ')
  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="text-sm font-medium break-words min-w-0">{item.title}</p>
        {range && <span className="text-[11px] font-mono text-muted-foreground shrink-0">{range}</span>}
      </div>
      {sub && <p className="text-xs text-muted-foreground break-words">{sub}</p>}
      {item.description && <p className="text-xs mt-1 break-words">{item.description}</p>}
      {item.highlights && item.highlights.length > 0 && (
        <ul className="list-disc pl-4 mt-1 space-y-0.5 text-xs">{item.highlights.map((h, i) => <li key={i} className="break-words">{h}</li>)}</ul>
      )}
      {item.url && isValidUrl(item.url) && <p className="text-[11px] text-accent mt-1 break-all">{item.url}</p>}
    </>
  )
}

function PreviewCert({ cert }: { cert: Certificate }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
      <p className="text-sm break-words min-w-0"><span className="font-medium">{cert.title}</span><span className="text-muted-foreground"> — {cert.issuer}</span></p>
      {cert.issueDate && <span className="text-[11px] font-mono text-muted-foreground shrink-0">{fmtDay(cert.issueDate)}</span>}
    </div>
  )
}
