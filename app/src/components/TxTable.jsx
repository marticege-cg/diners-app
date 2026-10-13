import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Filter, RotateCw, Search, Trash2, Undo2, X, Check, EyeOff } from 'lucide-react';
import { Button } from './ui/button';
import { Input, NativeSelect } from './ui/input';
import { Card, CardHeader, CardTitle } from './ui/card';
import { CatBadge } from './ui/badge';
import { StatusBadge, statusOf } from './StatusBadge';
import { cn, eur, fmtDate, catColor, monthOf, monthLabel } from '../lib/utils';
import { parseAmount } from '../lib/csv';

const EMPTY = { q: '', cat: '', type: '', status: '', from: '', to: '', min: '', max: '', period: 'month', hideTransfers: true };

function EditableText({ value, onCommit, className, align, mono, disabled, type = 'text', display }) {
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(value);
  const commit = () => { setEdit(false); if (String(v) !== String(value)) onCommit(v); };
  if (edit && !disabled)
    return (
      <input autoFocus onFocus={(e) => e.target.select()} type={type} value={v} onChange={(e) => setV(e.target.value)} onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEdit(false); }}
        className={cn('h-6 w-full min-w-0 rounded border border-ring bg-background px-1.5 text-[12.5px] outline-none', align === 'right' && 'text-right', mono && 'num', className)} />
    );
  return (
    <button type="button" disabled={disabled} onClick={() => { setV(value); setEdit(true); }} title="Clic per editar"
      className={cn('block w-full truncate rounded px-1.5 py-0.5 text-[12.5px] hover:bg-muted/80 disabled:cursor-default disabled:hover:bg-transparent', align === 'right' ? 'text-right' : 'text-left', mono && 'num', className)}>
      {display ?? (value || <span className="text-muted-foreground">—</span>)}
    </button>
  );
}

