import { useState } from 'react'
import { useStore } from '../lib/store'
import { dateRangeLabel, typeLabel } from '../lib/portfolio'
import { getSemesterLabel } from '../lib/selectors'
import type { Certificate, PortfolioItem } from '../types'
import { AttachmentSection, AttachmentToggle } from './Attachments'
import { CertificateEditor } from './CertificateEditor'
import { PortfolioItemEditor } from './PortfolioItemEditor'
import { Badge, Button, Card, Icon, Modal } from './ui'

function usePortfolioContext(item: PortfolioItem) {
  const { state } = useStore()
  const course = state.academicYears.flatMap((y) => y.semesters.flatMap((s) => s.courses)).find((c) => c.id === item.courseId)
  const semLabel = item.semesterId ? getSemesterLabel(state, item.semesterId) : ''
  const certs = (item.certificateIds ?? []).map((id) => state.certificates.find((c) => c.id === id)).filter((c): c is Certificate => !!c)
  return { course, semLabel, certs, ctx: [course?.code, semLabel].filter(Boolean).join(' · ') }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 min-w-0">
      <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">{title}</p>
      {children}
    </div>
  )
}

function PortfolioDetail({ item, onClose, onEdit }: { item: PortfolioItem; onClose: () => void; onEdit: () => void }) {
  const { course, semLabel, certs } = usePortfolioContext(item)
  const [cert, setCert] = useState<Certificate | null>(null)
  const range = dateRangeLabel(item.startDate, item.endDate)
  const meta = [item.organization, item.role, item.location].filter(Boolean)
  return (
    <Modal
      open
      onClose={onClose}
      title={item.title}
      actions={<><Button variant="ghost" onClick={onClose}>Close</Button><Button onClick={onEdit}>Edit</Button></>}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{typeLabel(item.type)}</Badge>
          {item.featured && <Badge variant="accent">★ Featured</Badge>}
        </div>
        {meta.length > 0 && <p className="text-sm text-muted-foreground break-words">{meta.join(' · ')}</p>}
        {range && <p className="text-xs font-mono text-muted-foreground">{range}</p>}
        {item.description && <p className="text-sm break-words whitespace-pre-wrap">{item.description}</p>}
        {item.highlights && item.highlights.length > 0 && (
          <Section title="Highlights">
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {item.highlights.map((h, i) => <li key={i} className="break-words">{h}</li>)}
            </ul>
          </Section>
        )}
        {item.skills && item.skills.length > 0 && (
          <Section title="Skills">
            <div className="flex flex-wrap gap-1.5">{item.skills.map((s) => <Badge key={s} variant="muted" className="break-all">{s}</Badge>)}</div>
          </Section>
        )}
        {(course || semLabel) && (
          <Section title="Academic Context">
            <p className="text-sm break-words">{[course && `${course.code} — ${course.name}`, semLabel].filter(Boolean).join(' · ')}</p>
          </Section>
        )}
        {item.url && (
          <Section title="Link">
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-accent hover:underline break-all">
              <Icon name="external-link" size={12} className="shrink-0" /> {item.url}
            </a>
          </Section>
        )}
        {certs.length > 0 && (
          <Section title={`Certificates · ${certs.length}`}>
            <div className="flex flex-wrap gap-1.5">
              {certs.map((c) => (
                <button key={c.id} type="button" onClick={() => setCert(c)} className="inline-flex items-center gap-1.5 min-h-9 px-2.5 rounded-md border border-border text-xs text-left hover:bg-muted break-words max-w-full">
                  <Icon name="award" size={12} className="shrink-0 text-accent" /> <span className="min-w-0 break-words">{c.title}</span>
                </button>
              ))}
            </div>
          </Section>
        )}
        <AttachmentSection entityType="portfolio" entityId={item.id} compact />
      </div>
      {cert && <CertificateEditor certificate={cert} onClose={() => setCert(null)} />}
    </Modal>
  )
}

