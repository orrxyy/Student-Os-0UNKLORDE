import { useState } from 'react'
import { useStore } from '../lib/store'
import { CERTIFICATE_CATEGORIES, isValidUrl } from '../lib/certificates'
import type { Certificate, CertificateCategory } from '../types'
import { AttachmentSection, PendingFilesField, attachFiles } from './Attachments'
import { Button, Input, Modal, Select } from './ui'

interface Props {
  onClose: () => void
  certificate?: Certificate
  defaultCourseId?: string
  onSaved?: (cert: Certificate, fileErrors: string[], fileCount: number) => void
}

const Heading = ({ children }: { children: string }) => (
  <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground pt-1">{children}</p>
)

export function CertificateEditor({ onClose, certificate, defaultCourseId, onSaved }: Props) {
  const { state, addCertificate, updateCertificate, addAttachment } = useStore()
  const sems = state.academicYears.flatMap((y) => y.semesters.map((s) => ({ id: s.id, label: `Year ${y.number} · Semester ${s.number}`, courses: s.courses })))
  const courses = sems.flatMap((s) => s.courses)
  const initCourse = certificate?.courseId ?? defaultCourseId ?? ''
  const initSem = courses.find((c) => c.id === initCourse)?.semesterId ?? certificate?.semesterId ?? ''

  const [f, setF] = useState({
    title: certificate?.title ?? '',
    issuer: certificate?.issuer ?? '',
    category: (certificate?.category ?? '') as CertificateCategory | '',
    number: certificate?.certificateNumber ?? '',
    url: certificate?.credentialUrl ?? '',
    description: certificate?.description ?? '',
    org: certificate?.relatedOrganization ?? '',
    issue: certificate?.issueDate ?? '',
    expiry: certificate?.expiryDate ?? '',
    sem: initSem,
    course: initCourse,
  })
  const [files, setFiles] = useState<File[]>([])
  const [fileErrors, setFileErrors] = useState<string[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (p: Partial<typeof f>) => { setF((x) => ({ ...x, ...p })); setError('') }
  const semCourses = sems.find((s) => s.id === f.sem)?.courses ?? []

  async function save() {
    if (saving) return
    const title = f.title.trim(), issuer = f.issuer.trim(), url = f.url.trim()
    if (!title) return setError('Title is required')
    if (!issuer) return setError('Issuer is required')
    if (url && !isValidUrl(url)) return setError('Credential URL must start with http:// or https://')
    if (f.issue && f.expiry && f.expiry < f.issue) return setError('Expiry date cannot be earlier than issue date')
    const opt = (v: string) => v.trim() || undefined
    const data = {
      title,
      issuer,
      category: f.category || undefined,
      issueDate: f.issue || undefined,
      expiryDate: f.expiry || undefined,
      certificateNumber: opt(f.number),
      description: opt(f.description),
      relatedOrganization: opt(f.org),
      credentialUrl: url || undefined,
      courseId: f.course || undefined,
      semesterId: f.sem || undefined,
    }
    if (certificate) {
      updateCertificate(certificate.id, data)
      return onClose()
    }
    setSaving(true)
    const cert = addCertificate(data)
    let errs: string[] = []
    if (files.length > 0) {
      errs = await attachFiles(files, { entityType: 'certificate', entityId: cert.id }, state.attachments, addAttachment)
    }
    setSaving(false)
    onSaved?.(cert, errs, files.length)
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={certificate ? 'Edit Certificate' : 'Add Certificate'}
      actions={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? 'Saving…' : certificate ? 'Save' : 'Add'}</Button></>}
    >
      <div className="space-y-3">
        <Heading>Certificate Information</Heading>
        <Input label="Title" value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Google Cybersecurity Certificate" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Issuer" value={f.issuer} onChange={(e) => set({ issuer: e.target.value })} placeholder="e.g. Google / Coursera" />
          <Select label="Category" value={f.category} onChange={(e) => set({ category: e.target.value as CertificateCategory | '' })} options={[{ value: '', label: 'No category' }, ...CERTIFICATE_CATEGORIES]} />
        </div>

        <Heading>Credential Details</Heading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Certificate Number" value={f.number} onChange={(e) => set({ number: e.target.value })} />
          <Input label="Credential URL" value={f.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://..." />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</label>
          <textarea rows={3} value={f.description} onChange={(e) => set({ description: e.target.value })} className="bg-card border border-border rounded px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring outline-none w-full resize-y" />
        </div>

        <Heading>Academic / Context</Heading>
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
        <Input label="Related Organization" value={f.org} onChange={(e) => set({ org: e.target.value })} />

        <Heading>Dates</Heading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Issue Date" type="date" value={f.issue} onChange={(e) => set({ issue: e.target.value })} />
          <Input label="Expiry Date" type="date" value={f.expiry} onChange={(e) => set({ expiry: e.target.value })} />
        </div>

        <Heading>Files</Heading>
        {certificate ? (
          <AttachmentSection entityType="certificate" entityId={certificate.id} />
        ) : (
          <PendingFilesField files={files} onChange={setFiles} errors={fileErrors} onErrors={setFileErrors} />
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </Modal>
  )
}
