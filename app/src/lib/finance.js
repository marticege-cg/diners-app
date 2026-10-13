import { round2, monthOf, shiftMonth, daysInMonth } from './utils';

/** Resum d'un mes (opcionalment filtrat per compte). */
export function summarize(txs, catById, month, accountId) {
  const r = { income: 0, expense: 0, bizum: 0, cash: 0, invest: 0, count: 0, byCat: new Map() };
  for (const t of txs) {
    if (monthOf(t.tx_date) !== month) continue;
    if (accountId && accountId !== 'all' && t.account_id !== accountId) continue;
    const c = catById.get(t.category_id);
    if (!c) continue;
    r.count++;
    switch (c.kind) {
      case 'income': r.income += t.amount; break;
      case 'expense': r.expense += t.amount; r.byCat.set(c.code, (r.byCat.get(c.code) || 0) + t.amount); break;
      case 'bizum': r.bizum += t.amount; break;
      case 'cash': r.cash += t.amount; break;
      case 'investment': r.invest += t.amount; break;
      default: break;
    }
  }
  r.income = round2(r.income); r.expense = round2(r.expense); r.bizum = round2(r.bizum); r.cash = round2(r.cash); r.invest = round2(r.invest);
  // Estalvi = ingressos + bizum net + efectiu net + despeses (inversió compta com a estalvi; traspassos fora)
  r.saved = round2(r.income + r.bizum + r.cash + r.expense);
  r.rate = r.income > 0 ? r.saved / r.income : null;
  return r;
}

export function lastMonths(month, n) {
  return Array.from({ length: n }, (_, i) => shiftMonth(month, i - (n - 1)));
}

export function balances(accounts, txs) {
  const m = new Map(accounts.map((a) => [a.id, a.opening_balance]));
  for (const t of txs) if (m.has(t.account_id)) m.set(t.account_id, m.get(t.account_id) + t.amount);
  return new Map([...m].map(([k, v]) => [k, round2(v)]));
}

/** Alertes automàtiques calculades al client (a més de les que escriu Claude a la BD). */
export function autoInsights({ txs, cats, catById, month, goal, accountId }) {
  const out = [];
  const cur = summarize(txs, catById, month, accountId);
  const dim = daysInMonth(month);
  const today = new Date();
  const isCurrent = month === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const day = isCurrent ? today.getDate() : dim;

  if (goal > 0) {
    const left = round2(goal - cur.saved);
    out.push(left <= 0
      ? { kind: 'good', title: 'Objectiu d\'estalvi assolit', body: `Portes ${cur.saved.toFixed(0)} € estalviats aquest mes (objectiu ${goal} €).` }
      : { kind: cur.saved < 0 ? 'alert' : 'info', title: `Et falten ${left.toFixed(0)} € per a l'objectiu`, body: `Estalvi del mes: ${cur.saved.toFixed(0)} € de ${goal} €. ${isCurrent ? `Queden ${dim - day} dies de mes.` : ''}` });
  }
  for (const c of cats) {
    if (c.kind !== 'expense' || !(c.monthly_budget > 0)) continue;
    const spent = -(cur.byCat.get(c.code) || 0);
    const pct = spent / c.monthly_budget;
    if (pct >= 1) out.push({ kind: 'alert', title: `${c.emoji || ''} ${c.name}: pressupost superat`, body: `${spent.toFixed(0)} € de ${c.monthly_budget} € (${Math.round(pct * 100)}%).` });
    else if (pct >= 0.8) out.push({ kind: 'warn', title: `${c.emoji || ''} ${c.name}: al ${Math.round(pct * 100)}% del pressupost`, body: `${spent.toFixed(0)} € de ${c.monthly_budget} €.` });
  }
  // Categories que s'han disparat respecte la mitjana de 3 mesos anteriors
  const prev = [1, 2, 3].map((i) => summarize(txs, catById, shiftMonth(month, -i), accountId));
  for (const c of cats) {
    if (c.kind !== 'expense') continue;
    const now = -(cur.byCat.get(c.code) || 0);
    const avg = prev.reduce((s, p) => s + -(p.byCat.get(c.code) || 0), 0) / 3;
    if (now > 60 && avg >= 25 && now > avg * 1.5) out.push({ kind: 'warn', title: `${c.emoji || ''} ${c.name} s'ha disparat`, body: `${now.toFixed(0)} € vs mitjana de ${avg.toFixed(0)} € els 3 mesos anteriors (+${Math.round((now / avg - 1) * 100)}%).` });
  }
  const pend = txs.filter((t) => t.status === 'pending_ai').length;
  if (pend) out.push({ kind: 'ai', title: `${pend} moviments pendents de revisar per IA`, body: 'Demana a Claude al projecte DINERS que els categoritzi (llegeix i escriu la base de dades via MCP).' });
  return out;
}