export function PortfolioCard({ item }: { item: PortfolioItem }) {
  const { deletePortfolioItem } = useStore()
  const { certs, ctx } = usePortfolioContext(item)
  const [menu, setMenu] = useState(false)
  const [detail, setDetail] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const range = dateRangeLabel(item.startDate, item.endDate)
  const meta = [item.organization, item.role].filter(Boolean).join(' · ')

  return (
    <Card className="px-4 py-3 min-w-0">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <Badge variant="outline">{typeLabel(item.type)}</Badge>
            {item.featured && <Badge variant="accent">★ Featured</Badge>}
          </div>
          <button type="button" onClick={() => setDetail(true)} className="block max-w-full text-left text-sm font-medium [overflow-wrap:anywhere] hover:text-accent">{item.title}</button>
          {meta && <p className="text-xs text-muted-foreground mt-0.5 break-words">{meta}</p>}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
            {range && <span className="text-[11px] font-mono text-muted-foreground">{range}</span>}
            {item.location && <span className="text-[11px] font-mono text-muted-foreground break-words">{item.location}</span>}
            {ctx && <span className="text-[11px] font-mono text-muted-foreground break-words">{ctx}</span>}
          </div>
          {item.description && <p className="text-xs text-muted-foreground mt-1.5 break-words line-clamp-2">{item.description}</p>}
          {item.skills && item.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {item.skills.slice(0, 4).map((s) => <Badge key={s} variant="muted" className="break-all">{s}</Badge>)}
              {item.skills.length > 4 && <span className="text-[11px] font-mono text-muted-foreground self-center">+{item.skills.length - 4}</span>}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1 mt-1.5">
            <AttachmentToggle entityType="portfolio" entityId={item.id} showLabel open={false} onToggle={() => setDetail(true)} />
            {certs.length > 0 && (
              <button type="button" onClick={() => setDetail(true)} className="inline-flex items-center gap-1 h-9 px-2 rounded-md text-xs font-mono text-accent bg-accent/10">
                <Icon name="award" size={13} /> {certs.length} {certs.length === 1 ? 'certificate' : 'certificates'}
              </button>
            )}
            {item.url && (
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 h-9 px-2 rounded-md text-xs font-medium text-accent hover:bg-muted">
                <Icon name="external-link" size={12} /> Link
              </a>
            )}
          </div>
        </div>
        <div className="relative shrink-0">
          <button type="button" aria-label="Portfolio item actions" aria-haspopup="menu" onClick={() => setMenu((v) => !v)} className="w-10 h-10 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted text-lg leading-none">⋯</button>
          {menu && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setMenu(false)} />
              <div role="menu" className="absolute right-0 top-full mt-1 z-30 min-w-32 rounded-lg border border-border bg-card shadow-lg py-1">
                <button role="menuitem" className="w-full text-left px-3 min-h-10 text-sm hover:bg-muted" onClick={() => { setMenu(false); setDetail(true) }}>View</button>
                <button role="menuitem" className="w-full text-left px-3 min-h-10 text-sm hover:bg-muted" onClick={() => { setMenu(false); setEditing(true) }}>Edit</button>
                <button role="menuitem" className="w-full text-left px-3 min-h-10 text-sm text-destructive hover:bg-muted" onClick={() => { setMenu(false); setConfirm(true) }}>Delete</button>
              </div>
            </>
          )}
        </div>
      </div>
      {detail && <PortfolioDetail item={item} onClose={() => setDetail(false)} onEdit={() => { setDetail(false); setEditing(true) }} />}
      {editing && <PortfolioItemEditor item={item} onClose={() => setEditing(false)} />}
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Delete portfolio item"
        actions={<><Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button><Button variant="destructive" onClick={() => { deletePortfolioItem(item.id); setConfirm(false) }}>Delete</Button></>}
      >
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground break-words">{item.title}</span>
          <br />
          Delete this portfolio item? This will also remove its uploaded files. Linked certificates are not deleted.
        </p>
      </Modal>
    </Card>
  )
}
