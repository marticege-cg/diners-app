import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownRight, ArrowUpRight, KeyRound, Loader2, PencilLine, RefreshCw, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input, Label } from './ui/input';
import { Badge } from './ui/badge';
import { cn, eur, fmtDate, signed } from '../lib/utils';
import { parseAmount } from '../lib/csv';

const ago = (iso) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return 'ara mateix';
  if (m < 60) return `fa ${m} min`;
  if (m < 1440) return `fa ${Math.round(m / 60)} h`;
  return `fa ${Math.round(m / 1440)} d`;
};
const pctOf = (pl, base) => (base ? (pl / base) * 100 : 0);
const tone = (v) => (v > 0 ? 'text-success' : v < 0 ? 'text-destructive' : 'text-muted-foreground');
const tip = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, color: 'hsl(var(--foreground))' };

function SourceBadge({ snap, status }) {
  if (!snap) return null;
  const live = snap.source === 'trading212';
  return (
    <Badge className={cn(live ? 'border-success/30 bg-success/10 text-success' : 'border-border bg-muted text-muted-foreground')}>
      <span className={cn('size-1.5 rounded-full', live ? 'bg-success' : 'bg-muted-foreground', live && status !== 'error' && 'animate-pulse')} />
      {live ? 'Trading 212' : 'Manual'} · {ago(snap.taken_at)}
    </Badge>
  );
}

