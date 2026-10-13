import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { catColor, eur, eur0, monthShort } from '../lib/utils';
import { lastMonths, summarize } from '../lib/finance';

const tip = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, color: 'hsl(var(--foreground))' };

export function MonthlyBars({ txs, catById, month, accountId, goal }) {
  const data = useMemo(() => lastMonths(month, 6).map((m) => {
    const s = summarize(txs, catById, m, accountId);
    return { m, name: monthShort(m), Ingressos: s.income, Despeses: -s.expense, Estalvi: s.saved };
  }), [txs, catById, month, accountId]);
  return (
    <Card>
      <CardHeader><CardTitle>Ingressos vs despeses · 6 mesos</CardTitle></CardHeader>
      <CardContent>
        <div className="h-[190px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 0, left: -18, bottom: 0 }} barGap={2}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : v)} />
              <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }} contentStyle={tip} formatter={(v) => eur(v)} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Ingressos" fill="hsl(var(--success))" radius={[3, 3, 0, 0]} maxBarSize={22} />
              <Bar dataKey="Despeses" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="num mt-1 flex justify-between text-[11px] text-muted-foreground">
          {data.map((d) => <span key={d.m} className={d.Estalvi >= goal ? 'text-success' : d.Estalvi < 0 ? 'text-destructive' : ''} title={`Estalvi ${d.m}`}>{eur0(d.Estalvi)}</span>)}
        </div>
        <div className="text-center text-[10px] uppercase tracking-wider text-muted-foreground">estalvi net per mes</div>
      </CardContent>
    </Card>
  );
}

export function Breakdown({ cur, cats }) {
  const rows = useMemo(() => cats.filter((c) => c.kind === 'expense')
    .map((c) => ({ code: c.code, name: c.name, emoji: c.emoji, value: -(cur.byCat.get(c.code) || 0), budget: c.monthly_budget || 0 }))
    .filter((r) => r.value > 0).sort((a, b) => b.value - a.value), [cur, cats]);
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <Card>
      <CardHeader><CardTitle>Desglossament de despeses</CardTitle><span className="num text-[11px] text-muted-foreground">{eur0(total)}</span></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="py-6 text-center text-xs text-muted-foreground">Sense despeses aquest mes.</p> : (
          <div className="flex items-center gap-3">
            <div className="h-[128px] w-[128px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={rows} dataKey="value" nameKey="name" innerRadius={38} outerRadius={60} paddingAngle={2} stroke="none">
                    {rows.map((r) => <Cell key={r.code} fill={catColor(r.code)} />)}
                  </Pie>
                  <Tooltip contentStyle={tip} formatter={(v, n) => [eur(v), n]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="min-w-0 flex-1 space-y-1">
              {rows.slice(0, 6).map((r) => {
                const over = r.budget > 0 && r.value > r.budget;
                return (
                  <li key={r.code} className="flex items-center gap-1.5 text-[12px]">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: catColor(r.code) }} />
                    <span className="min-w-0 flex-1 truncate">{r.name}</span>
                    <span className={`num ${over ? 'font-semibold text-destructive' : ''}`}>{eur0(r.value)}</span>
                    <span className="num w-8 text-right text-[10.5px] text-muted-foreground">{Math.round((r.value / total) * 100)}%</span>
                  </li>
                );
              })}
              {rows.length > 6 && <li className="text-[11px] text-muted-foreground">+ {rows.length - 6} categories més</li>}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
