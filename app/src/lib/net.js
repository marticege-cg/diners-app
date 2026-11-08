/**
 * Anivellament de reemborsaments: una despesa (p. ex. −100 €) i un ingrés posterior del MATEIX import exacte
 * (Bizum rebut o altre ingrés) es compensen i no compten ni com a despesa ni com a ingrés.
 * Parella 1 a 1, ingrés entre 3 dies abans i `windowDays` dies després de la despesa. Mínim `minAmount` per evitar casualitats.
 */
const dayN = (iso) => Math.round(new Date(iso + 'T00:00:00Z').getTime() / 86400000);

export function markNetted(txs, catById, { enabled = true, windowDays = 14, minAmount = 10 } = {}) {
  if (!enabled) return txs;
  const cents = (t) => Math.round(Math.abs(t.amount) * 100);
  const expenses = [], refunds = [];
  txs.forEach((t, i) => {
    const c = catById.get(t.category_id);
    if (!c || cents(t) < minAmount * 100) return;
    if (t.amount < 0 && c.kind === 'expense') expenses.push(i);
    else if (t.amount > 0 && (c.kind === 'bizum' || c.code === 'ING_ALTRES')) refunds.push(i);
  });
  const byCents = new Map();
  for (const i of expenses) { const k = cents(txs[i]); (byCents.get(k) || byCents.set(k, []).get(k)).push(i); }
  const used = new Set(), out = txs.slice();
  refunds.sort((a, b) => (txs[a].tx_date < txs[b].tx_date ? -1 : 1));
  for (const r of refunds) {
    const cand = (byCents.get(cents(txs[r])) || []).filter((e) => !used.has(e));
    let best = null, bestD = Infinity;
    for (const e of cand) {
      const d = dayN(txs[r].tx_date) - dayN(txs[e].tx_date);
      if (d < -3 || d > windowDays) continue;
      if (Math.abs(d) < bestD) { best = e; bestD = Math.abs(d); }
    }
    if (best == null) continue;
    used.add(best);
    out[best] = { ...txs[best], _net: true, _netWith: txs[r].concept };
    out[r] = { ...txs[r], _net: true, _netWith: txs[best].concept };
  }
  return out;
}
