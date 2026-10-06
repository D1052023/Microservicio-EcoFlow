import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Spinner } from '@/components/ui/Spinner'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { DashboardPage } from '@/pages/DashboardPage'
import { LoginPage } from '@/pages/LoginPage'
import { isSupabaseConfigured } from '@/lib/supabase'

function ProtectedDashboard() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <DashboardPage />
}

function PublicLogin() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (session) {
    return <Navigate to="/" replace />
  }

  return <LoginPage />
}

function LocalReadyScreen() {
  const supabaseReady = isSupabaseConfigured()

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <main className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
        <p className="text-sm font-medium text-eco-emerald">EcoFlow</p>
        <h1 className="mt-2 text-2xl font-semibold text-eco-ink">Entorno local activo</h1>
        <p className="mt-2 text-sm text-slate-500">
          Vite + React + TypeScript + Tailwind CSS están corriendo en{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">npm run dev</code>.
        </p>

        <ul className="mt-6 space-y-2 text-sm">
          <StatusRow label="Servidor Vite" ok />
          <StatusRow label="React montado en #root" ok />
          <StatusRow label="Tailwind CSS" ok />
          <StatusRow
            label="Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)"
            ok={supabaseReady}
          />
        </ul>

        {!supabaseReady ? (
          <p className="mt-6 text-sm text-slate-600">
            Copie <code className="rounded bg-slate-100 px-1">.env.example</code> a{' '}
            <code className="rounded bg-slate-100 px-1">.env</code>, complete las claves de
            Supabase y reinicie el servidor para abrir el tablero.
          </p>
        ) : null}
      </main>
    </div>
  )
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2">
      <span className="text-slate-700">{label}</span>
      <span className={ok ? 'font-medium text-eco-emerald' : 'font-medium text-amber-600'}>
        {ok ? 'OK' : 'Pendiente'}
      </span>
    </li>
  )
}

export default function App() {
  if (!isSupabaseConfigured()) {
    return <LocalReadyScreen />
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicLogin />} />
          <Route path="/" element={<ProtectedDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
