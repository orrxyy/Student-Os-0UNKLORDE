import type { Attachment, AttachmentEntityType } from '../types'

export const MAX_FILE_BYTES = 50 * 1024 * 1024

const BLOCKED_EXT = new Set([
  'exe', 'msi', 'bat', 'cmd', 'com', 'scr', 'pif', 'vbs', 'vbe', 'ps1', 'dll', 'apk', 'jar', 'app', 'dmg', 'sh', 'lnk',
])

const EXT_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  txt: 'text/plain',
  md: 'text/markdown',
  zip: 'application/zip',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
}

export type FileKind = 'image' | 'pdf' | 'document' | 'spreadsheet' | 'presentation' | 'text' | 'archive' | 'other'

export function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i > 0 && i < name.length - 1 ? name.slice(i + 1).toLowerCase() : ''
}

export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? ''
  const cleaned = base
    .replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned || /^\.+$/.test(cleaned)) return 'untitled'
  if (cleaned.length <= 160) return cleaned
  const ext = extOf(cleaned)
  const stem = ext ? cleaned.slice(0, -(ext.length + 1)) : cleaned
  return stem.slice(0, 150 - ext.length) + (ext ? '.' + ext : '')
}

export function resolveMime(file: { name: string; type: string }): string {
  const t = (file.type || '').toLowerCase()
  if (t && t !== 'application/octet-stream') return t
  return EXT_MIME[extOf(file.name)] ?? 'application/octet-stream'
}

export function kindOf(mime: string, name: string): FileKind {
  const ext = extOf(name)
  if (mime.startsWith('image/')) return 'image'
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf'
  if (/spreadsheet|ms-excel|csv/.test(mime) || ['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return 'spreadsheet'
  if (/presentation|powerpoint/.test(mime) || ['ppt', 'pptx', 'odp', 'key'].includes(ext)) return 'presentation'
  if (/word|opendocument\.text|rtf/.test(mime) || ['doc', 'docx', 'odt', 'rtf'].includes(ext)) return 'document'
  if (mime.startsWith('text/') || ['txt', 'md'].includes(ext)) return 'text'
  if (/zip|compressed|x-tar|gzip|7z|rar/.test(mime) || ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive'
  return 'other'
}

const KIND_LABEL: Record<FileKind, string> = {
  image: 'Image', pdf: 'PDF', document: 'Document', spreadsheet: 'Spreadsheet',
  presentation: 'Slides', text: 'Text', archive: 'Archive', other: 'File',
}

export function kindLabel(a: Pick<Attachment, 'mimeType' | 'fileName'>): string {
  const ext = extOf(a.fileName).toUpperCase()
  return ext && ext.length <= 5 ? ext : KIND_LABEL[kindOf(a.mimeType, a.fileName)]
}

/** Types safe to show in a browser tab. SVG/HTML are excluded because blob URLs share our origin. */
export function canPreview(mime: string, name: string): boolean {
  if (mime === 'image/svg+xml') return false
  const k = kindOf(mime, name)
  return k === 'image' || k === 'pdf' || (k === 'text' && mime === 'text/plain')
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / 1024 / 1024).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`
}

export function validateFile(file: File): string | null {
  if (file.size === 0) return `“${file.name}” is empty (0 bytes), so it was not attached.`
  if (BLOCKED_EXT.has(extOf(file.name))) return `“${file.name}”: executable and script files can't be attached.`
  if (file.size > MAX_FILE_BYTES)
    return `“${file.name}” is ${formatBytes(file.size)}, too large for local storage (limit ${formatBytes(MAX_FILE_BYTES)}). Cloud storage will be supported in a future version.`
  return null
}

export function newAttachmentId(existing: Attachment[]): string {
  const taken = new Set(existing.map((a) => a.id))
  for (;;) {
    const rand =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).slice(2)
    const id = `att_${rand}`
    if (!taken.has(id)) return id
  }
}

export function attachmentsFor(all: Attachment[], type: AttachmentEntityType, id: string): Attachment[] {
  return all.filter((a) => a.entityType === type && a.entityId === id)
}
