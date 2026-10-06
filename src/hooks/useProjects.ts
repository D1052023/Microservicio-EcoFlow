import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
  isRlsDenial,
  toAppError,
  type AppError,
  type InstallerOption,
  type ProjectInsert,
  type ProjectStatus,
  type ProjectWithInstaller,
} from '@/types/database.types'

function mapSupabaseFailure(error: unknown): AppError {
  const parsed = toAppError(error)
  if (isRlsDenial(parsed)) {
    return {
      ...parsed,
      message:
        'Operación denegada por seguridad (RLS). No tiene permiso sobre este recurso.',
    }
  }
  return parsed
}

export function useProjects() {
  const [projects, setProjects] = useState<ProjectWithInstaller[]>([])
  const [installers, setInstallers] = useState<InstallerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<AppError | null>(null)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: queryError } = await supabase
        .from('projects')
        .select(
          `
          id,
          title,
          client_name,
          address,
          status,
          assigned_installer_id,
          created_at,
          updated_at,
          installers (
            id,
            specialty,
            profiles (
              full_name
            )
          )
        `,
        )
        .order('created_at', { ascending: false })

      if (queryError) {
        throw queryError
      }

      setProjects((data as ProjectWithInstaller[] | null) ?? [])
    } catch (cause) {
      setProjects([])
      setError(mapSupabaseFailure(cause))
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchInstallers = useCallback(async () => {
    try {
      const { data, error: queryError } = await supabase
        .from('installers')
        .select(
          `
          id,
          specialty,
          profiles (
            full_name
          )
        `,
        )
        .order('created_at', { ascending: true })

      if (queryError) {
        throw queryError
      }

      type InstallerJoin = {
        id: string
        specialty: string | null
        profiles: { full_name: string } | { full_name: string }[] | null
      }

      const options: InstallerOption[] = ((data as InstallerJoin[] | null) ?? []).map(
        (row) => {
          const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
          return {
            id: row.id,
            specialty: row.specialty,
            full_name: profile?.full_name ?? 'Instalador',
          }
        },
      )

      setInstallers(options)
    } catch (cause) {
      setError(mapSupabaseFailure(cause))
    }
  }, [])

  const createProject = useCallback(async (payload: ProjectInsert) => {
    const { data, error: insertError } = await supabase
      .from('projects')
      .insert(payload)
      .select(
        `
        id,
        title,
        client_name,
        address,
        status,
        assigned_installer_id,
        created_at,
        updated_at,
        installers (
          id,
          specialty,
          profiles (
            full_name
          )
        )
      `,
      )
      .single()

    if (insertError) {
      const parsed = mapSupabaseFailure(insertError)
      setError(parsed)
      return { data: null, error: parsed }
    }

    setProjects((current) => [data as ProjectWithInstaller, ...current])
    setError(null)
    return { data: data as ProjectWithInstaller, error: null }
  }, [])

  const updateStatus = useCallback(async (projectId: string, status: ProjectStatus) => {
    const { data, error: updateError } = await supabase
      .from('projects')
      .update({ status })
      .eq('id', projectId)
      .select(
        `
        id,
        title,
        client_name,
        address,
        status,
        assigned_installer_id,
        created_at,
        updated_at,
        installers (
          id,
          specialty,
          profiles (
            full_name
          )
        )
      `,
      )
      .single()

    if (updateError) {
      const parsed = mapSupabaseFailure(updateError)
      setError(parsed)
      return { data: null, error: parsed }
    }

    setProjects((current) =>
      current.map((project) =>
        project.id === projectId ? (data as ProjectWithInstaller) : project,
      ),
    )
    setError(null)
    return { data: data as ProjectWithInstaller, error: null }
  }, [])

  useEffect(() => {
    void fetchProjects()
    void fetchInstallers()
  }, [fetchProjects, fetchInstallers])

  const metrics = useMemo(() => {
    return {
      total: projects.length,
      pending: projects.filter((p) => p.status === 'Pendiente').length,
      inProgress: projects.filter((p) => p.status === 'En Progreso').length,
      completed: projects.filter((p) => p.status === 'Completado').length,
    }
  }, [projects])

  return {
    projects,
    installers,
    loading,
    error,
    metrics,
    fetchProjects,
    fetchInstallers,
    createProject,
    updateStatus,
  }
}
