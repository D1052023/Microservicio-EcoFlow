import { MapPin, UserRound } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import type { ProjectStatus, ProjectWithInstaller } from '@/types/database.types'

const statusVariant: Record<ProjectStatus, 'pending' | 'progress' | 'completed'> = {
  Pendiente: 'pending',
  'En Progreso': 'progress',
  Completado: 'completed',
}

type ProjectCardProps = {
  project: ProjectWithInstaller
  canUpdateStatus: boolean
  onStatusChange: (status: ProjectStatus) => void
}

export function ProjectCard({ project, canUpdateStatus, onStatusChange }: ProjectCardProps) {
  const installerName = project.installers?.profiles?.full_name ?? 'Sin asignar'

  return (
    <Card className="h-full hover:-translate-y-0.5">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle>{project.title}</CardTitle>
          <Badge variant={statusVariant[project.status]}>{project.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <UserRound className="h-4 w-4 text-slate-400" aria-hidden />
          {project.client_name}
        </p>
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <MapPin className="h-4 w-4 text-slate-400" aria-hidden />
          {project.address}
        </p>
        <p className="text-xs text-slate-500">Instalador: {installerName}</p>

        {canUpdateStatus ? (
          <Select
            aria-label={`Estado de ${project.title}`}
            value={project.status}
            onChange={(event) => onStatusChange(event.target.value as ProjectStatus)}
          >
            <option value="Pendiente">Pendiente</option>
            <option value="En Progreso">En Progreso</option>
            <option value="Completado">Completado</option>
          </Select>
        ) : null}
      </CardContent>
    </Card>
  )
}