export function TxTable({ txs, cats, catById, catByCode, accounts, accountId, month, pageSizeDefault = 25, title = 'Moviments', onUpdate, onRemove, onRetry, onDiscard, maxHeight }) {
  const [f, setF] = useState(EMPTY);
  const [showAdv, setShowAdv] = useState(false);
  const [sort, setSort] = useState({ key: 'tx_date', dir: 'desc' });
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(pageSizeDefault);
  const accName = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);
  const set = (k, v) => { setF((s) => ({ ...s, [k]: v })); setPage(0); };

  const rows = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    const min = f.min !== '' ? Number(f.min) : null, max = f.max !== '' ? Number(f.max) : null;
    let r = txs.filter((t) => {
      if (accountId !== 'all' && t.account_id !== accountId) return false;
      const c = catById.get(t.category_id);
      if (f.hideTransfers && c?.code === 'TRANSFER' && !f.cat) return false;
      if (f.period === 'month' && !f.from && !f.to && monthOf(t.tx_date) !== month) return false;
      if (f.from && t.tx_date < f.from) return false;
      if (f.to && t.tx_date > f.to) return false;
      if (f.cat && c?.code !== f.cat) return false;
      if (f.type === 'in' && !(t.amount > 0)) return false;
      if (f.type === 'out' && !(t.amount < 0)) return false;
      if (f.status && statusOf(t) !== f.status) return false;
      if (min != null && Math.abs(t.amount) < min) return false;
      if (max != null && Math.abs(t.amount) > max) return false;
      if (q && !(t.concept.toLowerCase().includes(q) || (c?.name || '').toLowerCase().includes(q))) return false;
      return true;
    });
    const dir = sort.dir === 'asc' ? 1 : -1;
    r = r.slice().sort((a, b) => {
      // les files amb error o desant sempre amunt perquè es vegin
      const pa = a._sync ? 1 : 0, pb = b._sync ? 1 : 0;
      if (pa !== pb) return pb - pa;
      let x = a[sort.key], y = b[sort.key];
      if (sort.key === 'concept') { x = x.toLowerCase(); y = y.toLowerCase(); }
      if (x < y) return -1 * dir;
      if (x > y) return 1 * dir;
      return 0;
    });
    return r;
  }, [txs, f, sort, accountId, month, catById]);

  const pages = Math.max(1, Math.ceil(rows.length / size));
  const pg = Math.min(page, pages - 1);
  const view = rows.slice(pg * size, pg * size + size);
  const total = rows.reduce((s, t) => s + t.amount, 0);
  const activeFilters = ['q', 'cat', 'type', 'status', 'from', 'to', 'min', 'max'].filter((k) => f[k] !== '').length + (f.period === 'all' ? 1 : 0);
  const errs = txs.filter((t) => t._sync === 'error').length;

  const th = (key, label, cls) => (
    <th className={cn('px-2 py-1.5 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground', cls)}>
      <button className="inline-flex items-center gap-0.5 hover:text-foreground" onClick={() => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'concept' ? 'asc' : 'desc' }))}>
        {label}{sort.key === key && (sort.dir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
      </button>
    </th>
  );

  const commitAmount = (t, raw) => {
    const n = parseAmount(raw, /,/.test(raw) ? 'eu' : /^-?\d{1,3}(\.\d{3})+$/.test(raw.trim()) ? 'eu' : 'us');
    if (n == null) return;
    // si l'usuari escriu sense signe en una despesa, manté el signe original
    const keep = !/^\s*[-+(]/.test(raw) && t.amount < 0 ? -Math.abs(n) : n;
    onUpdate(t.id, { amount: keep });
  };
  const changeCat = (t, code) => {
    const c = catByCode.get(code);
    if (c) onUpdate(t.id, { category_id: c.id, status: 'saved' });
  };

  return (
    <Card className="flex min-w-0 flex-col">
      <CardHeader className="flex-wrap">
        <div className="flex items-baseline gap-2">
          <CardTitle>{title}</CardTitle>
          <span className="num text-[11px] text-muted-foreground">{rows.length} · net <span className={total < 0 ? 'text-destructive' : 'text-success'}>{eur(total)}</span></span>
        </div>
        <div className="flex flex-1 items-center justify-end gap-1.5">
          {errs > 0 && <span className="inline-flex items-center gap-1 text-[11px] font-medium text-destructive"><RotateCw className="size-3" />{errs} sense sincronitzar</span>}
          <div className="relative w-full max-w-[210px]">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={f.q} onChange={(e) => set('q', e.target.value)} placeholder="Cerca concepte…" className="h-8 pl-7 text-xs" aria-label="Cerca" />
          </div>
          <Button variant={showAdv || activeFilters ? 'secondary' : 'outline'} size="sm" onClick={() => setShowAdv((v) => !v)}>
            <Filter />Filtres{activeFilters ? <span className="ml-0.5 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{activeFilters}</span> : null}
          </Button>
        </div>
      </CardHeader>

      {showAdv && (
        <div className="mx-4 mb-2 grid grid-cols-2 gap-2 rounded-md border bg-muted/30 p-2.5 sm:grid-cols-4">
          <NativeSelect className="h-8 text-xs" value={f.period} onChange={(e) => set('period', e.target.value)} aria-label="Període">
            <option value="month">{monthLabel(month)}</option><option value="all">Tot l'historial</option>
          </NativeSelect>
          <NativeSelect className="h-8 text-xs" value={f.cat} onChange={(e) => set('cat', e.target.value)} aria-label="Categoria">
            <option value="">Totes les categories</option>
            {cats.map((c) => <option key={c.code} value={c.code}>{c.emoji} {c.name}</option>)}
          </NativeSelect>
          <NativeSelect className="h-8 text-xs" value={f.type} onChange={(e) => set('type', e.target.value)} aria-label="Tipus">
            <option value="">Ingressos i despeses</option><option value="in">Només ingressos</option><option value="out">Només despeses</option>
          </NativeSelect>
          <NativeSelect className="h-8 text-xs" value={f.status} onChange={(e) => set('status', e.target.value)} aria-label="Estat">
            <option value="">Tots els estats</option><option value="saved">Desat</option><option value="pending_ai">Pendent de revisar per IA</option><option value="error">Error de sincronització</option>
          </NativeSelect>
          <Input type="date" className="h-8 text-xs" value={f.from} onChange={(e) => set('from', e.target.value)} aria-label="Des de" title="Des de" />
          <Input type="date" className="h-8 text-xs" value={f.to} onChange={(e) => set('to', e.target.value)} aria-label="Fins a" title="Fins a" />
          <Input inputMode="decimal" className="num h-8 text-xs" placeholder="Import mín. €" value={f.min} onChange={(e) => set('min', e.target.value.replace(',', '.'))} aria-label="Import mínim" />
          <Input inputMode="decimal" className="num h-8 text-xs" placeholder="Import màx. €" value={f.max} onChange={(e) => set('max', e.target.value.replace(',', '.'))} aria-label="Import màxim" />
          <label className="col-span-2 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground sm:col-span-3">
            <input type="checkbox" checked={f.hideTransfers} onChange={(e) => set('hideTransfers', e.target.checked)} className="accent-[hsl(var(--primary))]" />
            <EyeOff className="size-3.5" />Amaga traspassos entre comptes propis
          </label>
          <Button variant="ghost" size="sm" className="col-span-2 sm:col-span-1" onClick={() => { setF(EMPTY); setPage(0); }}><X />Neteja</Button>
        </div>
      )}

      <div className="overflow-auto border-y max-md:hidden" style={maxHeight ? { maxHeight } : undefined}>
        <table className="w-full min-w-[560px] border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b">
              {th('tx_date', 'Data', 'w-[104px]')}
              {th('concept', 'Concepte')}
              <th className="px-2 py-1.5 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">Categoria</th>
              {th('amount', 'Import', 'text-right w-[104px]')}
              <th className="px-2 py-1.5 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">Estat</th>
              <th className="w-[56px]" />
            </tr>
          </thead>
          <tbody>
            {view.map((t) => {
              const c = catById.get(t.category_id);
              const st = statusOf(t);
              return (
                <tr key={t.id} className={cn('group border-b border-border/60 transition-colors hover:bg-muted/30', st === 'error' && 'bg-destructive/5', st === 'pending_ai' && 'bg-warning/[0.04]')}>
                  <td className="px-1 py-0.5"><EditableText type="date" value={t.tx_date} display={<span className="num text-muted-foreground">{fmtDate(t.tx_date)}</span>} onCommit={(v) => v && onUpdate(t.id, { tx_date: v })} disabled={st === 'saving'} /></td>
                  <td className="max-w-0 px-1 py-0.5">
                    <EditableText value={t.concept} onCommit={(v) => v.trim() && onUpdate(t.id, { concept: v.trim() })} disabled={st === 'saving'} />
                    {accountId === 'all' && <div className="truncate px-1.5 text-[10px] leading-3 text-muted-foreground">{accName.get(t.account_id)}</div>}
                  </td>
                  <td className="px-1 py-0.5">
                    <div className="relative inline-block">
                      <CatBadge code={c?.code} name={c?.name || '—'} emoji={c?.emoji} className="pointer-events-none" />
                      <select aria-label="Canvia categoria" value={c?.code || ''} onChange={(e) => changeCat(t, e.target.value)} disabled={st === 'saving'}
                        className="absolute inset-0 w-full cursor-pointer opacity-0">
                        {cats.map((x) => <option key={x.code} value={x.code}>{x.emoji} {x.name}</option>)}
                      </select>
                    </div>
                  </td>
                  <td className="px-1 py-0.5">
                    <EditableText mono align="right" value={String(t.amount).replace('.', ',')} display={<span style={{ color: t.amount > 0 ? 'hsl(var(--success))' : undefined }}>{eur(t.amount)}</span>} onCommit={(v) => commitAmount(t, v)} disabled={st === 'saving'} />
                  </td>
                  <td className="px-1 py-0.5">
                    <StatusBadge status={st} />
                  </td>
                  <td className="px-1 py-0.5">
                    <div className="flex justify-end gap-0.5">
                      {st === 'error' ? (
                        <>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => onRetry(t.id)} title="Reintenta" aria-label="Reintenta"><RotateCw className="size-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onDiscard(t.id)} title="Descarta el canvi" aria-label="Descarta"><Undo2 className="size-3.5" /></Button>
                        </>
                      ) : (
                        <>
                          {st === 'pending_ai' && <Button size="icon" variant="ghost" className="h-6 w-6 text-success" onClick={() => onUpdate(t.id, { status: 'saved' })} title="Marca com a revisat" aria-label="Marca com a revisat"><Check className="size-3.5" /></Button>}
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground opacity-60 hover:text-destructive group-hover:opacity-100" onClick={() => { if (confirm(`Esborrar «${t.concept}» (${eur(t.amount)})?`)) onRemove(t.id); }} title="Esborra" aria-label="Esborra"><Trash2 className="size-3.5" /></Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {view.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">Cap moviment amb aquests filtres.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border/60 border-y md:hidden">
        {view.map((t) => {
          const c = catById.get(t.category_id);
          const st = statusOf(t);
          return (
            <li key={t.id} className={cn('px-3 py-2', st === 'error' && 'bg-destructive/5', st === 'pending_ai' && 'bg-warning/[0.04]')}>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1"><EditableText value={t.concept} onCommit={(v) => v.trim() && onUpdate(t.id, { concept: v.trim() })} disabled={st === 'saving'} className="text-[13.5px] font-medium" /></div>
                <div className="w-[96px] shrink-0"><EditableText mono align="right" className="text-[13.5px] font-semibold" value={String(t.amount).replace('.', ',')} display={<span style={{ color: t.amount > 0 ? 'hsl(var(--success))' : undefined }}>{eur(t.amount)}</span>} onCommit={(v) => commitAmount(t, v)} disabled={st === 'saving'} /></div>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 px-1.5">
                <span className="num text-[11px] text-muted-foreground">{fmtDate(t.tx_date)}{accountId === 'all' ? ` · ${accName.get(t.account_id)}` : ''}</span>
                <div className="relative inline-block">
                  <CatBadge code={c?.code} name={c?.name || '—'} emoji={c?.emoji} className="pointer-events-none" />
                  <select aria-label="Canvia categoria" value={c?.code || ''} onChange={(e) => changeCat(t, e.target.value)} disabled={st === 'saving'} className="absolute inset-0 w-full cursor-pointer opacity-0">
                    {cats.map((x) => <option key={x.code} value={x.code}>{x.emoji} {x.name}</option>)}
                  </select>
                </div>
                <StatusBadge status={st} compact={st === 'saved'} />
                <span className="flex-1" />
                {st === 'error' ? (
                  <>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => onRetry(t.id)} aria-label="Reintenta"><RotateCw className="size-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onDiscard(t.id)} aria-label="Descarta"><Undo2 className="size-3.5" /></Button>
                  </>
                ) : (
                  <>
                    {st === 'pending_ai' && <Button size="icon" variant="ghost" className="h-6 w-6 text-success" onClick={() => onUpdate(t.id, { status: 'saved' })} aria-label="Marca com a revisat"><Check className="size-3.5" /></Button>}
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground" onClick={() => { if (confirm(`Esborrar «${t.concept}» (${eur(t.amount)})?`)) onRemove(t.id); }} aria-label="Esborra"><Trash2 className="size-3.5" /></Button>
                  </>
                )}
              </div>
            </li>
          );
        })}
        {view.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted-foreground">Cap moviment amb aquests filtres.</li>}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs text-muted-foreground">
        <span className="num">{rows.length ? `${pg * size + 1}–${Math.min(rows.length, pg * size + size)} de ${rows.length}` : '0'}</span>
        <div className="flex items-center gap-1.5">
          <NativeSelect className="h-7 w-[84px] text-xs" value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }} aria-label="Files per pàgina">
            {[25, 50, 100].map((n) => <option key={n} value={n}>{n} / pàg.</option>)}
          </NativeSelect>
          <Button variant="outline" size="icon" className="h-7 w-7" disabled={pg === 0} onClick={() => setPage(pg - 1)} aria-label="Pàgina anterior"><ChevronLeft /></Button>
          <span className="num min-w-[52px] text-center">{pg + 1} / {pages}</span>
          <Button variant="outline" size="icon" className="h-7 w-7" disabled={pg >= pages - 1} onClick={() => setPage(pg + 1)} aria-label="Pàgina següent"><ChevronRight /></Button>
        </div>
      </div>
    </Card>
  );
}
