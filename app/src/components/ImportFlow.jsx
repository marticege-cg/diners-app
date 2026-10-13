import { useCallback, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Sparkles, UploadCloud } from 'lucide-react';
import { Button } from './ui/button';
import { Input, NativeSelect, Label } from './ui/input';
import { Card } from './ui/card';
import { Dialog, DialogContent } from './ui/dialog';
import { CatBadge } from './ui/badge';
import { cn, eur, fmtDate } from '../lib/utils';
import { decodeBuffer, parseCsv, guessMapping, guessDateFormat, parseDate, guessNumberFormat, parseAmount } from '../lib/csv';
import { categorize, normConcept } from '../lib/categorize';

export function Dropzone({ onFile, compact }) {
  const [over, setOver] = useState(false);
  const [err, setErr] = useState('');
  const input = useRef(null);
  const handle = useCallback(async (file) => {
    setErr('');
    if (!file) return;
    if (!/\.(csv|txt)$/i.test(file.name) && !/csv|text/.test(file.type)) { setErr('Només s\'accepten fitxers .csv'); return; }
    try { onFile(file.name, await file.arrayBuffer()); } catch { setErr('No s\'ha pogut llegir el fitxer.'); }
  }, [onFile]);
  return (
    <Card
      className={cn('border-dashed transition-colors', over && 'border-primary bg-primary/5')}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files?.[0]); }}>
      <button type="button" onClick={() => input.current?.click()} className={cn('flex w-full items-center gap-3 px-4 text-left', compact ? 'py-3' : 'py-6')} aria-label="Puja un extracte CSV">
        <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg bg-muted', over && 'bg-primary/20 text-primary')}><UploadCloud className="size-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">Arrossega aquí l'extracte <span className="font-mono text-primary">.csv</span> del banc</span>
          <span className="block text-xs text-muted-foreground">o fes clic per triar-lo · et deixaré revisar les columnes abans de desar res</span>
          {err && <span className="mt-1 block text-xs text-destructive">{err}</span>}
        </span>
      </button>
      <input ref={input} type="file" accept=".csv,text/csv,text/plain" hidden onChange={(e) => { handle(e.target.files?.[0]); e.target.value = ''; }} />
    </Card>
  );
}

const sigOf = (headers) => headers.join('|').toLowerCase();
const loadMap = (sig) => { try { return JSON.parse(localStorage.getItem('diners-map:' + sig) || 'null'); } catch { return null; } };
const saveMap = (sig, m) => { try { localStorage.setItem('diners-map:' + sig, JSON.stringify(m)); } catch { /* ignore */ } };

