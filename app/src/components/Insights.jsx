import { AlertTriangle, CheckCircle2, Info, Sparkles, X, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { cn } from '../lib/utils';

const TONE = {
  alert: { Icon: AlertTriangle, cls: 'border-destructive/30 bg-destructive/5', ic: 'text-destructive' },
  warn: { Icon: TrendingUp, cls: 'border-warning/30 bg-warning/5', ic: 'text-warning' },
  good: { Icon: CheckCircle2, cls: 'border-success/30 bg-success/5', ic: 'text-success' },
  ai: { Icon: Sparkles, cls: 'border-primary/30 bg-primary/5', ic: 'text-primary' },
  info: { Icon: Info, cls: 'border-border bg-muted/30', ic: 'text-muted-foreground' },
};
const toneOf = (kind = '') => {
  const k = kind.toLowerCase();
  if (/alert|risk|danger|error/.test(k)) return TONE.alert;
  if (/warn|avis|atenci/.test(k)) return TONE.warn;
  if (/good|ok|win|success|goal/.test(k)) return TONE.good;
  if (/ai|tip|recom|consell/.test(k)) return TONE.ai;
  return TONE[kind] || TONE.info;
};

export function InsightsCard({ remote, auto, onDismiss }) {
  const all = [...remote.map((r) => ({ ...r, remote: true })), ...auto];
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5"><Sparkles className="size-3.5 text-primary" />Claude Financial Insights</CardTitle>
        <span className="text-[10.5px] text-muted-foreground">{remote.length ? `${remote.length} de Claude` : 'automàtic'}</span>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {all.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">Tot en ordre. Cap alerta.</p>}
        {all.map((n, i) => {
          const t = toneOf(n.kind);
          return (
            <div key={n.id || i} className={cn('flex gap-2 rounded-md border p-2.5', t.cls)}>
              <t.Icon className={cn('mt-0.5 size-3.5 shrink-0', t.ic)} />
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-medium leading-snug">{n.title}{n.remote && <span className="ml-1.5 rounded bg-primary/15 px-1 text-[9.5px] font-semibold uppercase text-primary">Claude</span>}</div>
                {n.body && <div className="mt-0.5 whitespace-pre-line text-[11.5px] leading-snug text-muted-foreground">{n.body}</div>}
              </div>
              {n.remote && <button className="h-5 shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted" onClick={() => onDismiss(n.id)} aria-label="Descarta"><X className="size-3.5" /></button>}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
