import { useState } from 'react'
import { useStore } from '../lib/store'
import { categoryLabel, expiryStatus, fmtDay } from '../lib/certificates'
import { getSemesterLabel } from '../lib/selectors'
import type { Certificate } from '../types'
import { AttachmentSection, AttachmentToggle } from './Attachments'
import { CertificateEditor } from './CertificateEditor'
import { Badge, Button, Icon, Modal } from './ui'

export function CertificateCard({ cert, open, onToggleFiles }: { cert: Certificate; open: boolean; onToggleFiles: () => void }) {
  const { state, deleteCertificate } = useStore()
  const [menu, setMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const course = state.academicYears.flatMap((y) => y.semesters.flatMap((s) => s.courses)).find((c) => c.id === cert.courseId)
  const semLabel = cert.semesterId ? getSemesterLabel(state, cert.semesterId) : ''
  const status = expiryStatus(cert.expiryDate)
  const cat = categoryLabel(cert.category)

  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-md bg-sage-light text-primary flex items-center justify-center shrink-0 mt-0.5">
          <Icon name="award" size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium break-words">{cert.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 break-words">{cert.issuer}{cert.relatedOrganization ? ` · ${cert.relatedOrganization}` : ''}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
            {cat && <Badge variant="outline">{cat}</Badge>}
            {cert.issueDate && <span className="text-[11px] font-mono text-muted-foreground">Issued {fmtDay(cert.issueDate)}</span>}
            {cert.expiryDate && status === 'valid' && <span className="text-[11px] font-mono text-muted-foreground">Valid until {fmtDay(cert.expiryDate)}</span>}
            {status === 'expired' && <Badge variant="destructive">Expired {fmtDay(cert.expiryDate!)}</Badge>}
            {cert.certificateNumber && <span className="text-[11px] font-mono text-muted-foreground break-all">No. {cert.certificateNumber}</span>}
            {(course || semLabel) && (
              <span className="text-[11px] font-mono text-muted-foreground break-words">{[course?.code, semLabel].filter(Boolean).join(' · ')}</span>
            )}
          </div>
          {cert.description && <p className="text-xs text-muted-foreground mt-1.5 break-words line-clamp-2">{cert.description}</p>}
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <AttachmentToggle entityType="certificate" entityId={cert.id} showLabel open={open} onToggle={onToggleFiles} />
            {cert.credentialUrl && (
              <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 h-9 px-2 rounded-md text-xs font-medium text-accent hover:bg-muted">
                <Icon name="external-link" size={12} /> Credential
              </a>
            )}
          </div>
        </div>
        <div className="relative shrink-0">
          <button type="button" aria-label="Certificate actions" aria-haspopup="menu" onClick={() => setMenu((v) => !v)} className="w-10 h-10 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted text-lg leading-none">⋯</button>
          {menu && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setMenu(false)} />
              <div role="menu" className="absolute right-0 top-full mt-1 z-30 min-w-32 rounded-lg border border-border bg-card shadow-lg py-1">
                <button role="menuitem" className="w-full text-left px-3 min-h-10 text-sm hover:bg-muted" onClick={() => { setMenu(false); setEditing(true) }}>Edit</button>
                <button role="menuitem" className="w-full text-left px-3 min-h-10 text-sm text-destructive hover:bg-muted" onClick={() => { setMenu(false); setConfirm(true) }}>Delete</button>
              </div>
            </>
          )}
        </div>
      </div>
      {open && (
        <div className="mt-3 sm:ml-12 max-w-xl">
          <AttachmentSection entityType="certificate" entityId={cert.id} />
        </div>
      )}
      {editing && <CertificateEditor certificate={cert} onClose={() => setEditing(false)} />}
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Delete certificate"
        actions={<><Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button><Button variant="destructive" onClick={() => { deleteCertificate(cert.id); setConfirm(false) }}>Delete</Button></>}
      >
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground break-words">{cert.title}</span>
          <br />
          Delete this certificate? This will also remove its uploaded certificate files.
        </p>
      </Modal>
    </div>
  )
}
