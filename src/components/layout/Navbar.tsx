import { LogOut, Sun } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

export function Navbar() {
  const { profile, user, signOut } = useAuth()
  const roleLabel = profile?.role === 'admin' ? 'admin' : 'instalador'

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-eco-emerald text-white">
            <Sun className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-eco-ink">EcoFlow</p>
            <p className="text-xs text-slate-500">Instalaciones solares</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-eco-ink">
              {profile?.full_name ?? user?.email ?? 'Usuario'}
            </p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
          <Badge variant="role" data-testid="role-badge">
            {roleLabel}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => void signOut()}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Cerrar sesión</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
