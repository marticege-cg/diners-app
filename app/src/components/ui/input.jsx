import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

const base = 'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(base, className)} {...props} />;
});

export const NativeSelect = forwardRef(function NativeSelect({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(base, 'cursor-pointer appearance-none bg-no-repeat pr-7', className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundPosition: 'right 8px center' }}
      {...props}>
      {children}
    </select>
  );
});

export function Label({ className, ...props }) {
  return <label className={cn('text-[11px] font-medium uppercase tracking-wide text-muted-foreground', className)} {...props} />;
}
