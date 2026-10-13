import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { eur0 } from '../lib/utils';

export function SettingsView({ cats, goal, setSetting, setBudget, summaryBudgetTotal, onLogout }) {
  const [g, setG] = useState(String(goal));
  const [saved, setSaved] = useState(false);
  useEffect(() => setG(String(goal)), [goal]);
  const expense = cats.filter((c) => c.kind === 'expense');
  return (
    <div className="grid max-w-[960px] gap-4 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Objectiu d'estalvi mensual</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input inputMode="numeric" value={g} onChange={(e) => { setG(e.target.value.replace(/[^\d]/g, '')); setSaved(false); }} className="num" aria-label="Objectiu" />
            <Button onClick={async () => { const n = Number(g); if (n >= 0) { await setSetting('goal_monthly_savings', n); setSaved(true); } }}>{saved ? <Check /> : null}Desa</Button>
          </div>
          <p className="text-xs text-muted-foreground">Es mostra a la targeta d'estalvi i a les insights.</p>
          <div className="border-t pt-3"><Button variant="outline" onClick={onLogout}>Tanca la sessió</Button></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Pressupost mensual per categoria</CardTitle><span className="num text-[11px] text-muted-foreground">Total {eur0(summaryBudgetTotal)}</span></CardHeader>
        <CardContent className="space-y-1">
          {expense.map((c) => <BudgetRow key={c.id} c={c} onSave={(v) => setBudget(c.id, v)} />)}
        </CardContent>
      </Card>
    </div>
  );
}

function BudgetRow({ c, onSave }) {
  const [v, setV] = useState(String(c.monthly_budget || 0));
  useEffect(() => setV(String(c.monthly_budget || 0)), [c.monthly_budget]);
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-6 text-center">{c.emoji}</span><span className="flex-1">{c.name}</span>
      <Input inputMode="numeric" className="num h-8 w-24 text-right" value={v} onChange={(e) => setV(e.target.value.replace(/[^\d]/g, ''))}
        onBlur={() => { const n = Number(v) || 0; if (n !== (c.monthly_budget || 0)) onSave(n); }} aria-label={`Pressupost ${c.name}`} />
      <span className="text-xs text-muted-foreground">€</span>
    </div>
  );
}
