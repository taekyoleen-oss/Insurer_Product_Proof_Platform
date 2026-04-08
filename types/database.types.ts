export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ippp_agencies: {
        Row: {
          id: string
          name: string
          phone: string | null
          contact_email: string | null
          contract_date: string | null
          address: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          contact_email?: string | null
          contract_date?: string | null
          address?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          contact_email?: string | null
          contract_date?: string | null
          address?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      ippp_internal_members: {
        Row: {
          id: string
          user_id: string
          internal_role: 'super_admin' | 'admin'
          name: string
          email: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          internal_role: 'super_admin' | 'admin'
          name: string
          email: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          internal_role?: 'super_admin' | 'admin'
          name?: string
          email?: string
          is_active?: boolean
          created_at?: string
        }
      }
      ippp_agency_members: {
        Row: {
          id: string
          agency_id: string
          user_id: string
          agency_role: 'agency_admin' | 'agency_member'
          name: string
          email: string
          phone: string | null
          is_active: boolean
          invited_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          user_id: string
          agency_role: 'agency_admin' | 'agency_member'
          name: string
          email: string
          phone?: string | null
          is_active?: boolean
          invited_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          agency_id?: string
          user_id?: string
          agency_role?: 'agency_admin' | 'agency_member'
          name?: string
          email?: string
          phone?: string | null
          is_active?: boolean
          invited_at?: string | null
          created_at?: string
        }
      }
      ippp_requests: {
        Row: {
          id: string
          type: 'hazard_rate' | 'product'
          title: string
          description: string | null
          agency_id: string | null
          assigned_member_ids: string[]
          status: 'draft' | 'in_progress' | 'hold' | 'completed'
          hazard_type: string[]
          product_type: string | null
          due_date: string | null
          in_progress_at: string | null
          archive_at: string | null
          fiscal_year: number | null
          fiscal_quarter: number | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: 'hazard_rate' | 'product'
          title: string
          description?: string | null
          agency_id?: string | null
          assigned_member_ids?: string[]
          status?: 'draft' | 'in_progress' | 'hold' | 'completed'
          hazard_type?: string[]
          product_type?: string | null
          due_date?: string | null
          in_progress_at?: string | null
          archive_at?: string | null
          fiscal_year?: number | null
          fiscal_quarter?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: 'hazard_rate' | 'product'
          title?: string
          description?: string | null
          agency_id?: string | null
          assigned_member_ids?: string[]
          status?: 'draft' | 'in_progress' | 'hold' | 'completed'
          hazard_type?: string[]
          product_type?: string | null
          due_date?: string | null
          in_progress_at?: string | null
          archive_at?: string | null
          fiscal_year?: number | null
          fiscal_quarter?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      ippp_files: {
        Row: {
          id: string
          request_id: string
          uploader_id: string
          filename: string
          storage_path: string
          file_size: number | null
          mime_type: string
          version: number
          deleted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          request_id: string
          uploader_id: string
          filename: string
          storage_path: string
          file_size?: number | null
          mime_type?: string
          version?: number
          deleted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          uploader_id?: string
          filename?: string
          storage_path?: string
          file_size?: number | null
          mime_type?: string
          version?: number
          deleted_at?: string | null
          created_at?: string
        }
      }
      ippp_comments: {
        Row: {
          id: string
          request_id: string
          author_id: string
          content: string
          parent_id: string | null
          deleted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          request_id: string
          author_id: string
          content: string
          parent_id?: string | null
          deleted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          author_id?: string
          content?: string
          parent_id?: string | null
          deleted_at?: string | null
          created_at?: string
        }
      }
      ippp_invitations: {
        Row: {
          id: string
          email: string
          agency_id: string | null
          role: string
          token: string
          expires_at: string
          used_at: string | null
          invited_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          agency_id?: string | null
          role: string
          token: string
          expires_at: string
          used_at?: string | null
          invited_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          agency_id?: string | null
          role?: string
          token?: string
          expires_at?: string
          used_at?: string | null
          invited_by?: string | null
          created_at?: string
        }
      }
      ippp_notifications: {
        Row: {
          id: string
          request_id: string | null
          type: string
          recipient_email: string
          status: string
          resend_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          request_id?: string | null
          type: string
          recipient_email: string
          status?: string
          resend_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          request_id?: string | null
          type?: string
          recipient_email?: string
          status?: string
          resend_id?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_internal_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_my_agency_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_agency_member: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      ippp_request_status: 'draft' | 'in_progress' | 'hold' | 'completed'
      ippp_request_type: 'hazard_rate' | 'product'
      ippp_internal_role: 'super_admin' | 'admin'
      ippp_agency_role: 'agency_admin' | 'agency_member'
    }
  }
}

// ─── 편의 타입 (테이블별 Row 바로 참조) ──────────────────────────────────────

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]
