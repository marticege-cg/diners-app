/**
 * Anivellament de reemborsaments. Quan compres algo per a algú i et fan un Bizum (o un altre ingrés) del que els has comprat,
 * l'ingrés es resta de la despesa corresponent: ni la despesa surt inflada ni l'ingrés compta com a ingrés.
 *  - L'ingrés pot ser l'import sencer o només una part de la despesa (diversos Bizums poden cobrir una mateixa despesa).
 *  - Es busca la despesa recent (fins a 7 dies abans; 14 si l'import coincideix exactament) amb prou import pendent de cobrar.
 *  - Es prefereix la que coincideix exactament; sinó la més propera en el temps.
 * No canvia l'estalvi del mes (el Bizum ja hi comptava): només el repartiment entre despesa i ingrés.
 */
const dayN = (iso) => Math.round(new Date(iso + 'T00:00:00Z').getTime() / 86400000);

export function markNetted(txs, catById, { enabled = true, minAmount = 1 } = {}) {
  if (!enabled) return txs;
  const cents = (t) => Math.round(Math.abs(t.amount) * 100);
  const expenses = [], refunds = [];
  txs.forEach((t, i) => {
    const c = catById.get(t.category_id);
    if (!c || cents(t) < minAmount * 100) return;
    if (t.amount < 0 && c.kind === 'expense') expenses.push(i);
    else if (t.amount > 0 && (c.kind === 'bizum' || c.code === 'ING_ALTRES')) refunds.push(i);
  });
  const cap = new Map(expenses.map((i) => [i, cents(txs[i])]));
  const got = new Map();      // despesa -> cèntims ja cobrats
  const withs = new Map();    // despesa -> conceptes
  const out = txs.slice();
  refunds.sort((a, b) => (txs[a].tx_date < txs[b].tx_date ? -1 : 1));
  for (const r of refunds) {
    const x = cents(txs[r]);
    let best = null, bestScore = Infinity;
    for (const e of expenses) {
      if (cap.get(e) < x) continue;
      const d = dayN(txs[r].tx_date) - dayN(txs[e].tx_date);
      const exact = cents(txs[e]) === x && cap.get(e) === x;
      if (d < -1 || d > (exact ? 14 : 7)) continue;
      const score = (exact ? 0 : 100) + Math.abs(d);
      if (score < bestScore) { best = e; bestScore = score; }
    }
    if (best == null) continue;
    cap.set(best, cap.get(best) - x);
    got.set(best, (got.get(best) || 0) + x);
    withs.set(best, [...(withs.get(best) || []), txs[r].concept]);
    out[r] = { ...txs[r], _net: true, _netWith: txs[best].concept };
  }
  for (const [e, g] of got) {
    const left = cents(txs[e]) - g;
    out[e] = { ...txs[e], _eff: -left / 100, _netGot: g / 100, _netWith: withs.get(e).join(', '), ...(left === 0 ? { _net: true } : {}) };
  }
  return out;
}
