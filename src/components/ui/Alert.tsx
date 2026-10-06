import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant?: 'error' | 'success' | 'info'
}

const icons = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
}

export function Alert({ className, variant = 'info', children, ...props }: AlertProps) {
  const Icon = icons[variant]

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-all duration-200',
        variant === 'error' && 'border-red-200 bg-red-50 text-red-800',
        variant === 'success' && 'border-emerald-200 bg-emerald-50 text-eco-forest',
        variant === 'info' && 'border-blue-200 bg-blue-50 text-blue-800',
        className,
      )}
      {...props}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  )
}