function Setup() {
  const step = (n, t) => <li className="flex gap-2"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">{n}</span><span>{t}</span></li>;
  return (
    <div className="rounded-md border bg-muted/30 p-3 text-[12.5px] leading-snug">
      <div className="mb-2 flex items-center gap-1.5 font-medium"><KeyRound className="size-3.5 text-primary" />Connecta Trading 212 (un sol cop)</div>
      <ol className="space-y-1.5 text-muted-foreground">
        {step(1, <>A l'app de Trading 212: <b className="text-foreground">Configuració → API (Beta)</b> → genera una clau amb permisos <b className="text-foreground">només de lectura</b> (dades del compte i cartera).</>)}
        {step(2, <>A Supabase (projecte <span className="font-mono text-foreground">diners-finances</span>): <b className="text-foreground">Edge Functions → Secrets</b> → afegeix <span className="font-mono text-foreground">T212_API_KEY</span> i <span className="font-mono text-foreground">T212_API_SECRET</span>.</>)}
        {step(3, <>Torna aquí i prem <b className="text-foreground">Actualitza</b>. La clau mai passa per l'app ni pel xat.</>)}
      </ol>
    </div>
  );
}

function ManualForm({ latest, onSave }) {
  const [open, setOpen] = useState(false);
  const [inv, setInv] = useState(latest ? String(latest.invested).replace('.', ',') : '');
  const [val, setVal] = useState(latest ? String(latest.total_value).replace('.', ',') : '');
  const [busy, setBusy] = useState(false);
  const a = parseAmount(inv, 'eu'), b = parseAmount(val, 'eu');
  if (!open) return <Button variant="ghost" size="sm" onClick={() => setOpen(true)}><PencilLine />Introdueix-ho a mà</Button>;
  return (
    <form className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_1fr_auto]" onSubmit={async (e) => { e.preventDefault(); setBusy(true); const ok = await onSave({ invested: a, value: b }); setBusy(false); if (ok) setOpen(false); }}>
      <div className="space-y-1"><Label>Total aportat €</Label><Input inputMode="decimal" className="num" value={inv} onChange={(e) => setInv(e.target.value)} /></div>
      <div className="space-y-1"><Label>Valor actual €</Label><Input inputMode="decimal" className="num" value={val} onChange={(e) => setVal(e.target.value)} /></div>
      <Button type="submit" className="col-span-2 sm:col-span-1" disabled={busy || a == null || b == null}>Desa</Button>
    </form>
  );
}

function PL({ pl, base, big }) {
  const up = pl >= 0;
  return (
    <span className={cn('num inline-flex items-center gap-1 font-semibold', tone(pl), big ? 'text-lg' : 'text-sm')}>
      {up ? <ArrowUpRight className={big ? 'size-5' : 'size-4'} /> : <ArrowDownRight className={big ? 'size-5' : 'size-4'} />}
      {signed(pl)} <span className="font-medium opacity-80">({pctOf(pl, base) >= 0 ? '+' : ''}{pctOf(pl, base).toFixed(2).replace('.', ',')}%)</span>
    </span>
  );
}

export function InvestmentsMini({ inv, onOpen, onRefresh }) {
  const s = inv.latest;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5"><TrendingUp className="size-3.5 text-primary" />Inversions</CardTitle>
        <div className="flex items-center gap-1">
          <SourceBadge snap={s} status={inv.status} />
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRefresh(true)} aria-label="Actualitza inversions"><RefreshCw className={cn('size-3.5', inv.status === 'loading' && 'animate-spin')} /></Button>
        </div>
      </CardHeader>
      <CardContent>
        {s ? (
          <button onClick={onOpen} className="block w-full text-left">
            <div className="num text-2xl font-semibold tracking-tight">{eur(s.total_value)}</div>
            <div className="mt-0.5 flex items-center gap-2"><PL pl={s.unrealized_pl} base={s.invested} /></div>
            <div className="num mt-1 text-[11px] text-muted-foreground">Aportat {eur(s.invested)} · {s.positions?.length || 0} posicions</div>
          </button>
        ) : inv.status === 'loading' ? <Loader2 className="mx-auto my-4 size-5 animate-spin text-muted-foreground" /> : (
          <button onClick={onOpen} className="w-full rounded-md border border-dashed py-4 text-xs text-muted-foreground hover:bg-muted/40">Connecta Trading 212 per veure si guanyes o perds →</button>
        )}
        {inv.msg && <p className="mt-2 text-[11px] text-destructive">{inv.msg}</p>}
      </CardContent>
    </Card>
  );
}

export function InvestmentsView({ inv, onRefresh, onManual }) {
  const s = inv.latest;
  const hist = useMemo(() => inv.history.map((h) => ({ t: new Date(h.taken_at).getTime(), Valor: Number(h.total_value), Aportat: Number(h.invested) })), [inv.history]);
  const positions = s?.positions || [];
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Valor de la cartera</CardTitle>
            <div className="flex items-center gap-1.5">
              <SourceBadge snap={s} status={inv.status} />
              <Button variant="outline" size="sm" onClick={() => onRefresh(true)} disabled={inv.status === 'loading'}><RefreshCw className={cn(inv.status === 'loading' && 'animate-spin')} />Actualitza</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {s ? (<>
              <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
                <div className="num text-4xl font-semibold tracking-tight">{eur(s.total_value)}</div>
                <PL pl={s.unrealized_pl} base={s.invested} big />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[['Aportat', eur(s.invested)], ['Valor inversions', eur(s.current_value)], ['Efectiu al broker', eur(s.cash)], ['Guany realitzat', s.realized_pl == null ? '—' : signed(s.realized_pl)]].map(([l, v]) => (
                  <div key={l} className="rounded-md border bg-muted/30 px-2.5 py-1.5"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</div><div className="num text-sm font-semibold">{v}</div></div>
                ))}
              </div>
            </>) : inv.status === 'loading' ? <Loader2 className="mx-auto my-6 size-6 animate-spin text-muted-foreground" /> : <p className="text-sm text-muted-foreground">Encara no hi ha dades d'inversió.</p>}
            {inv.msg && <p className="text-xs text-destructive" role="alert">{inv.msg}</p>}
            {(inv.status === 'not_configured' || !s) && <Setup />}
            <ManualForm latest={s} onSave={onManual} />
          </CardContent>
        </Card>

        {positions.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Posicions</CardTitle><span className="text-[11px] text-muted-foreground">{positions.length}</span></CardHeader>
            <div className="overflow-x-auto border-t">
              <table className="w-full min-w-[520px] border-collapse text-left text-[12.5px]">
                <thead><tr className="border-b text-[10.5px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-1.5">Valor</th><th className="px-2 py-1.5 text-right">Quant.</th><th className="px-2 py-1.5 text-right">Preu mig</th><th className="px-2 py-1.5 text-right">Preu</th><th className="px-2 py-1.5 text-right">Valor</th><th className="px-3 py-1.5 text-right">Guany/pèrdua</th></tr></thead>
                <tbody>
                  {positions.map((p) => (
                    <tr key={p.ticker + p.isin} className="border-b border-border/60 hover:bg-muted/30">
                      <td className="px-3 py-1.5"><div className="font-medium">{p.ticker}</div><div className="max-w-[180px] truncate text-[11px] text-muted-foreground">{p.name}</div></td>
                      <td className="num px-2 py-1.5 text-right">{Number(p.quantity).toLocaleString('ca-ES', { maximumFractionDigits: 4 })}</td>
                      <td className="num px-2 py-1.5 text-right text-muted-foreground">{Number(p.avg_price).toLocaleString('ca-ES', { maximumFractionDigits: 2 })}</td>
                      <td className="num px-2 py-1.5 text-right">{Number(p.price).toLocaleString('ca-ES', { maximumFractionDigits: 2 })}</td>
                      <td className="num px-2 py-1.5 text-right">{eur(p.value)}</td>
                      <td className={cn('num px-3 py-1.5 text-right font-medium', tone(p.pl))}>{signed(p.pl)}<div className="text-[11px] font-normal opacity-80">{p.pl_pct >= 0 ? '+' : ''}{String(p.pl_pct).replace('.', ',')}%</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      <div className="min-w-0 space-y-4">
        <Card>
          <CardHeader><CardTitle>Evolució</CardTitle></CardHeader>
          <CardContent>
            {hist.length < 2 ? <p className="py-8 text-center text-xs text-muted-foreground">El gràfic es va omplint cada cop que s'actualitza la cartera.</p> : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hist} margin={{ top: 6, right: 4, left: -14, bottom: 0 }}>
                    <defs><linearGradient id="gv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => fmtDate(new Date(v).toISOString().slice(0, 10))} />
                    <YAxis domain={['auto', 'auto']} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip contentStyle={tip} labelFormatter={(v) => new Date(v).toLocaleString('ca-ES')} formatter={(v) => eur(v)} />
                    <Area type="monotone" dataKey="Aportat" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 3" fill="none" strokeWidth={1.5} dot={false} />
                    <Area type="monotone" dataKey="Valor" stroke="hsl(var(--primary))" fill="url(#gv)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
