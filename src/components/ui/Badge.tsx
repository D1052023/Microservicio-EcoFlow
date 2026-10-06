import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all duration-200',
  {
    variants: {
      variant: {
        pending: 'bg-amber-100 text-amber-800',
        progress: 'bg-blue-100 text-eco-blue',
        completed: 'bg-emerald-100 text-eco-forest',
        role: 'bg-slate-100 text-slate-700',
      },
    },
    defaultVariants: {
      variant: 'role',
    },
  },
)

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
