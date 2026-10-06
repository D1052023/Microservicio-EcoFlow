import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, children, ...props }, ref) => {
    const selectId = id ?? props.name

    return (
      <label className="flex w-full flex-col gap-1.5" htmlFor={selectId}>
        {label ? (
          <span className="text-sm font-medium text-slate-700">{label}</span>
        ) : null}
        <select
          id={selectId}
          ref={ref}
          className={cn(
            'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-eco-ink shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eco-emerald',
            error && 'border-red-400 focus-visible:ring-red-500',
            className,
          )}
          aria-invalid={Boolean(error)}
          {...props}
        >
          {children}
        </select>
        {error ? (
          <span className="text-xs text-red-600" role="alert">
            {error}
          </span>
        ) : null}
      </label>
    )
  },
)

Select.displayName = 'Select'
