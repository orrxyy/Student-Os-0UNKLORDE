import type { Attachment, AttachmentEntityType } from '../types'
import { supabase } from './supabase'

const BUCKET = 'student-attachments'

interface AttachmentRow {
  id: string
  user_id: string
  entity_type: AttachmentEntityType
  entity_id: string
  file_name: string
  mime_type: string
  file_size: number
  bucket_id: string
  storage_path: string
  semester_id: string | null
  course_id: string | null
  created_at: string
  updated_at: string
}

async function getUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('You must be signed in to manage attachments.')
  return data.user.id
}

function fromRow(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSize: Number(row.file_size),
    semesterId: row.semester_id ?? undefined,
    courseId: row.course_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // The remote storage adapter builds the full path from user ID + attachment ID.
    storage: { provider: 'remote', key: row.id },
  }
}

export async function fetchRemoteAttachments(): Promise<Attachment[]> {
  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => fromRow(row as AttachmentRow))
}

export async function saveRemoteAttachment(attachment: Attachment): Promise<void> {
  const userId = await getUserId()

  const row: AttachmentRow = {
    id: attachment.id,
    user_id: userId,
    entity_type: attachment.entityType,
    entity_id: attachment.entityId,
    file_name: attachment.fileName,
    mime_type: attachment.mimeType,
    file_size: attachment.fileSize,
    bucket_id: BUCKET,
    storage_path: `${userId}/${attachment.id}`,
    semester_id: attachment.semesterId ?? null,
    course_id: attachment.courseId ?? null,
    created_at: attachment.createdAt,
    updated_at: attachment.updatedAt,
  }

  const { error } = await supabase
    .from('attachments')
    .upsert(row, { onConflict: 'id' })

  if (error) throw error
}

export async function deleteRemoteAttachment(attachment: Attachment): Promise<void> {
  const userId = await getUserId()
  const path = `${userId}/${attachment.id}`

  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([path])

  if (storageError) throw storageError

  const { error: rowError } = await supabase
    .from('attachments')
    .delete()
    .eq('id', attachment.id)

  if (rowError) throw rowError
}
