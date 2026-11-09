import { useEffect, useRef, useState } from 'react';
import { Banknote, Minus, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Money } from '../lib/privacy';
import { eur, todayISO } from '../lib/utils';

/** Comptador d'efectiu: − / + de 10 en 10. Els tocs seguits se sumen i es desen com un sol moviment. */
export function CashCounter({ account, balance, catByCode, onAdd }) {
  const [pending, setPending] = useState(0);
  const timer = useRef(null);
  const pendingRef = useRef(0);
  const cat = catByCode.get('EFECTIU');

  async function commit() {
    const delta = pendingRef.current;
    pendingRef.current = 0; setPending(0);
    if (!delta || !account || !cat) return;
    await onAdd({ tx_date: todayISO(), concept: delta < 0 ? 'Efectiu gastat' : 'Efectiu afegit', amount: delta, category_id: cat.id, account_id: account.id });
  }

  function bump(step) {
    pendingRef.current += step; setPending(pendingRef.current);
    clearTimeout(timer.current);
    timer.current = setTimeout(commit, 1400);
  }

  useEffect(() => () => { clearTimeout(timer.current); if (pendingRef.current) commit(); }, []); // eslint-disable-line

  if (!account) return null;
  const shown = balance + pending;
  return (
    <Card className="flex items-center gap-3 p-3">
      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Banknote className="size-5" /></div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">Efectiu</div>
        <div className="num text-xl font-semibold leading-tight"><Money>{eur(shown)}</Money></div>
        {pending !== 0 && <div className="text-[11px] text-muted-foreground">{pending > 0 ? '+' : '−'}{Math.abs(pending)} € · es desa en un moment…</div>}
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="icon" className="size-10 rounded-full" onClick={() => bump(-10)} aria-label="Resta 10 euros"><Minus className="size-5" /></Button>
        <Button type="button" variant="outline" size="icon" className="size-10 rounded-full" onClick={() => bump(10)} aria-label="Suma 10 euros"><Plus className="size-5" /></Button>
      </div>
    </Card>
  );
}
