import { CheckCircle2, CircleDashed, FolderKanban, Loader } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'

type ProjectMetricsProps = {
  total: number
  pending: number
  inProgress: number
  completed: number
}

const items = [
  { key: 'total', label: 'Total de proyectos', icon: FolderKanban, accent: 'text-eco-ink' },
  { key: 'pending', label: 'Pendientes', icon: CircleDashed, accent: 'text-amber-600' },
  { key: 'inProgress', label: 'En progreso', icon: Loader, accent: 'text-eco-blue' },
  { key: 'completed', label: 'Completados', icon: CheckCircle2, accent: 'text-eco-emerald' },
] as const

export function ProjectMetrics({
  total,
  pending,
  inProgress,
  completed,
}: ProjectMetricsProps) {
  const values = { total, pending, inProgress, completed }

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Card key={item.key}>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {item.label}
                </p>
                <p className="mt-1 text-2xl font-semibold text-eco-ink" data-testid={`metric-${item.key}`}>
                  {values[item.key]}
                </p>
              </div>
              <Icon className={`h-8 w-8 ${item.accent}`} aria-hidden />
            </CardContent>
          </Card>
        )
      })}
    </section>
  )
}
