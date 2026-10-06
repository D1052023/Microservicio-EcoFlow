export type UserRole = 'admin' | 'installer'

export type ProjectStatus = 'Pendiente' | 'En Progreso' | 'Completado'

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          role: UserRole
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          role?: UserRole
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          role?: UserRole
          created_at?: string
        }
        Relationships: []
      }
      installers: {
        Row: {
          id: string
          profile_id: string
          phone: string | null
          specialty: string | null
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          phone?: string | null
          specialty?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          phone?: string | null
          specialty?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'installers_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: true
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      projects: {
        Row: {
          id: string
          title: string
          client_name: string
          address: string
          status: ProjectStatus
          assigned_installer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          client_name: string
          address: string
          status?: ProjectStatus
          assigned_installer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          client_name?: string
          address?: string
          status?: ProjectStatus
          assigned_installer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'projects_assigned_installer_id_fkey'
            columns: ['assigned_installer_id']
            isOneToOne: false
            referencedRelation: 'installers'
            referencedColumns: ['id']
          },
        ]
      }
      materials: {
        Row: {
          id: string
          project_id: string
          name: string
          quantity: number
          unit_cost: number
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          quantity: number
          unit_cost: number
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          quantity?: number
          unit_cost?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'materials_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      current_installer_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      can_access_project: {
        Args: { p_project_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Profile = Tables<'profiles'>
export type Installer = Tables<'installers'>
export type Project = Tables<'projects'>
export type Material = Tables<'materials'>
export type ProjectInsert = TablesInsert<'projects'>

export type ProjectWithInstaller = Project & {
  installers: {
    id: string
    specialty: string | null
    profiles: {
      full_name: string
    } | null
  } | null
}

export type InstallerOption = {
  id: string
  full_name: string
  specialty: string | null
}

export type AppError = {
  message: string
  code?: string
  hint?: string
  status?: number
}

export function toAppError(error: unknown): AppError {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    const e = error as {
      message: string
      code?: string
      hint?: string
      status?: number
    }
    return {
      message: e.message,
      code: e.code,
      hint: e.hint,
      status: e.status,
    }
  }

  if (error instanceof Error) {
    return { message: error.message }
  }

  return { message: 'Error inesperado' }
}

export function isRlsDenial(error: AppError): boolean {
  const blob = `${error.message} ${error.code ?? ''} ${error.hint ?? ''}`.toLowerCase()
  return (
    blob.includes('row-level security') ||
    blob.includes('permission denied') ||
    error.code === '42501' ||
    error.code === 'PGRST301' ||
    error.status === 401 ||
    error.status === 403
  )
}
