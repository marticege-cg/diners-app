import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Input, NativeSelect } from './ui/input';
import { Card } from './ui/card';
import { cn, todayISO } from '../lib/utils';
import { categorize } from '../lib/categorize';
import { parseAmount } from '../lib/csv';

export function QuickAdd({ cats, accounts, account, learned, onAdd }) {
  const [kind, setKind] = useState('out');
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  const [date, setDate] = useState(todayISO());
  const [catCode, setCatCode] = useState('');
  const [catTouched, setCatTouched] = useState(false);
  const [acc, setAcc] = useState(account === 'all' ? 2 : account);
  const [flash, setFlash] = useState(false);
  const amountRef = useRef(null);

  useEffect(() => { if (account !== 'all') setAcc(account); }, [account]);

  const cz = useMemo(() => (concept.trim() ? categorize(concept, kind === 'out' ? -1 : 1, learned) : null), [concept, kind, learned]);
  const suggested = cz?.code || '';
  const effectiveCode = catTouched && catCode ? catCode : suggested || (kind === 'out' ? 'OCI' : 'ING_ALTRES');
  const options = cats.filter((c) => (kind === 'out' ? c.kind !== 'income' : c.kind !== 'expense'));
  const value = parseAmount(amount, 'eu');
  const valid = value != null && value !== 0;

  function submit(e) {
    e.preventDefault();
    if (!valid) { amountRef.current?.focus(); return; }
    const cat = cats.find((c) => c.code === effectiveCode) || cats.find((c) => c.code === 'OCI');
    const sign = kind === 'out' ? -1 : 1;
    onAdd({
      tx_date: date, concept: concept.trim() || cat.name, amount: sign * Math.abs(value),
      category_id: cat.id, account_id: Number(acc), source: 'manual',
      status: !catTouched && cz && !cz.certain ? 'pending_ai' : 'saved',
    });
    setAmount(''); setConcept(''); setCatTouched(false); setCatCode('');
    setFlash(true); setTimeout(() => setFlash(false), 900);
    amountRef.current?.focus();
  }

  return (
    <Card className={cn('p-2.5 transition-shadow', flash && 'ring-2 ring-success/60')}>
      <form onSubmit={submit} className="grid grid-cols-2 items-end gap-2 md:grid-cols-[auto_110px_1fr_150px_140px_130px_auto]">
        <div className="col-span-2 flex rounded-md border p-0.5 md:col-span-1" role="group" aria-label="Tipus">
          {[['out', 'Despesa'], ['in', 'Ingrés']].map(([k, l]) => (
            <button type="button" key={k} onClick={() => { setKind(k); setCatTouched(false); }} className={cn('h-7 flex-1 rounded px-3 text-xs font-medium transition-colors', kind === k ? (k === 'out' ? 'bg-destructive/20 text-destructive' : 'bg-success/20 text-success') : 'text-muted-foreground')}>{l}</button>
          ))}
        </div>
        <Input ref={amountRef} inputMode="decimal" placeholder="Import €" value={amount} onChange={(e) => setAmount(e.target.value)} className="num text-right" aria-label="Import" />
        <Input placeholder="Concepte (opcional)" value={concept} onChange={(e) => setConcept(e.target.value)} aria-label="Concepte" className="col-span-2 md:col-span-1" />
        <NativeSelect value={effectiveCode} onChange={(e) => { setCatCode(e.target.value); setCatTouched(true); }} aria-label="Categoria">
          {options.map((c) => <option key={c.code} value={c.code}>{c.emoji} {c.name}</option>)}
        </NativeSelect>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Data" />
        <NativeSelect value={acc} onChange={(e) => setAcc(e.target.value)} aria-label="Compte">
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </NativeSelect>
        <Button type="submit" className="col-span-2 md:col-span-1" disabled={!valid}><Plus />Afegeix</Button>
      </form>
    </Card>
  );
}
