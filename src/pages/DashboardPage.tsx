import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { ProjectCard } from '@/components/dashboard/ProjectCard'
import { ProjectFormModal } from '@/components/dashboard/ProjectFormModal'
import { ProjectMetrics } from '@/components/dashboard/ProjectMetrics'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ProjectCardSkeleton } from '@/components/ui/Spinner'
import { useAuth } from '@/hooks/useAuth'
import { useProjects } from '@/hooks/useProjects'
import type { ProjectInsert, ProjectStatus } from '@/types/database.types'

const ALL = 'todos'

export function DashboardPage() {
  const { profile } = useAuth()
  const {
    projects,
    installers,
    loading,
    error,
    metrics,
    createProject,
    updateStatus,
  } = useProjects()

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<typeof ALL | ProjectStatus>(ALL)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const isAdmin = profile?.role === 'admin'

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return projects.filter((project) => {
      const matchesStatus = statusFilter === ALL || project.status === statusFilter
      const matchesQuery =
        needle.length === 0 ||
        project.title.toLowerCase().includes(needle) ||
        project.client_name.toLowerCase().includes(needle)
      return matchesStatus && matchesQuery
    })
  }, [projects, query, statusFilter])

  async function handleCreate(payload: ProjectInsert) {
    setSubmitting(true)
    setFormError(null)
    const result = await createProject(payload)
    setSubmitting(false)

    if (result.error) {
      setFormError(result.error.message)
      return
    }

    setModalOpen(false)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-eco-ink">Tablero de proyectos</h1>
            <p className="text-sm text-slate-500">
              Seguimiento de instalaciones solares y asignación de cuadrillas.
            </p>
          </div>
          {isAdmin ? (
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Nuevo proyecto
            </Button>
          ) : null}
        </div>

        <ProjectMetrics {...metrics} />

        {error ? <Alert variant="error">{error.message}</Alert> : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-9 h-4 w-4 text-slate-400" />
            <Input
              name="search"
              label="Buscar"
              placeholder="Cliente o título"
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select
            name="statusFilter"
            label="Filtrar por estado"
            className="sm:w-56"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof ALL | ProjectStatus)}
          >
            <option value={ALL}>Todos</option>
            <option value="Pendiente">Pendiente</option>
            <option value="En Progreso">En Progreso</option>
            <option value="Completado">Completado</option>
          </Select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <ProjectCardSkeleton />
            <ProjectCardSkeleton />
            <ProjectCardSkeleton />
          </div>
        ) : filtered.length === 0 ? (
          <Alert variant="info">No hay proyectos que coincidan con los filtros.</Alert>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                canUpdateStatus
                onStatusChange={(status) => {
                  void updateStatus(project.id, status)
                }}
              />
            ))}
          </div>
        )}
      </main>

      <ProjectFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
        installers={installers}
        submitting={submitting}
        submitError={formError}
      />
    </div>
  )
}
