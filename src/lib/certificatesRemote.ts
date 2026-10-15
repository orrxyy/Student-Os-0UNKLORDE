import { supabase } from './supabase'
import type { Certificate, CertificateCategory } from '../types'

interface CertificateRow {
  id: string
  title: string
  issuer: string
  category: CertificateCategory | null
  issue_date: string | null
  expiry_date: string | null
  certificate_number: string | null
  description: string | null
  course_id: string | null
  semester_id: string | null
  related_organization: string | null
  credential_url: string | null
  created_at: string
  updated_at: string
}

function fromRow(row: CertificateRow): Certificate {
  return {
    id: row.id,
    title: row.title,
    issuer: row.issuer,
    category: row.category ?? undefined,
    issueDate: row.issue_date ?? undefined,
    expiryDate: row.expiry_date ?? undefined,
    certificateNumber: row.certificate_number ?? undefined,
    description: row.description ?? undefined,
    courseId: row.course_id ?? undefined,
    semesterId: row.semester_id ?? undefined,
    relatedOrganization: row.related_organization ?? undefined,
    credentialUrl: row.credential_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toRow(certificate: Certificate): CertificateRow {
  return {
    id: certificate.id,
    title: certificate.title,
    issuer: certificate.issuer,
    category: certificate.category ?? null,
    issue_date: certificate.issueDate ?? null,
    expiry_date: certificate.expiryDate ?? null,
    certificate_number: certificate.certificateNumber ?? null,
    description: certificate.description ?? null,
    course_id: certificate.courseId ?? null,
    semester_id: certificate.semesterId ?? null,
    related_organization: certificate.relatedOrganization ?? null,
    credential_url: certificate.credentialUrl ?? null,
    created_at: certificate.createdAt,
    updated_at: certificate.updatedAt,
  }
}

export async function fetchCertificates(): Promise<Certificate[]> {
  const { data, error } = await supabase
    .from('certificates')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => fromRow(row as CertificateRow))
}

export async function saveRemoteCertificate(
  certificate: Certificate,
): Promise<void> {
  const { error } = await supabase
    .from('certificates')
    .upsert(toRow(certificate), { onConflict: 'id' })

  if (error) throw error
}

export async function deleteRemoteCertificate(id: string): Promise<void> {
  const { error } = await supabase
    .from('certificates')
    .delete()
    .eq('id', id)

  if (error) throw error
}
