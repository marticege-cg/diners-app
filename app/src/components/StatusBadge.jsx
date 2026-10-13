import { CheckCircle2, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

/** Estat visual d'un moviment: Desat · Pendent de revisar per IA · Error de sincronització · Desant… */
export function statusOf(t) {
  if (t._sync === 'error') return 'error';
  if (t._sync === 'saving') return 'saving';
  if (t.status === 'pending_ai') return 'pending_ai';
  return 'saved';
}

const META = {
  saved: { label: 'Desat', Icon: CheckCircle2, cls: 'text-success bg-success/10 border-success/25' },
  saving: { label: 'Desant…', Icon: Loader2, cls: 'text-muted-foreground bg-muted border-border', spin: true },
  pending_ai: { label: 'Pendent de revisar per IA', Icon: Sparkles, cls: 'text-warning bg-warning/10 border-warning/30' },
  error: { label: 'Error de sincronització', Icon: AlertTriangle, cls: 'text-destructive bg-destructive/10 border-destructive/30' },
};

export function StatusBadge({ status, compact, className }) {
  const m = META[status];
  return (
    <span title={m.label} className={cn('inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10.5px] font-medium leading-4 whitespace-nowrap', m.cls, className)}>
      <m.Icon className={cn('size-3', m.spin && 'animate-spin')} />
      {compact ? null : <span>{m.label}</span>}
    </span>
  );
}
export const STATUS_LABEL = Object.fromEntries(Object.entries(META).map(([k, v]) => [k, v.label]));
