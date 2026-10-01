import { useState } from 'react'
import { useStore } from '../lib/store'
import { isSemesterConfigured } from '../data/academicWeeks'
import { MATERIAL_TYPE_OPTIONS } from '../lib/materials'
import { getSemesterLabel } from '../lib/selectors'
import type { Material, MaterialType } from '../types'
import { AttachmentSection, PendingFilesField, attachFiles } from './Attachments'
import { Button, Input, Modal, Select } from './ui'

interface Props {
  onClose: () => void
  /** Edit this material (course is fixed). Omit to add. */
  material?: Material
  /** Add mode: preselected course. */
  courseId?: string
  /** Add mode: hide the course picker. */
  lockCourse?: boolean
  onAdded?: (mat: Material, fileErrors: string[], fileCount: number) => void
}

export function MaterialEditor({ onClose, material, courseId, lockCourse, onAdded }: Props) {
  const { state, addMaterial, updateMaterial, addAttachment } = useStore()
  const courses = state.academicYears.flatMap((y) => y.semesters.flatMap((s) => s.courses))
  const [cid, setCid] = useState(material?.courseId ?? courseId ?? courses[0]?.id ?? '')
  const [topic, setTopic] = useState(material ? (material.title || material.topic) : '')
  const [week, setWeek] = useState(String(material?.week ?? 1))
  const [type, setType] = useState<MaterialType>(material?.type ?? 'lecture')
  const [url, setUrl] = useState(material?.url ?? '')
  const [files, setFiles] = useState<File[]>([])
  const [fileErrors, setFileErrors] = useState<string[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const course = courses.find((c) => c.id === cid)

  async function save() {
    if (saving) return
    const w = Number(week)
    if (!cid || !course) return setError('Choose a course')
    if (!topic.trim()) return setError('Title is required')
    if (!Number.isInteger(w) || w < 1 || w > 16) return setError('Week must be 1–16')
    const link = url.trim() || undefined
    if (material) {
      const semId = material.semesterId ?? course.semesterId
      updateMaterial(material.courseId, material.id, {
        topic: topic.trim(),
        title: material.title ? topic.trim() : undefined,
        week: w,
        type,
        url: link,
        ...(w !== material.week && isSemesterConfigured(semId) ? { academicWeek: w } : {}),
      })
      return onClose()
    }
    setSaving(true)
    const mat = addMaterial(cid, { topic: topic.trim(), week: w, type, url: link })
    let errs: string[] = []
    if (files.length > 0) {
      errs = await attachFiles(files, { entityType: 'material', entityId: mat.id, semesterId: mat.semesterId, courseId: cid }, state.attachments, addAttachment)
    }
    setSaving(false)
    onAdded?.(mat, errs, files.length)
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={material ? 'Edit Material' : 'Add Material'}
      actions={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? 'Saving…' : material ? 'Save' : 'Add'}</Button></>}
    >
      <div className="space-y-4">
        {!material && !lockCourse && (
          <Select
            label="Course"
            value={cid}
            onChange={(e) => setCid(e.target.value)}
            options={courses.map((c) => ({ value: c.id, label: `${c.code} — ${c.name} (${getSemesterLabel(state, c.semesterId).replace('Year ', 'Y').replace(' · Semester ', 'S')})` }))}
          />
        )}
        {material && course && <p className="text-xs text-muted-foreground">{course.code} · {course.name}</p>}
        <Input label="Topic / Title" placeholder="e.g. Introduction to Networking" value={topic} onChange={(e) => { setTopic(e.target.value); setError('') }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Week" type="number" min={1} max={16} value={week} onChange={(e) => { setWeek(e.target.value); setError('') }} />
          <Select label="Type" value={type} onChange={(e) => setType(e.target.value as MaterialType)} options={MATERIAL_TYPE_OPTIONS} />
        </div>
        <Input label="URL (optional)" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
        {material ? (
          <AttachmentSection entityType="material" entityId={material.id} semesterId={material.semesterId} courseId={material.courseId} />
        ) : (
          <PendingFilesField files={files} onChange={setFiles} errors={fileErrors} onErrors={setFileErrors} />
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </Modal>
  )
}
