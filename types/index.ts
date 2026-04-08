// ─── 기본 열거형 타입 ───────────────────────────────────────────────────────

export type RequestStatus = 'draft' | 'in_progress' | 'hold' | 'completed'
export type RequestType = 'hazard_rate' | 'product'
export type InternalRole = 'super_admin' | 'admin'
export type AgencyRole = 'agency_admin' | 'agency_member'
export type NotificationType = 'new_comment' | 'new_file' | 'status_changed' | 'invitation'

// ─── 고정 선택 값 ──────────────────────────────────────────────────────────

export const HAZARD_TYPES = [
  '사망위험률',
  '질병위험률',
  '상해위험률',
  '신체후유장위험률',
  '장기요양위험률',
] as const

export const PRODUCT_TYPES = [
  '사망보험',
  '질병보험/CI보험',
  '연금보험',
  '장기요양보험',
] as const

export type HazardType = (typeof HAZARD_TYPES)[number]
export type ProductType = (typeof PRODUCT_TYPES)[number]

// ─── 필터 타입 ────────────────────────────────────────────────────────────

export interface RequestFilters {
  status?: RequestStatus
  agency_id?: string
  keyword?: string
  fiscal_year?: number
}

export interface ArchiveFilters {
  hazard_type?: string[]
  product_type?: string
  agency_id?: string
  fiscal_year?: number
  keyword?: string
}

export type ReportPeriod = {
  type: 'month' | 'quarter' | 'half' | 'year' | 'last12months' | 'custom'
  start?: string // ISO date string
  end?: string   // ISO date string
}

// ─── 도메인 엔티티 타입 ───────────────────────────────────────────────────

export interface Agency {
  id: string
  name: string
  is_active: boolean
  phone: string | null
  contact_email: string | null
  contract_date: string | null
  address: string | null
  created_at: string
}

export interface InternalMember {
  id: string
  user_id: string
  name: string
  email: string
  internal_role: InternalRole
  is_active: boolean
  created_at: string
}

export interface AgencyMember {
  id: string
  agency_id: string
  user_id: string
  name: string
  email: string
  phone: string | null
  agency_role: AgencyRole
  is_active: boolean
  invited_at: string | null
  created_at: string
}

export interface Request {
  id: string
  type: RequestType
  title: string
  description: string | null
  agency_id: string
  assigned_member_ids: string[] | null
  status: RequestStatus
  hazard_type: string[] | null
  product_type: string | null
  due_date: string | null
  in_progress_at: string | null
  archive_at: string | null
  fiscal_year: number | null
  fiscal_quarter: number | null
  created_at: string
  updated_at: string
}

export interface RequestWithAgency extends Request {
  agency: Pick<Agency, 'id' | 'name' | 'is_active'>
}

export interface IpppFile {
  id: string
  request_id: string
  uploader_id: string
  filename: string
  storage_path: string
  version: number
  file_size: number | null
  mime_type: string | null
  deleted_at: string | null
  created_at: string
}

export interface Comment {
  id: string
  request_id: string
  author_id: string
  content: string
  parent_id: string | null
  deleted_at: string | null
  created_at: string
}

export interface CommentWithChildren extends Comment {
  children?: Comment[]
}

export interface Invitation {
  id: string
  email: string
  agency_id: string | null
  role: string
  token: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export interface Notification {
  id: string
  request_id: string | null
  type: NotificationType
  recipient_email: string
  status: 'sent' | 'failed'
  resend_id: string | null
  created_at: string
}

// ─── KPI 타입 ─────────────────────────────────────────────────────────────

export interface AdminKpi {
  totalActive: number
  completedThisMonth: number
  dueSoonCount: number
  agencyActiveCounts: { agency_id: string; agency_name: string; count: number }[]
}

export interface AgencyKpi {
  activeCount: number
  dueSoonCount: number
  completedCount: number
}

// ─── 리포트 타입 ─────────────────────────────────────────────────────────

export interface AgencyReportRow {
  agency_id: string
  agency_name: string
  total: number
  completed: number
  completionRate: number
  avgDays: number | null
}

export interface AgencyOwnReportRow {
  total: number
  completed: number
  completionRate: number
  avgDays: number | null
  requests: Pick<Request, 'id' | 'title' | 'status' | 'in_progress_at' | 'archive_at'>[]
}
