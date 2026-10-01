import { useEffect, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { getAttachments } from '../lib/selectors'
import { fileStorage, isQuotaError } from '../lib/attachmentStorage'
import {
  canPreview, formatBytes, kindLabel, kindOf, newAttachmentId, resolveMime, sanitizeFileName, validateFile,
} from '../lib/attachments'
import { Icon, Modal } from './ui'
import type { Attachment, AttachmentEntityType } from '../types'

type IconName = Parameters<typeof Icon>[0]['name']

const KIND_ICON: Record<ReturnType<typeof kindOf>, IconName> = {
  image: 'layers', pdf: 'file-text', document: 'file-text', spreadsheet: 'grid',
  presentation: 'layers', text: 'file-text', archive: 'folder', other: 'paperclip',
}

function useBlobUrl(a: Attachment, enabled: boolean) {
  const [url, setUrl] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  useEffect(() => {
    if (!enabled) return
    let revoke: string | null = null
    let alive = true
    fileStorage
      .get(a.storage.key)
      .then((blob) => {
        if (!alive) return
        if (!blob) return setMissing(true)
        revoke = URL.createObjectURL(blob.type === a.mimeType ? blob : new Blob([blob], { type: a.mimeType }))
        setUrl(revoke)
      })
      .catch(() => alive && setMissing(true))
    return () => {
      alive = false
      if (revoke) URL.revokeObjectURL(revoke)
    }
  }, [a.storage.key, a.mimeType, enabled])
  return { url, missing }
}

async function blobFor(a: Attachment): Promise<string | null> {
  const blob = await fileStorage.get(a.storage.key)
  if (!blob) return null
  return URL.createObjectURL(blob.type === a.mimeType ? blob : new Blob([blob], { type: a.mimeType }))
}

function AttachmentCard({ a, onRemove }: { a: Attachment; onRemove: () => void }) {
  const kind = kindOf(a.mimeType, a.fileName)
  const previewable = canPreview(a.mimeType, a.fileName)
  const isImage = kind === 'image' && previewable
  const { url, missing } = useBlobUrl(a, isImage)
  const [lightbox, setLightbox] = useState(false)
  const [lost, setLost] = useState(false)

  async function open() {
    const u = await blobFor(a)
    if (!u) return setLost(true)
    if (previewable) {
      window.open(u, '_blank', 'noopener')
    } else {
      const el = document.createElement('a')
      el.href = u
      el.download = a.fileName
      el.click()
    }
    setTimeout(() => URL.revokeObjectURL(u), 60_000)
  }

  async function download() {
    const u = await blobFor(a)
    if (!u) return setLost(true)
    const el = document.createElement('a')
    el.href = u
    el.download = a.fileName
    el.click()
    setTimeout(() => URL.revokeObjectURL(u), 10_000)
  }

  const btn =
    'inline-flex items-center justify-center gap-1 h-9 min-w-9 px-2.5 rounded-md text-xs font-medium border border-border bg-card text-foreground hover:bg-muted transition-colors'

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-muted/40 min-w-0">
      {isImage && url && !missing ? (
        <button type="button" onClick={() => setLightbox(true)} className="w-11 h-11 rounded-md overflow-hidden shrink-0 border border-border" aria-label={`Preview ${a.fileName}`}>
          <img src={url} alt="" className="w-full h-full object-cover" />
        </button>
      ) : (
        <div className="w-11 h-11 rounded-md bg-sage-light text-primary flex items-center justify-center shrink-0">
          <Icon name={KIND_ICON[kind]} size={18} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" title={a.fileName}>{a.fileName}</p>
        <p className="text-[11px] font-mono text-muted-foreground truncate">
          {lost || missing ? 'File unavailable on this device' : `${kindLabel(a)} · ${formatBytes(a.fileSize)}`}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {!(lost || missing) && (
          <button type="button" onClick={open} className={btn} aria-label={previewable ? `Open ${a.fileName}` : `Download ${a.fileName}`}>
            <Icon name={previewable ? 'external-link' : 'download'} size={13} />
            <span className="max-sm:hidden">{previewable ? 'Open' : 'Download'}</span>
          </button>
        )}
        {!(lost || missing) && previewable && (
          <button type="button" onClick={download} className={`${btn} max-sm:hidden`} aria-label={`Download ${a.fileName}`}>
            <Icon name="download" size={13} />
          </button>
        )}
        <button type="button" onClick={onRemove} className={`${btn} hover:text-destructive`} aria-label={`Remove ${a.fileName}`}>
          <Icon name="trash-2" size={13} />
          <span className="max-sm:hidden">Remove</span>
        </button>
      </div>
      <Modal open={lightbox} onClose={() => setLightbox(false)} title={a.fileName} className="max-w-2xl">
        {url && <img src={url} alt={a.fileName} className="w-full max-h-[70dvh] object-contain rounded-md" />}
      </Modal>
    </div>
  )
}

interface AttachTarget {
  entityType: AttachmentEntityType
  entityId: string
  semesterId?: string
  courseId?: string
}

/** Validate, store bytes via fileStorage, then record metadata. Returns user-facing error strings. */
export async function attachFiles(
  files: File[],
  target: AttachTarget,
  existing: Attachment[],
  addAttachment: (a: Attachment) => void,
): Promise<string[]> {
  const errs: string[] = []
  const used: Attachment[] = [...existing]
  for (const file of files) {
    const problem = validateFile(file)
    if (problem) {
      errs.push(problem)
      continue
    }
    const id = newAttachmentId(used)
    const mimeType = resolveMime(file)
    try {
      await fileStorage.save(id, file.type === mimeType ? file : new Blob([file], { type: mimeType }))
    } catch (e) {
      errs.push(
        isQuotaError(e)
          ? `“${file.name}”: browser storage is full. Remove some attachments and try again.`
          : `“${file.name}” could not be saved: ${e instanceof Error ? e.message : 'storage error'}`,
      )
      continue
    }
    const now = new Date().toISOString()
    const att: Attachment = {
      id, fileName: sanitizeFileName(file.name), mimeType, fileSize: file.size,
      createdAt: now, updatedAt: now,
      storage: { provider: fileStorage.provider, key: id },
      ...target,
    }
    used.push(att)
    addAttachment(att)
  }
  return errs
}

/** File picker for forms where the parent entity doesn't exist yet. Holds files in memory until the parent saves. */
export function PendingFilesField({
  files, onChange, errors, onErrors,
}: { files: File[]; onChange: (f: File[]) => void; errors: string[]; onErrors: (e: string[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)

  function pick(list: FileList | null) {
    if (!list) return
    const ok: File[] = []
    const errs: string[] = []
    for (const f of Array.from(list)) {
      const problem = validateFile(f)
      if (problem) errs.push(problem)
      else ok.push(f)
    }
    onChange([...files, ...ok])
    onErrors(errs)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-2 min-w-0">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Files</p>
      {files.map((f, i) => {
        const kind = kindOf(resolveMime(f), f.name)
        return (
          <div key={`${f.name}-${i}`} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-muted/40 min-w-0">
            <div className="w-9 h-9 rounded-md bg-sage-light text-primary flex items-center justify-center shrink-0">
              <Icon name={KIND_ICON[kind]} size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" title={f.name}>{sanitizeFileName(f.name)}</p>
              <p className="text-[11px] font-mono text-muted-foreground">{formatBytes(f.size)}</p>
            </div>
            <button
              type="button"
              onClick={() => onChange(files.filter((_, j) => j !== i))}
              aria-label={`Remove ${f.name}`}
              className="inline-flex items-center justify-center gap-1 h-10 min-w-10 px-2.5 rounded-md text-xs font-medium border border-border bg-card hover:bg-muted hover:text-destructive transition-colors shrink-0"
            >
              <Icon name="x" size={13} />
              <span className="max-sm:hidden">Remove</span>
            </button>
          </div>
        )
      })}
      <input ref={inputRef} type="file" multiple hidden onChange={(e) => pick(e.target.files)} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1.5 h-10 px-3 rounded-md text-xs font-medium border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-accent hover:bg-muted/50 transition-colors"
      >
        <Icon name="plus" size={13} />
        Upload Files
      </button>
      {errors.map((e) => (
        <p key={e} className="text-xs text-destructive break-words">{e}</p>
      ))}
    </div>
  )
}

interface Props {
  entityType: AttachmentEntityType
  entityId: string
  semesterId?: string
  courseId?: string
  /** Hide the heading row when the list is empty (inline use inside cards). */
  compact?: boolean
  className?: string
}

export function AttachmentSection({ entityType, entityId, semesterId, courseId, compact, className = '' }: Props) {
  const { state, addAttachment, removeAttachment } = useStore()
  const list = getAttachments(state, entityType, entityId)
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) return
    setBusy(true)
    setErrors(await attachFiles(Array.from(files), { entityType, entityId, semesterId, courseId }, state.attachments, addAttachment))
    setBusy(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={`space-y-2 min-w-0 ${className}`}>
      {(!compact || list.length > 0) && (
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
            Attachments{list.length > 0 ? ` · ${list.length}` : ''}
          </p>
        </div>
      )}
      {list.map((a) => (
        <AttachmentCard key={a.id} a={a} onRemove={() => removeAttachment(a.id)} />
      ))}
      <input ref={inputRef} type="file" multiple hidden onChange={(e) => onPick(e.target.files)} />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1.5 h-10 px-3 rounded-md text-xs font-medium border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-accent hover:bg-muted/50 transition-colors disabled:opacity-50"
      >
        <Icon name="paperclip" size={13} />
        {busy ? 'Attaching…' : list.length ? 'Add another file' : 'Attach file'}
      </button>
      {errors.map((e) => (
        <p key={e} className="text-xs text-destructive break-words">{e}</p>
      ))}
    </div>
  )
}

/** Small toggle badge showing the attachment count; pair with a conditional <AttachmentSection/>. */
export function AttachmentToggle({
  entityType, entityId, open, onToggle, showLabel,
}: { entityType: AttachmentEntityType; entityId: string; open: boolean; onToggle: () => void; showLabel?: boolean }) {
  const { state } = useStore()
  const n = getAttachments(state, entityType, entityId).length
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={`Attachments (${n})`}
      className={`inline-flex items-center gap-1 h-9 min-w-9 px-2 justify-center rounded-md text-xs font-mono transition-colors shrink-0 ${
        open || n > 0 ? 'text-accent bg-accent/10' : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted'
      }`}
    >
      <Icon name="paperclip" size={13} />
      {n > 0 && (showLabel ? `${n} ${n === 1 ? 'file' : 'files'}` : n)}
    </button>
  )
}
