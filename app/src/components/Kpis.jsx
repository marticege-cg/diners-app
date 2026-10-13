import { ArrowDownRight, ArrowUpRight, PiggyBank } from 'lucide-react';
import { Card } from './ui/card';
import { cn, eur, signed } from '../lib/utils';

function Delta({ cur, prev, invert }) {
  if (!prev) return null;
  const d = cur - prev;
  const pct = (d / Math.abs(prev)) * 100;
  const good = invert ? d <= 0 : d >= 0;
  return (
    <span className={cn('num inline-flex items-center gap-0.5 text-[11px] font-medium', good ? 'text-success' : 'text-destructive')}>
      {d >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}{Math.abs(pct).toFixed(0)}% <span className="font-normal text-muted-foreground">vs mes ant.</span>
    </span>
  );
}

export function Kpis({ cur, prev, goal }) {
  const spent = -cur.expense;
  const pct = goal > 0 ? Math.max(0, Math.min(1, cur.saved / goal)) : 0;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card className="p-3.5">
        <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Ingressos <ArrowUpRight className="size-3.5 text-success" /></div>
        <div className="num mt-1.5 text-[26px] font-semibold leading-none tracking-tight">{eur(cur.income)}</div>
        <div className="mt-2"><Delta cur={cur.income} prev={prev.income} /></div>
      </Card>
      <Card className="p-3.5">
        <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Despeses <ArrowDownRight className="size-3.5 text-destructive" /></div>
        <div className="num mt-1.5 text-[26px] font-semibold leading-none tracking-tight">{eur(spent)}</div>
        <div className="mt-2 flex flex-wrap items-center gap-x-2"><Delta cur={spent} prev={-prev.expense} invert />
          {(cur.bizum !== 0 || cur.cash !== 0) && <span className="num text-[11px] text-muted-foreground">+ Bizum {signed(cur.bizum)} · Efectiu {signed(cur.cash)}</span>}</div>
      </Card>
      <Card className="p-3.5">
        <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Estalvi net <PiggyBank className="size-3.5 text-primary" /></div>
        <div className={cn('num mt-1.5 text-[26px] font-semibold leading-none tracking-tight', cur.saved < 0 && 'text-destructive')}>{eur(cur.saved)}</div>
        <div className="mt-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn('h-full rounded-full', pct >= 1 ? 'bg-success' : 'bg-primary')} style={{ width: `${pct * 100}%` }} /></div>
          <div className="num mt-1 flex justify-between text-[11px] text-muted-foreground">
            <span>{cur.rate != null ? `Taxa d'estalvi ${(cur.rate * 100).toFixed(0)}%` : 'Sense ingressos'}</span><span>Objectiu {eur(goal)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