export function MappingModal({ file, onClose, store, accountId }) {
  const { cats, catByCode, catById, accounts, txs, importRows } = store;
  const parsed = useMemo(() => parseCsv(decodeBuffer(file.buffer)), [file]);
  const { headers, rows, meta } = parsed;
  const sig = sigOf(headers);

  const init = useMemo(() => {
    const g = guessMapping(headers, rows);
    const saved = loadMap(sig);
    const m = saved && saved.date < headers.length ? { ...g, ...saved.map } : g;
    const dateFmt = saved?.dateFmt || guessDateFormat(rows.map((r) => r[m.date]));
    const numFmt = saved?.numFmt || guessNumberFormat(rows.map((r) => r[m.amount >= 0 ? m.amount : m.debit >= 0 ? m.debit : m.credit]));
    const hay = (meta + ' ' + file.name).toLowerCase();
    const guessAcc = accounts.find((a) => hay.includes(a.name.toLowerCase())) || accounts.find((a) => a.name.toLowerCase().split(' ').some((w) => w.length > 3 && w !== 'compte' && hay.includes(w)));
    return { m, dateFmt, numFmt, acc: guessAcc?.id ?? (accountId !== 'all' ? accountId : 2) };
  }, []); // eslint-disable-line

  const [map, setMap] = useState(init.m);
  const [dateFmt, setDateFmt] = useState(init.dateFmt);
  const [numFmt, setNumFmt] = useState(init.numFmt);
  const [acc, setAcc] = useState(init.acc);
  const [invert, setInvert] = useState(false);
  const [skipDup, setSkipDup] = useState(true);
  const [over, setOver] = useState({}); // index -> codi categoria
  const [phase, setPhase] = useState('map'); // map | saving | done
  const [prog, setProg] = useState([0, 0]);
  const [result, setResult] = useState(null);

  const learned = useMemo(() => store.learned, [store.learned]);
  const existing = useMemo(() => {
    const m = new Map();
    for (const t of txs) if (t.account_id === Number(acc)) { const k = `${t.tx_date}|${normConcept(t.concept)}|${Math.round(t.amount * 100)}`; m.set(k, (m.get(k) || 0) + 1); }
    return m;
  }, [txs, acc]);

  const processed = useMemo(() => {
    const seen = new Map();
    const out = [];
    let invalid = 0;
    rows.forEach((r, i) => {
      const date = map.date >= 0 ? parseDate(r[map.date], dateFmt) : null;
      let amount = null;
      if (map.amount >= 0) amount = parseAmount(r[map.amount], numFmt);
      else {
        const d = map.debit >= 0 ? parseAmount(r[map.debit], numFmt) : null, c = map.credit >= 0 ? parseAmount(r[map.credit], numFmt) : null;
        if (d != null || c != null) amount = (c ? Math.abs(c) : 0) - (d ? Math.abs(d) : 0);
      }
      const concept = (map.concept >= 0 ? r[map.concept] || '' : '').replace(/\s+/g, ' ').trim();
      if (!date || amount == null || !concept) { invalid++; return; }
      if (invert) amount = -amount;
      const key = `${date}|${normConcept(concept)}|${Math.round(amount * 100)}`;
      const n = (seen.get(key) || 0) + 1; seen.set(key, n);
      const dup = n <= (existing.get(key) || 0);
      const cz = categorize(concept, amount, learned);
      out.push({ i, date, concept, amount, code: cz.code, certain: cz.certain, dup });
    });
    return { rows: out, invalid };
  }, [rows, map, dateFmt, numFmt, invert, existing, learned]);

  const final = processed.rows.map((r) => ({ ...r, code: over[r.i] || r.code, certain: r.certain || !!over[r.i] }));
  const toImport = final.filter((r) => !(skipDup && r.dup));
  const dups = final.filter((r) => r.dup).length;
  const pending = toImport.filter((r) => !r.certain).length;
  const sum = toImport.reduce((s, r) => s + r.amount, 0);
  const dates = toImport.map((r) => r.date).sort();
  const colOptions = [<option key="-1" value={-1}>— No usar —</option>, ...headers.map((h, i) => <option key={i} value={i}>{h}</option>)];
  const mapOk = map.date >= 0 && map.concept >= 0 && (map.amount >= 0 || map.debit >= 0 || map.credit >= 0);
  const setCol = (k) => (e) => setMap((m) => ({ ...m, [k]: Number(e.target.value), ...(k === 'amount' && Number(e.target.value) >= 0 ? { debit: -1, credit: -1 } : {}) }));

  async function run() {
    setPhase('saving');
    saveMap(sig, { map, dateFmt, numFmt });
    const payload = toImport.map((r) => ({
      tx_date: r.date, concept: r.concept, amount: r.amount, account_id: Number(acc),
      category_id: catByCode.get(r.code)?.id ?? catByCode.get('OCI').id, status: r.certain ? 'saved' : 'pending_ai',
    }));
    const res = await importRows(payload, (d, t) => setProg([d, t]));
    setResult(res); setPhase('done');
  }

  const stat = (label, value, tone) => (
    <div className="rounded-md border bg-muted/30 px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn('num text-sm font-semibold', tone, label === 'Net' && 'money')}>{value}</div>
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => { if (!o && phase !== 'saving') onClose(); }}>
      <DialogContent className="max-w-[920px]" title={`Importa ${file.name}`}
        description={phase === 'map' ? 'Revisa com es llegeixen les columnes. No es desa res fins que premis «Importa».' : undefined}>
        {phase === 'done' ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            {result.failed ? <AlertTriangle className="size-10 text-warning" /> : <CheckCircle2 className="size-10 text-success" />}
            <div className="text-lg font-semibold">{result.inserted} moviments importats</div>
            {result.failed > 0 && <p className="max-w-md text-sm text-destructive">{result.failed} no s'han pogut sincronitzar. Els veuràs a la taula amb «Error de sincronització» i els pots reintentar.</p>}
            {pending > 0 && <p className="max-w-md text-sm text-muted-foreground"><Sparkles className="mr-1 inline size-3.5 text-warning" />{pending} han quedat «Pendents de revisar per IA». Demana a Claude que els categoritzi.</p>}
            <Button onClick={onClose}>Tanca</Button>
          </div>
        ) : phase === 'saving' ? (
          <div className="flex flex-col items-center gap-4 px-6 py-14">
            <Loader2 className="size-8 animate-spin text-primary" />
            <div className="text-sm">Desant a Supabase… {prog[0]} / {prog[1] || toImport.length}</div>
            <div className="h-1.5 w-64 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${(prog[0] / Math.max(1, prog[1] || toImport.length)) * 100}%` }} /></div>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1"><Label>Compte destí</Label>
                  <NativeSelect value={acc} onChange={(e) => setAcc(Number(e.target.value))}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</NativeSelect></div>
                <div className="space-y-1"><Label>Data ←</Label><NativeSelect value={map.date} onChange={setCol('date')}>{colOptions}</NativeSelect></div>
                <div className="space-y-1"><Label>Concepte ←</Label><NativeSelect value={map.concept} onChange={setCol('concept')}>{colOptions}</NativeSelect></div>
                <div className="space-y-1"><Label>Import ←</Label><NativeSelect value={map.amount} onChange={setCol('amount')}>{colOptions}</NativeSelect></div>
                {map.amount < 0 && (<>
                  <div className="space-y-1"><Label>Càrrec / Dèbit ←</Label><NativeSelect value={map.debit} onChange={setCol('debit')}>{colOptions}</NativeSelect></div>
                  <div className="space-y-1"><Label>Abonament / Crèdit ←</Label><NativeSelect value={map.credit} onChange={setCol('credit')}>{colOptions}</NativeSelect></div>
                </>)}
                <div className="space-y-1"><Label>Format de data</Label>
                  <NativeSelect value={dateFmt} onChange={(e) => setDateFmt(e.target.value)}><option value="dmy">dd/mm/aaaa</option><option value="mdy">mm/dd/aaaa</option><option value="ymd">aaaa-mm-dd</option></NativeSelect></div>
                <div className="space-y-1"><Label>Format d'import</Label>
                  <NativeSelect value={numFmt} onChange={(e) => setNumFmt(e.target.value)}><option value="eu">1.234,56 (europeu)</option><option value="us">1,234.56 (anglosaxó)</option></NativeSelect></div>
                <div className="flex items-end gap-4 pb-2 text-xs">
                  <label className="flex cursor-pointer items-center gap-1.5"><input type="checkbox" checked={invert} onChange={(e) => setInvert(e.target.checked)} className="accent-[hsl(var(--primary))]" />Inverteix signe</label>
                  <label className="flex cursor-pointer items-center gap-1.5"><input type="checkbox" checked={skipDup} onChange={(e) => setSkipDup(e.target.checked)} className="accent-[hsl(var(--primary))]" />Omet duplicats</label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {stat('A importar', toImport.length)}
                {stat('Duplicats', dups, dups ? 'text-muted-foreground' : '')}
                {stat('Pendents d\'IA', pending, pending ? 'text-warning' : '')}
                {stat('Filtrades', processed.invalid, processed.invalid ? 'text-destructive' : '')}
                {stat('Net', eur(sum), sum < 0 ? 'text-destructive' : 'text-success')}
              </div>
              {dates.length > 0 && <p className="num text-[11px] text-muted-foreground">Del {fmtDate(dates[0])} al {fmtDate(dates[dates.length - 1])}. Pots canviar la categoria de qualsevol fila abans d'importar.</p>}
              {!mapOk && <p className="flex items-center gap-1.5 text-xs text-destructive"><AlertTriangle className="size-3.5" />Cal indicar com a mínim data, concepte i import.</p>}

              <div className="overflow-hidden rounded-md border">
                <div className="max-h-[300px] overflow-auto">
                  <table className="w-full border-collapse text-left text-[12.5px]">
                    <thead className="sticky top-0 bg-card"><tr className="border-b text-[10.5px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-2 py-1.5">Data</th><th className="px-2 py-1.5">Concepte</th><th className="px-2 py-1.5">Categoria</th><th className="px-2 py-1.5 text-right">Import</th><th className="px-2 py-1.5" /></tr></thead>
                    <tbody>
                      {final.slice(0, 80).map((r) => {
                        const c = catByCode.get(r.code);
                        return (
                          <tr key={r.i} className={cn('border-b border-border/60', r.dup && skipDup && 'opacity-40')}>
                            <td className="num px-2 py-1 text-muted-foreground">{fmtDate(r.date)}</td>
                            <td className="max-w-[260px] truncate px-2 py-1">{r.concept}</td>
                            <td className="px-2 py-1">
                              <div className="relative inline-block">
                                <CatBadge code={r.code} name={c?.name} emoji={c?.emoji} className="pointer-events-none" />
                                <select aria-label="Categoria" className="absolute inset-0 w-full cursor-pointer opacity-0" value={r.code} onChange={(e) => setOver((o) => ({ ...o, [r.i]: e.target.value }))}>
                                  {cats.map((x) => <option key={x.code} value={x.code}>{x.emoji} {x.name}</option>)}
                                </select>
                              </div>
                            </td>
                            <td className={cn('money num px-2 py-1 text-right', r.amount > 0 && 'text-success')}>{eur(r.amount)}</td>
                            <td className="px-2 py-1 text-right text-[10.5px]">{r.dup ? <span className="text-muted-foreground">duplicat</span> : !r.certain ? <span className="text-warning">IA</span> : null}</td>
                          </tr>
                        );
                      })}
                      {final.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">Cap fila vàlida amb aquest mapeig.</td></tr>}
                    </tbody>
                  </table>
                </div>
                {final.length > 80 && <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">Mostrant les 80 primeres de {final.length} files.</div>}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><FileSpreadsheet className="size-3.5" />{rows.length} files al fitxer</span>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={onClose}>Cancel·la</Button>
                <Button onClick={run} disabled={!mapOk || toImport.length === 0}>Importa {toImport.length} moviments</Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
